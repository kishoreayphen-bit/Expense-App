package com.expenseapp.group;

import com.expenseapp.group.dto.GroupCreateRequest;
import com.expenseapp.group.dto.GroupView;
import com.expenseapp.group.dto.MemberChangeRequest;
import com.expenseapp.group.dto.GroupLedgerView;
import com.expenseapp.group.dto.GroupDefaultsDto;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import com.expenseapp.notification.NotificationPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final GroupDefaultsRepository groupDefaultsRepository;
    private final NotificationPublisher notificationPublisher;
    private final com.expenseapp.company.CompanyMemberRepository companyMemberRepository;
    private final com.expenseapp.company.CompanyRepository companyRepository;

    public GroupService(GroupRepository groupRepository,
                        GroupMemberRepository groupMemberRepository,
                        UserRepository userRepository,
                        ExpenseRepository expenseRepository,
                        GroupDefaultsRepository groupDefaultsRepository,
                        NotificationPublisher notificationPublisher,
                        com.expenseapp.company.CompanyMemberRepository companyMemberRepository,
                        com.expenseapp.company.CompanyRepository companyRepository) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.groupDefaultsRepository = groupDefaultsRepository;
        this.notificationPublisher = notificationPublisher;
        this.companyMemberRepository = companyMemberRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public GroupView create(String ownerEmail, GroupCreateRequest req, Long companyId) {
        User owner = userRepository.findByEmail(ownerEmail).orElseThrow();
        
        // Permission check: Only ADMIN, MANAGER, and SUPER_ADMIN can create teams
        if (companyId != null && companyId > 0) {
            // Company team - check role
            if (owner.getRole() != com.expenseapp.user.Role.SUPER_ADMIN) {
                // Check company membership and role
                com.expenseapp.company.Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new IllegalArgumentException("Company not found"));
                java.util.Optional<com.expenseapp.company.CompanyMember> memberOpt = 
                    companyMemberRepository.findByCompanyAndUser(company, owner);
                
                if (!memberOpt.isPresent()) {
                    throw new IllegalArgumentException("You are not a member of this company");
                }
                
                String companyRole = memberOpt.get().getRole();
                if (!"ADMIN".equals(companyRole) && !"MANAGER".equals(companyRole)) {
                    throw new IllegalArgumentException("Only ADMIN and MANAGER can create teams. Your role: " + companyRole);
                }
            }
        }
        // Personal teams - anyone can create
        
        Group g = new Group();
        g.setName(req.getName());
        if (req.getType() != null && !req.getType().isBlank()) g.setType(req.getType());
        g.setOwner(owner);
        g.setCompanyId(companyId);
        g = groupRepository.save(g);
        // owner membership
        GroupMember m = new GroupMember();
        m.setGroup(g);
        m.setUser(owner);
        m.setRole("OWNER");
        groupMemberRepository.save(m);
        return toView(g);
    }

    @Transactional(readOnly = true)
    public List<GroupView> myGroups(String email, Long companyId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        // owner groups + member-of groups, filtered by company
        List<Group> owned = groupRepository.findAllByOwner(user);
        List<Group> memberOf = groupMemberRepository.findAllByUser(user).stream().map(GroupMember::getGroup).toList();
        
        return java.util.stream.Stream.concat(owned.stream(), memberOf.stream())
                .distinct()
                .filter(group -> {
                    // Filter by company scope
                    if (companyId == null) {
                        // Personal mode: only groups with no company_id
                        return group.getCompanyId() == null;
                    } else {
                        // Company mode: only groups for this company
                        return companyId.equals(group.getCompanyId());
                    }
                })
                .map(this::toView)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GroupView get(String email, Long groupId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureMember(user, g);
        return toView(g);
    }

    @Transactional
    public GroupView addMember(String email, Long groupId, MemberChangeRequest req) {
        User actor = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureOwnerOrAdmin(actor, g);
        User target = userRepository.findById(req.getUserId()).orElseThrow();
        groupMemberRepository.findByGroupAndUser(g, target).ifPresent(existing -> { throw new IllegalArgumentException("Already a member"); });
        GroupMember m = new GroupMember();
        m.setGroup(g);
        m.setUser(target);
        m.setRole(req.getRole() != null && !req.getRole().isBlank() ? req.getRole().toUpperCase() : "MEMBER");
        groupMemberRepository.save(m);
        
        // Notify the added member
        String dataJson = String.format("{\"groupId\":%d,\"groupName\":\"%s\"}", g.getId(), g.getName().replace("\"", "\\\""));
        notificationPublisher.publish(
            target.getId(),
            "GROUP_ADDED",
            "Added to Group",
            String.format("You were added to the group '%s' by %s", g.getName(), actor.getName()),
            dataJson
        );
        
        return toView(g);
    }

    @Transactional
    public void deleteGroup(String email, Long groupId) {
        User actor = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow(() -> 
            new IllegalArgumentException("Group not found"));
        
        // SUPER_ADMIN and ADMIN can delete any group
        if (actor.getRole() != com.expenseapp.user.Role.SUPER_ADMIN && 
            actor.getRole() != com.expenseapp.user.Role.ADMIN) {
            // Only owner can delete the group
            if (!g.getOwner().getId().equals(actor.getId())) {
                throw new IllegalArgumentException("Only the group owner can delete the group");
            }
        }
        
        // Delete all group members
        List<GroupMember> members = groupMemberRepository.findAllByGroup(g);
        groupMemberRepository.deleteAll(members);
        
        // Delete group defaults if any
        groupDefaultsRepository.findByGroup(g).ifPresent(groupDefaultsRepository::delete);
        
        // Unlink all expenses from this group
        List<com.expenseapp.expense.Expense> expenses = expenseRepository.findAll().stream()
            .filter(e -> e.getGroup() != null && e.getGroup().getId().equals(groupId))
            .collect(Collectors.toList());
        
        for (com.expenseapp.expense.Expense expense : expenses) {
            expense.setGroup(null);
            expenseRepository.save(expense);
        }
        
        // Delete the group
        groupRepository.delete(g);
        
        // TODO: Notify members about group deletion
    }

    @Transactional
    public GroupView removeMember(String email, Long groupId, Long userId) {
        User actor = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureOwnerOrAdmin(actor, g);
        User target = userRepository.findById(userId).orElseThrow();
        GroupMember m = groupMemberRepository.findByGroupAndUser(g, target).orElseThrow(() -> new IllegalArgumentException("Not a member"));
        // Only OWNER can remove OWNER or ADMIN; ADMINs can remove only MEMBERs
        if (m.getRole().equalsIgnoreCase("OWNER")) {
            throw new IllegalArgumentException("Cannot remove owner");
        }
        boolean actorIsOwner = g.getOwner().getId().equals(actor.getId());
        if (!actorIsOwner && m.getRole().equalsIgnoreCase("ADMIN")) {
            throw new IllegalArgumentException("Admins cannot remove other admins");
        }
        groupMemberRepository.delete(m);
        return toView(g);
    }

    @Transactional
    public GroupView archive(String email, Long groupId) {
        User actor = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureOwner(actor, g);
        g.setArchived(true);
        return toView(g);
    }

    @Transactional
    public GroupView updateMemberRole(String email, Long groupId, MemberChangeRequest req) {
        User actor = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureOwnerOrAdmin(actor, g);
        User target = userRepository.findById(req.getUserId()).orElseThrow();
        GroupMember m = groupMemberRepository.findByGroupAndUser(g, target).orElseThrow(() -> new IllegalArgumentException("Not a member"));
        String newRole = req.getRole() != null ? req.getRole().trim().toUpperCase() : null;

        // Protect OWNER role changes via this endpoint
        if (m.getRole().equalsIgnoreCase("OWNER")) {
            throw new IllegalArgumentException("Cannot modify owner role via this endpoint");
        }

        boolean actorIsOwner = g.getOwner().getId().equals(actor.getId());
        boolean actorIsAdmin = isAdmin(actor, g);

        if (newRole == null || newRole.isBlank()) {
            return toView(g);
        }

        // Admins can only promote MEMBER -> ADMIN; cannot demote ADMINs or change OWNER
        if (actorIsAdmin && !actorIsOwner) {
            if (newRole.equals("ADMIN") && m.getRole().equalsIgnoreCase("MEMBER")) {
                m.setRole("ADMIN");
            } else {
                throw new IllegalArgumentException("Admins can only promote MEMBER to ADMIN");
            }
        } else {
            // Owner can set role among MEMBER/ADMIN (but not OWNER here)
            if (newRole.equals("MEMBER") || newRole.equals("ADMIN")) {
                m.setRole(newRole);
            } else {
                throw new IllegalArgumentException("Unsupported role change");
            }
        }
        return toView(g);
    }

    private void ensureMember(User user, Group g) {
        if (g.getOwner().getId().equals(user.getId())) return;
        boolean isMember = groupMemberRepository.findByGroupAndUser(g, user).isPresent();
        if (!isMember) throw new IllegalArgumentException("Not authorized");
    }

    private void ensureOwner(User user, Group g) {
        if (!g.getOwner().getId().equals(user.getId())) throw new IllegalArgumentException("Only owner can perform this action");
    }

    private void ensureOwnerOrAdmin(User user, Group g) {
        if (g.getOwner().getId().equals(user.getId())) return;
        if (isAdmin(user, g)) return;
        throw new IllegalArgumentException("Only owner or admin can perform this action");
    }

    private boolean isAdmin(User user, Group g) {
        return groupMemberRepository.findByGroupAndUser(g, user)
                .map(m -> "ADMIN".equalsIgnoreCase(m.getRole()))
                .orElse(false);
    }

    private GroupView toView(Group g) {
        List<GroupMember> members = groupMemberRepository.findAllByGroup(g);
        List<GroupView.MemberView> mv = members.stream()
                .map(m -> new GroupView.MemberView(
                    m.getUser().getId(), 
                    m.getRole(),
                    m.getUser().getName() != null ? m.getUser().getName() : m.getUser().getEmail(),
                    m.getUser().getEmail()
                ))
                .collect(Collectors.toList());
        // Ensure owner appears in member list
        boolean hasOwner = mv.stream().anyMatch(x -> x.getUserId().equals(g.getOwner().getId()) && x.getRole().equalsIgnoreCase("OWNER"));
        if (!hasOwner) {
            mv.add(new GroupView.MemberView(
                g.getOwner().getId(), 
                "OWNER",
                g.getOwner().getName() != null ? g.getOwner().getName() : g.getOwner().getEmail(),
                g.getOwner().getEmail()
            ));
        }
        return new GroupView(g.getId(), g.getName(), g.getType(), g.isArchived(), g.getCreatedAt(), mv);
    }

    @Transactional(readOnly = true)
    public GroupLedgerView getLedger(String email, Long groupId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureMember(user, g);
        var credits = expenseRepository.groupCredits(groupId);
        var debits = expenseRepository.groupDebits(groupId);
        java.util.Map<Long, java.math.BigDecimal> cMap = new java.util.HashMap<>();
        java.util.Map<Long, java.math.BigDecimal> dMap = new java.util.HashMap<>();
        for (Object[] row : credits) {
            cMap.put(((Number) row[0]).longValue(), (java.math.BigDecimal) row[1]);
        }
        for (Object[] row : debits) {
            dMap.put(((Number) row[0]).longValue(), (java.math.BigDecimal) row[1]);
        }
        java.util.Set<Long> userIds = new java.util.HashSet<>();
        userIds.addAll(cMap.keySet());
        userIds.addAll(dMap.keySet());
        var balances = new java.util.ArrayList<GroupLedgerView.MemberBalance>();
        for (Long uid : userIds) {
            var credit = cMap.getOrDefault(uid, java.math.BigDecimal.ZERO);
            var debit = dMap.getOrDefault(uid, java.math.BigDecimal.ZERO);
            var net = credit.subtract(debit);
            balances.add(new GroupLedgerView.MemberBalance(uid, credit, debit, net));
        }
        return new GroupLedgerView(groupId, balances);
    }

    @Transactional(readOnly = true)
    public GroupDefaultsDto getDefaults(String email, Long groupId) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureMember(user, g);
        GroupDefaults def = groupDefaultsRepository.findByGroup(g).orElse(null);
        if (def == null) return new GroupDefaultsDto(null, null, null);
        return new GroupDefaultsDto(def.getDefaultType(), def.getRatiosJson(), def.getPercentagesJson());
    }

    @Transactional
    public GroupDefaultsDto updateDefaults(String email, Long groupId, GroupDefaultsDto dto) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Group g = groupRepository.findById(groupId).orElseThrow();
        ensureOwner(user, g);
        GroupDefaults def = groupDefaultsRepository.findByGroup(g).orElseGet(() -> { GroupDefaults d = new GroupDefaults(); d.setGroup(g); return d; });
        def.setDefaultType(dto.getDefaultType());
        def.setRatiosJson(dto.getRatiosJson());
        def.setPercentagesJson(dto.getPercentagesJson());
        def = groupDefaultsRepository.save(def);
        return new GroupDefaultsDto(def.getDefaultType(), def.getRatiosJson(), def.getPercentagesJson());
    }
    
    /**
     * Assign team lead to a group (Admin/Manager only)
     */
    @Transactional
    public Group assignTeamLead(String assignerEmail, Long groupId, Long teamLeadUserId) {
        User assigner = userRepository.findByEmail(assignerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        
        User teamLead = userRepository.findById(teamLeadUserId)
                .orElseThrow(() -> new IllegalArgumentException("Team lead user not found"));
        
        // Verify assigner has permission (Admin or Manager in company)
        if (group.getCompanyId() != null) {
            verifyCanManageTeam(assigner, group.getCompanyId());
        } else {
            // For personal groups, only owner can assign
            if (!group.getOwner().getId().equals(assigner.getId())) {
                throw new IllegalArgumentException("Only group owner can assign team lead for personal groups");
            }
        }
        
        // Verify team lead is a member of the group
        boolean isMember = groupMemberRepository.findByGroupAndUser(group, teamLead).isPresent();
        if (!isMember) {
            throw new IllegalArgumentException("Team lead must be a member of the group");
        }
        
        group.setTeamLead(teamLead);
        Group saved = groupRepository.save(group);
        
        // Notify the team lead
        notificationPublisher.publish(
                teamLead.getId(),
                "TEAM_LEAD_ASSIGNED",
                "Team Lead Assignment",
                String.format("You have been assigned as team lead for '%s'", group.getName()),
                String.format("{\"type\":\"team_lead_assigned\",\"groupId\":%d}", group.getId()),
                group.getCompanyId()
        );
        
        return saved;
    }
    
    /**
     * Remove team lead from a group
     */
    @Transactional
    public Group removeTeamLead(String assignerEmail, Long groupId) {
        User assigner = userRepository.findByEmail(assignerEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        
        // Verify permission
        if (group.getCompanyId() != null) {
            verifyCanManageTeam(assigner, group.getCompanyId());
        } else {
            if (!group.getOwner().getId().equals(assigner.getId())) {
                throw new IllegalArgumentException("Only group owner can remove team lead");
            }
        }
        
        group.setTeamLead(null);
        return groupRepository.save(group);
    }
    
    /**
     * Check if user is team lead of a group
     */
    public boolean isTeamLead(Long userId, Long groupId) {
        Group group = groupRepository.findById(groupId).orElse(null);
        if (group == null || group.getTeamLead() == null) {
            return false;
        }
        return group.getTeamLead().getId().equals(userId);
    }
    
    /**
     * Get all groups where user is team lead
     */
    public List<Group> getGroupsLedBy(Long userId) {
        return groupRepository.findAll().stream()
                .filter(g -> g.getTeamLead() != null && g.getTeamLead().getId().equals(userId))
                .collect(Collectors.toList());
    }
    
    /**
     * Verify user can manage teams (Admin or Manager in company)
     */
    private void verifyCanManageTeam(User user, Long companyId) {
        // Super admin can manage all
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return;
        }
        
        com.expenseapp.company.Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        com.expenseapp.company.CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user)
                .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
        
        String role = member.getRole();
        if (!"ADMIN".equals(role) && !"MANAGER".equals(role) && !"OWNER".equals(role)) {
            throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can manage teams");
        }
    }
}
