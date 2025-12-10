package com.expenseapp.company;

import com.expenseapp.company.dto.CompanyMemberView;
import com.expenseapp.user.User;
import com.expenseapp.user.Role;
import com.expenseapp.user.UserRepository;
import com.expenseapp.notification.NotificationPublisher;
import com.expenseapp.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CompanyMemberService {
    
    private static final Logger log = LoggerFactory.getLogger(CompanyMemberService.class);
    
    private final CompanyMemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notificationPublisher;
    private final EmailService emailService;
    
    public CompanyMemberService(CompanyMemberRepository memberRepository,
                               CompanyRepository companyRepository,
                               UserRepository userRepository,
                               NotificationPublisher notificationPublisher,
                               EmailService emailService) {
        this.memberRepository = memberRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.notificationPublisher = notificationPublisher;
        this.emailService = emailService;
    }
    
    @Transactional
    public CompanyMemberView inviteMember(String inviterEmail, Long companyId, String memberEmail, String role) {
        User inviter = userRepository.findByEmail(inviterEmail).orElseThrow(() -> 
            new IllegalArgumentException("Inviter not found"));
        Company company = companyRepository.findById(companyId).orElseThrow(() -> 
            new IllegalArgumentException("Company not found"));
        
        // Find or create user for the invitation
        User member = userRepository.findByEmail(memberEmail).orElseGet(() -> {
            // Create a placeholder user for the invitation
            User newUser = new User();
            newUser.setName(memberEmail.split("@")[0]); // Use email prefix as temporary name
            newUser.setEmail(memberEmail);
            newUser.setPassword("PENDING_INVITATION"); // Placeholder password
            newUser.setRole(Role.USER);
            return userRepository.save(newUser);
        });
        
        // Prevent inviting the same user (company inviting itself)
        if (inviter.getId().equals(member.getId())) {
            throw new IllegalArgumentException("You cannot invite yourself");
        }
        
        // Check if inviter has permission (must be OWNER, ADMIN, SUPER_ADMIN, or system ADMIN)
        // SUPER_ADMIN and ADMIN can invite to any company
        if (inviter.getRole() != Role.SUPER_ADMIN && inviter.getRole() != Role.ADMIN) {
            CompanyMember inviterMembership = memberRepository.findByCompanyAndUser(company, inviter)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this company"));
            
            if (!inviterMembership.getRole().equals("OWNER") && !inviterMembership.getRole().equals("ADMIN")) {
                throw new IllegalArgumentException("Only OWNER or ADMIN can invite members");
            }
        }
        
        // Check if user is already a member
        if (memberRepository.existsByCompanyAndUser(company, member)) {
            throw new IllegalArgumentException("User is already a member of this company");
        }
        
        // Create invitation
        CompanyMember newMember = new CompanyMember();
        newMember.setCompany(company);
        newMember.setUser(member);
        newMember.setRole(role);
        newMember.setStatus("INVITED");
        newMember.setInvitedBy(inviter);
        newMember.setInvitedAt(Instant.now());
        newMember = memberRepository.save(newMember);
        
        // Send notification to invited user
        String notificationTitle = "Company Invitation";
        String notificationBody = String.format("You've been invited to join %s as %s", 
            company.getCompanyName(), role);
        String notificationData = String.format("{\"type\":\"company_invitation\",\"companyId\":%d,\"companyName\":\"%s\",\"role\":\"%s\"}", 
            companyId, company.getCompanyName(), role);
        
        // Send notification to invited user (personal context, no companyId)
        notificationPublisher.publish(
            member.getId(),
            "COMPANY_INVITATION",
            notificationTitle,
            notificationBody,
            notificationData,
            null  // Personal notification, not company-scoped
        );
        
        // Send email invitation
        log.info("📧 Attempting to send invitation email to: {}", memberEmail);
        try {
            emailService.sendCompanyInvitation(
                memberEmail,
                company.getCompanyName(),
                inviter.getEmail(),
                role,
                newMember.getId()
            );
            log.info("✅ Successfully sent invitation email to: {}", memberEmail);
        } catch (Exception e) {
            // Log but don't fail the invitation if email fails
            log.error("❌ Failed to send invitation email to {}: {}", memberEmail, e.getMessage(), e);
        }
        
        return toView(newMember);
    }
    
    @Transactional
    public CompanyMemberView acceptInvitation(String userEmail, Long companyId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        Company company = companyRepository.findById(companyId).orElseThrow(() -> 
            new IllegalArgumentException("Company not found"));
        
        CompanyMember member = memberRepository.findByCompanyAndUser(company, user)
            .orElseThrow(() -> new IllegalArgumentException("No invitation found"));
        
        if (!member.getStatus().equals("INVITED")) {
            throw new IllegalArgumentException("No pending invitation");
        }
        
        member.setStatus("ACTIVE");
        member.setJoinedAt(Instant.now());
        member.setUpdatedAt(Instant.now());
        member = memberRepository.save(member);
        
        // Notify admin that invitation was accepted
        User inviter = member.getInvitedBy();
        if (inviter != null) {
            String notificationTitle = "Invitation Accepted";
            String notificationBody = String.format("%s accepted your invitation to join %s", 
                user.getEmail(), company.getCompanyName());
            String notificationData = String.format("{\"type\":\"invitation_accepted\",\"companyId\":%d,\"companyName\":\"%s\",\"userEmail\":\"%s\"}", 
                companyId, company.getCompanyName(), user.getEmail());
            
            // Send notification to inviter in company context
            notificationPublisher.publish(
                inviter.getId(),
                "INVITATION_ACCEPTED",
                notificationTitle,
                notificationBody,
                notificationData,
                companyId  // Company-scoped notification
            );
            
            // Send email notification
            try {
                emailService.sendInvitationAcceptedNotification(
                    inviter.getEmail(),
                    user.getEmail(),
                    company.getCompanyName()
                );
                log.info("✅ Sent acceptance notification email to: {}", inviter.getEmail());
            } catch (Exception e) {
                log.error("❌ Failed to send acceptance email: {}", e.getMessage(), e);
            }
        }
        
        return toView(member);
    }
    
    @Transactional
    public void declineInvitation(String userEmail, Long companyId, String reason) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        Company company = companyRepository.findById(companyId).orElseThrow(() -> 
            new IllegalArgumentException("Company not found"));
        
        CompanyMember member = memberRepository.findByCompanyAndUser(company, user)
            .orElseThrow(() -> new IllegalArgumentException("No invitation found"));
        
        if (!member.getStatus().equals("INVITED")) {
            throw new IllegalArgumentException("No pending invitation");
        }
        
        // Get inviter before deleting
        User inviter = member.getInvitedBy();
        
        // Delete the invitation
        memberRepository.delete(member);
        
        // Notify admin that invitation was declined
        if (inviter != null) {
            String notificationTitle = "Invitation Declined";
            String notificationBody = String.format("%s declined your invitation to join %s", 
                user.getEmail(), company.getCompanyName());
            
            // Include reason if provided
            if (reason != null && !reason.trim().isEmpty()) {
                notificationBody += ". Reason: " + reason;
            }
            
            String notificationData = String.format("{\"type\":\"invitation_declined\",\"companyId\":%d,\"companyName\":\"%s\",\"userEmail\":\"%s\",\"reason\":\"%s\",\"canReply\":true}", 
                companyId, company.getCompanyName(), user.getEmail(), reason != null ? reason.replace("\"", "\\\"") : "");
            
            // Send notification to inviter in company context
            notificationPublisher.publish(
                inviter.getId(),
                "INVITATION_DECLINED",
                notificationTitle,
                notificationBody,
                notificationData,
                companyId  // Company-scoped notification
            );
            
            // Send email notification
            try {
                emailService.sendInvitationDeclinedNotification(
                    inviter.getEmail(),
                    user.getEmail(),
                    company.getCompanyName(),
                    reason
                );
                log.info("✅ Sent declined notification email to: {}", inviter.getEmail());
            } catch (Exception e) {
                log.error("❌ Failed to send declined email: {}", e.getMessage(), e);
            }
        }
    }
    
    @Transactional
    public void removeMember(String removerEmail, Long companyId, Long memberId) {
        User remover = userRepository.findByEmail(removerEmail).orElseThrow(() -> 
            new IllegalArgumentException("Remover not found"));
        Company company = companyRepository.findById(companyId).orElseThrow(() -> 
            new IllegalArgumentException("Company not found"));
        
        // Check if remover has permission
        // SUPER_ADMIN and ADMIN can remove members from any company
        if (remover.getRole() != Role.SUPER_ADMIN && remover.getRole() != Role.ADMIN) {
            CompanyMember removerMembership = memberRepository.findByCompanyAndUser(company, remover)
                .orElseThrow(() -> new IllegalArgumentException("You are not a member of this company"));
            
            if (!removerMembership.getRole().equals("OWNER") && !removerMembership.getRole().equals("ADMIN")) {
                throw new IllegalArgumentException("Only OWNER or ADMIN can remove members");
            }
        }
        
        CompanyMember memberToRemove = memberRepository.findById(memberId)
            .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        
        // Cannot remove OWNER
        if (memberToRemove.getRole().equals("OWNER")) {
            throw new IllegalArgumentException("Cannot remove company owner");
        }
        
        memberRepository.delete(memberToRemove);
    }
    
    @Transactional(readOnly = true)
    public List<CompanyMemberView> listMembers(String userEmail, Long companyId) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        Company company = companyRepository.findById(companyId).orElseThrow(() -> 
            new IllegalArgumentException("Company not found"));
        
        // SUPER_ADMIN and ADMIN can view members of any company
        if (user.getRole() != Role.SUPER_ADMIN && user.getRole() != Role.ADMIN) {
            // Verify user is a member
            if (!memberRepository.existsByCompanyAndUser(company, user)) {
                throw new IllegalArgumentException("You are not a member of this company");
            }
        }
        
        return memberRepository.findAllByCompany(company).stream()
            .map(this::toView)
            .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<CompanyMemberView> listPendingInvitations(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        
        return memberRepository.findAllByUserAndStatus(user, "INVITED").stream()
            .map(this::toView)
            .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<Company> listUserCompanies(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        
        // SUPER_ADMIN and ADMIN can see all companies
        if (user.getRole() == Role.SUPER_ADMIN || user.getRole() == Role.ADMIN) {
            return companyRepository.findAll();
        }
        
        return memberRepository.findActiveByUser(user).stream()
            .map(CompanyMember::getCompany)
            .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<com.expenseapp.company.dto.CompanyView> listUserCompaniesView(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> 
            new IllegalArgumentException("User not found"));
        
        // SUPER_ADMIN and ADMIN can see all companies
        if (user.getRole() == Role.SUPER_ADMIN || user.getRole() == Role.ADMIN) {
            String adminRole = user.getRole().name(); // Get the actual role as string
            return companyRepository.findAll().stream()
                .map(company -> new com.expenseapp.company.dto.CompanyView(
                    company.getId(),
                    company.getCompanyName(),
                    adminRole, // Use their admin role as string
                    "ACTIVE",
                    Instant.now()
                ))
                .collect(Collectors.toList());
        }
        
        return memberRepository.findActiveByUser(user).stream()
            .map(member -> new com.expenseapp.company.dto.CompanyView(
                member.getCompany().getId(),
                member.getCompany().getCompanyName(),
                member.getRole(),
                member.getStatus(),
                member.getJoinedAt()
            ))
            .collect(Collectors.toList());
    }
    
    private CompanyMemberView toView(CompanyMember member) {
        User user = member.getUser();
        String userName = user.getEmail(); // Use email as name for now
        return new CompanyMemberView(
            member.getId(),
            member.getCompany().getId(),
            member.getCompany().getCompanyName(),
            user.getId(),
            user.getEmail(),
            userName,
            member.getRole(),
            member.getStatus(),
            member.getJoinedAt(),
            member.getInvitedAt()
        );
    }
}
