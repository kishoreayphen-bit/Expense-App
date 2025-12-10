package com.expenseapp.expense;

import com.expenseapp.company.Company;
import com.expenseapp.company.CompanyMember;
import com.expenseapp.company.CompanyMemberRepository;
import com.expenseapp.company.CompanyRepository;
import com.expenseapp.notification.NotificationPublisher;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReimbursementService {
    
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final NotificationPublisher notificationPublisher;
    
    @Transactional
    public Expense requestReimbursement(String userEmail, Long expenseId) {
        log.info("[ReimbursementService] Requesting reimbursement - User: {}, ExpenseId: {}", userEmail, expenseId);
        
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Expense expense = expenseRepository.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Expense not found"));
        
        log.info("[ReimbursementService] Expense details - ID: {}, User: {}, CompanyId: {}, IsReimbursable: {}, CurrentStatus: {}", 
            expense.getId(), expense.getUser().getEmail(), expense.getCompanyId(), 
            expense.isReimbursable(), expense.getReimbursementStatus());
        
        // Verify ownership
        if (!expense.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Not authorized to request reimbursement for this expense");
        }
        
        // Verify expense is marked as reimbursable
        if (!expense.isReimbursable()) {
            throw new IllegalArgumentException("Expense is not marked as reimbursable");
        }
        
        // Check if reimbursement already requested
        if (expense.getReimbursementStatus() != null && !expense.getReimbursementStatus().isEmpty()) {
            throw new IllegalArgumentException("Reimbursement has already been requested for this expense. Current status: " + expense.getReimbursementStatus());
        }
        
        // Update reimbursement status
        expense.setReimbursementStatus("PENDING");
        expense.setReimbursementRequestedAt(Instant.now());
        expense = expenseRepository.save(expense);
        
        log.info("[ReimbursementService] Reimbursement request saved - ExpenseId: {}, Status: PENDING, CompanyId: {}", 
            expense.getId(), expense.getCompanyId());
        
        // Notify admin/manager if in company mode
        if (expense.getCompanyId() != null) {
            try {
                notifyAdminsOfReimbursementRequest(expense);
                log.info("[ReimbursementService] Notified admins for companyId: {}", expense.getCompanyId());
            } catch (Exception e) {
                // Log but don't fail the request if notification fails
                log.error("[ReimbursementService] Failed to send reimbursement notification: {}", e.getMessage());
            }
        } else {
            log.warn("[ReimbursementService] Expense has no companyId - skipping admin notification");
        }
        
        return expense;
    }
    
    @Transactional
    public Expense approveReimbursement(String approverEmail, Long expenseId, String notes) {
        User approver = userRepository.findByEmail(approverEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Expense expense = expenseRepository.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Expense not found"));
        
        // Verify approver has permission (ADMIN or MANAGER in company)
        if (expense.getCompanyId() != null) {
            verifyCanApproveReimbursement(approver, expense.getCompanyId(), expense);
        }
        
        // Update reimbursement status
        expense.setReimbursementStatus("APPROVED");
        expense.setReimbursementApprovedAt(Instant.now());
        expense.setReimbursementApprovedBy(approver);
        if (notes != null) {
            expense.setReimbursementNotes(notes);
        }
        expense = expenseRepository.save(expense);
        
        // Notify employee
        notificationPublisher.publish(
            expense.getUser().getId(),
            "REIMBURSEMENT_APPROVED",
            "Reimbursement Approved",
            String.format("Your reimbursement request for %s %.2f has been approved", 
                expense.getCurrency(), expense.getAmount()),
            String.format("{\"type\":\"reimbursement_approved\",\"expenseId\":%d}", expense.getId()),
            expense.getCompanyId()
        );
        
        return expense;
    }
    
    @Transactional
    public Expense rejectReimbursement(String approverEmail, Long expenseId, String reason) {
        User approver = userRepository.findByEmail(approverEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Expense expense = expenseRepository.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Expense not found"));
        
        // Verify approver has permission
        if (expense.getCompanyId() != null) {
            verifyCanApproveReimbursement(approver, expense.getCompanyId(), expense);
        }
        
        // Update reimbursement status
        expense.setReimbursementStatus("REJECTED");
        expense.setReimbursementApprovedAt(Instant.now());
        expense.setReimbursementApprovedBy(approver);
        if (reason != null) {
            expense.setReimbursementNotes(reason);
        }
        expense = expenseRepository.save(expense);
        
        // Notify employee
        notificationPublisher.publish(
            expense.getUser().getId(),
            "REIMBURSEMENT_REJECTED",
            "Reimbursement Rejected",
            String.format("Your reimbursement request for %s %.2f has been rejected", 
                expense.getCurrency(), expense.getAmount()),
            String.format("{\"type\":\"reimbursement_rejected\",\"expenseId\":%d,\"reason\":\"%s\"}", 
                expense.getId(), reason != null ? reason.replace("\"", "\\\"") : ""),
            expense.getCompanyId()
        );
        
        return expense;
    }
    
    @Transactional
    public Expense markAsPaid(String approverEmail, Long expenseId) {
        User approver = userRepository.findByEmail(approverEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Expense expense = expenseRepository.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Expense not found"));
        
        // Verify approver has permission
        if (expense.getCompanyId() != null) {
            verifyCanApproveReimbursement(approver, expense.getCompanyId(), expense);
        }
        
        // Verify it's approved
        if (!"APPROVED".equals(expense.getReimbursementStatus())) {
            throw new IllegalArgumentException("Can only mark approved reimbursements as paid");
        }
        
        // Update status
        expense.setReimbursementStatus("PAID");
        expense.setReimbursementPaidAt(Instant.now());
        expense = expenseRepository.save(expense);
        
        // Notify employee
        notificationPublisher.publish(
            expense.getUser().getId(),
            "REIMBURSEMENT_PAID",
            "Reimbursement Paid",
            String.format("Your reimbursement of %s %.2f has been paid", 
                expense.getCurrency(), expense.getAmount()),
            String.format("{\"type\":\"reimbursement_paid\",\"expenseId\":%d}", expense.getId()),
            expense.getCompanyId()
        );
        
        return expense;
    }
    
    @Transactional(readOnly = true)
    public List<Expense> listPendingReimbursements(String managerEmail, Long companyId) {
        log.info("[ReimbursementService] Listing pending reimbursements for manager: {}, companyId: {}", managerEmail, companyId);
        
        User manager = userRepository.findByEmail(managerEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Verify manager has permission
        verifyCanApproveReimbursement(manager, companyId);
        
        List<Expense> expenses = expenseRepository.findByCompanyIdAndReimbursementStatusOrderByReimbursementRequestedAtDesc(
            companyId, "PENDING");
        
        log.info("[ReimbursementService] Found {} pending reimbursement(s)", expenses.size());
        for (Expense exp : expenses) {
            log.info("  - Expense ID: {}, User: {}, Amount: {} {}, Status: {}, CompanyId: {}", 
                exp.getId(), exp.getUser().getEmail(), exp.getAmount(), exp.getCurrency(), 
                exp.getReimbursementStatus(), exp.getCompanyId());
        }
        
        return expenses;
    }
    
    @Transactional(readOnly = true)
    public List<Expense> listReimbursementHistory(String managerEmail, Long companyId) {
        User manager = userRepository.findByEmail(managerEmail)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Verify manager has permission
        verifyCanApproveReimbursement(manager, companyId);
        
        return expenseRepository.findByCompanyIdAndReimbursementStatusInOrderByReimbursementApprovedAtDesc(
            companyId, List.of("APPROVED", "REJECTED", "PAID"));
    }
    
    // Overload for listing reimbursements - just check if user has permission to view
    private void verifyCanApproveReimbursement(User user, Long companyId) {
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user)
            .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
        
        String role = member.getRole();
        if (!"ADMIN".equals(role) && !"MANAGER".equals(role) && !"OWNER".equals(role)) {
            throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can view reimbursements");
        }
    }
    
    // Check if user can approve a specific expense's reimbursement
    private void verifyCanApproveReimbursement(User approver, Long companyId, Expense expense) {
        Company company = companyRepository.findById(companyId)
            .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        CompanyMember approverMember = companyMemberRepository.findByCompanyAndUser(company, approver)
            .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
        
        String approverRole = approverMember.getRole();
        
        // OWNER and ADMIN can approve all reimbursements
        if ("OWNER".equals(approverRole) || "ADMIN".equals(approverRole)) {
            return;
        }
        
        // MANAGER can only approve EMPLOYEE reimbursements
        if ("MANAGER".equals(approverRole)) {
            // Get expense owner's role
            CompanyMember expenseOwnerMember = companyMemberRepository.findByCompanyAndUser(company, expense.getUser())
                .orElseThrow(() -> new IllegalArgumentException("Expense owner not found in company"));
            
            String ownerRole = expenseOwnerMember.getRole();
            
            if ("EMPLOYEE".equals(ownerRole)) {
                return; // Manager can approve employee expenses
            } else {
                throw new IllegalArgumentException("Managers can only approve employee reimbursements. This expense belongs to a " + ownerRole);
            }
        }
        
        // EMPLOYEE cannot approve any reimbursements
        throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can approve reimbursements");
    }
    
    private void notifyAdminsOfReimbursementRequest(Expense expense) {
        Company company = companyRepository.findById(expense.getCompanyId()).orElse(null);
        if (company == null) return;
        
        // Find all owners, admins and managers
        List<CompanyMember> adminMembers = companyMemberRepository.findAllByCompany(company).stream()
            .filter(m -> "OWNER".equals(m.getRole()) || "ADMIN".equals(m.getRole()) || "MANAGER".equals(m.getRole()))
            .toList();
        
        // Send notification to each
        for (CompanyMember admin : adminMembers) {
            notificationPublisher.publish(
                admin.getUser().getId(),
                "REIMBURSEMENT_REQUEST",
                "New Reimbursement Request",
                String.format("%s requested reimbursement for %s %.2f", 
                    expense.getUser().getEmail(), expense.getCurrency(), expense.getAmount()),
                String.format("{\"type\":\"reimbursement_request\",\"expenseId\":%d,\"userId\":%d}", 
                    expense.getId(), expense.getUser().getId()),
                expense.getCompanyId()
            );
        }
    }
}
