package com.expenseapp.group;

import com.expenseapp.budget.CompanyBudget;
import com.expenseapp.budget.CompanyBudgetRepository;
import com.expenseapp.company.Company;
import com.expenseapp.company.CompanyMember;
import com.expenseapp.company.CompanyMemberRepository;
import com.expenseapp.company.CompanyRepository;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.notification.NotificationPublisher;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeamBudgetService {
    
    private final TeamBudgetRepository teamBudgetRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanyBudgetRepository companyBudgetRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final NotificationPublisher notificationPublisher;
    
    /**
     * Set team budget (Admin/Manager only)
     */
    @Transactional
    public TeamBudget setTeamBudget(String userEmail, Long groupId, TeamBudget budget) {
        log.info("[TeamBudgetService] Setting team budget - User: {}, GroupId: {}, Amount: {}", 
                userEmail, groupId, budget.getAllocatedAmount());
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        
        // Verify user has permission
        verifyCanManageBudget(user, group);
        
        // Check if active budget already exists for this period
        boolean exists = teamBudgetRepository.existsByGroupIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
                groupId, budget.getPeriodStart(), budget.getPeriodEnd());
        
        if (exists) {
            throw new IllegalArgumentException(
                    "An active budget already exists for this period. Please deactivate it first.");
        }
        
        // Validate against company budget if company group
        if (group.getCompanyId() != null) {
            validateAgainstCompanyBudget(group.getCompanyId(), budget.getPeriodStart(), 
                    budget.getPeriodEnd(), budget.getAllocatedAmount());
        }
        
        // Set group and creator
        budget.setGroupId(groupId);
        budget.setCreatedBy(user.getId());
        budget.setCreatedAt(Instant.now());
        budget.setUpdatedAt(Instant.now());
        budget.setIsActive(true);
        
        // Calculate initial spent amount
        BigDecimal spent = calculateSpentAmount(groupId, budget.getPeriodStart(), budget.getPeriodEnd());
        budget.setSpentAmount(spent);
        
        // Also update the group's budget fields for quick access
        group.setBudgetAmount(budget.getAllocatedAmount());
        group.setBudgetPeriodStart(budget.getPeriodStart());
        group.setBudgetPeriodEnd(budget.getPeriodEnd());
        group.setBudgetCurrency(budget.getCurrency());
        groupRepository.save(group);
        
        TeamBudget saved = teamBudgetRepository.save(budget);
        log.info("[TeamBudgetService] Team budget created - ID: {}, Spent: {}/{}", 
                saved.getId(), saved.getSpentAmount(), saved.getAllocatedAmount());
        
        // Notify team lead if assigned
        if (group.getTeamLead() != null) {
            notificationPublisher.publish(
                    group.getTeamLead().getId(),
                    "TEAM_BUDGET_SET",
                    "Team Budget Assigned",
                    String.format("A budget of %s %s has been assigned to your team '%s'", 
                            budget.getCurrency(), budget.getAllocatedAmount(), group.getName()),
                    String.format("{\"type\":\"team_budget_set\",\"groupId\":%d,\"budgetId\":%d}", 
                            groupId, saved.getId()),
                    group.getCompanyId()
            );
        }
        
        return saved;
    }
    
    /**
     * Update team budget (Admin/Manager or Team Lead)
     */
    @Transactional
    public TeamBudget updateTeamBudget(String userEmail, Long budgetId, TeamBudget updates) {
        log.info("[TeamBudgetService] Updating team budget - User: {}, BudgetId: {}", 
                userEmail, budgetId);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        TeamBudget existing = teamBudgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        
        Group group = groupRepository.findById(existing.getGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        
        // Team lead can only update alert threshold, not amount
        boolean isTeamLead = group.getTeamLead() != null && 
                group.getTeamLead().getId().equals(user.getId());
        
        if (isTeamLead) {
            // Team lead can only update alert threshold
            if (updates.getAlertThresholdPercent() != null) {
                existing.setAlertThresholdPercent(updates.getAlertThresholdPercent());
            }
        } else {
            // Admin/Manager can update everything
            verifyCanManageBudget(user, group);
            
            if (updates.getAllocatedAmount() != null) {
                // Validate new amount against company budget
                if (group.getCompanyId() != null) {
                    validateAgainstCompanyBudget(group.getCompanyId(), existing.getPeriodStart(), 
                            existing.getPeriodEnd(), updates.getAllocatedAmount());
                }
                existing.setAllocatedAmount(updates.getAllocatedAmount());
                
                // Update group's budget amount too
                group.setBudgetAmount(updates.getAllocatedAmount());
                groupRepository.save(group);
            }
            
            if (updates.getAlertThresholdPercent() != null) {
                existing.setAlertThresholdPercent(updates.getAlertThresholdPercent());
            }
            
            if (updates.getIsActive() != null) {
                existing.setIsActive(updates.getIsActive());
            }
        }
        
        existing.setUpdatedAt(Instant.now());
        
        TeamBudget saved = teamBudgetRepository.save(existing);
        log.info("[TeamBudgetService] Team budget updated - ID: {}", saved.getId());
        
        return saved;
    }
    
    /**
     * Get current active budget for team
     */
    @Transactional(readOnly = true)
    public Optional<TeamBudget> getCurrentBudget(Long groupId) {
        return teamBudgetRepository.findActiveByGroupAndDate(groupId, LocalDate.now());
    }
    
    /**
     * List all budgets for team (Team Lead, Admin, Manager)
     */
    @Transactional(readOnly = true)
    public List<TeamBudget> listTeamBudgets(String userEmail, Long groupId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        
        // Verify user can view (Team Lead, Admin, or Manager)
        verifyCanViewBudget(user, group);
        
        return teamBudgetRepository.findByGroupId(groupId);
    }
    
    /**
     * Recalculate spent amount from expenses
     */
    @Transactional
    public void recalculateSpentAmount(Long budgetId) {
        TeamBudget budget = teamBudgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        
        BigDecimal spent = calculateSpentAmount(budget.getGroupId(), 
                budget.getPeriodStart(), budget.getPeriodEnd());
        
        budget.setSpentAmount(spent);
        budget.setUpdatedAt(Instant.now());
        
        teamBudgetRepository.save(budget);
        
        // Check if alert should be sent
        if (budget.isAlertThresholdReached()) {
            sendBudgetAlert(budget);
        }
    }
    
    /**
     * Calculate total spent amount for team in period
     */
    private BigDecimal calculateSpentAmount(Long groupId, LocalDate start, LocalDate end) {
        // Sum all expenses for this group in period
        List<Object[]> results = expenseRepository.findAll().stream()
                .filter(e -> e.getGroup() != null && e.getGroup().getId().equals(groupId))
                .filter(e -> !e.getOccurredOn().isBefore(start) && !e.getOccurredOn().isAfter(end))
                .map(e -> new Object[]{e.getAmount()})
                .toList();
        
        return results.stream()
                .map(r -> (BigDecimal) r[0])
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    /**
     * Validate team budget against company overall budget
     */
    private void validateAgainstCompanyBudget(Long companyId, LocalDate start, LocalDate end, 
                                              BigDecimal teamAmount) {
        // Get company budget for this period
        Optional<CompanyBudget> companyBudgetOpt = companyBudgetRepository
                .findActiveByCompanyAndDate(companyId, start);
        
        if (companyBudgetOpt.isEmpty()) {
            // No company budget set, allow team budget
            return;
        }
        
        CompanyBudget companyBudget = companyBudgetOpt.get();
        
        // Get sum of all other active team budgets in this period
        List<TeamBudget> otherTeamBudgets = teamBudgetRepository.findActiveByCompanyId(companyId).stream()
                .filter(tb -> !tb.getPeriodStart().isAfter(end) && !tb.getPeriodEnd().isBefore(start))
                .toList();
        
        BigDecimal otherTeamsTotal = otherTeamBudgets.stream()
                .map(TeamBudget::getAllocatedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalWithNew = otherTeamsTotal.add(teamAmount);
        
        if (totalWithNew.compareTo(companyBudget.getTotalAmount()) > 0) {
            throw new IllegalArgumentException(
                    String.format("Team budgets total (%s) would exceed company budget (%s). Remaining: %s",
                            totalWithNew, companyBudget.getTotalAmount(), 
                            companyBudget.getTotalAmount().subtract(otherTeamsTotal))
            );
        }
    }
    
    /**
     * Verify user can manage team budget (Admin or Manager)
     */
    private void verifyCanManageBudget(User user, Group group) {
        // Super admin can manage all
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return;
        }
        
        // For company groups, check company role
        if (group.getCompanyId() != null) {
            Company company = companyRepository.findById(group.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found"));
            
            CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user)
                    .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
            
            String role = member.getRole();
            if (!"ADMIN".equals(role) && !"MANAGER".equals(role) && !"OWNER".equals(role)) {
                throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can manage team budgets");
            }
        } else {
            // For personal groups, only owner can manage
            if (!group.getOwner().getId().equals(user.getId())) {
                throw new IllegalArgumentException("Only group owner can manage budget");
            }
        }
    }
    
    /**
     * Verify user can view team budget (Team Lead, Admin, or Manager)
     */
    private void verifyCanViewBudget(User user, Group group) {
        // Super admin can view all
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return;
        }
        
        // Team lead can view
        if (group.getTeamLead() != null && group.getTeamLead().getId().equals(user.getId())) {
            return;
        }
        
        // For company groups, Admin/Manager can view
        if (group.getCompanyId() != null) {
            Company company = companyRepository.findById(group.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found"));
            
            CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user)
                    .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
            
            String role = member.getRole();
            if ("ADMIN".equals(role) || "MANAGER".equals(role) || "OWNER".equals(role)) {
                return;
            }
        } else {
            // For personal groups, owner can view
            if (group.getOwner().getId().equals(user.getId())) {
                return;
            }
        }
        
        throw new IllegalArgumentException("Only team lead, OWNER, ADMIN or MANAGER can view team budgets");
    }
    
    /**
     * Send budget alert notification
     */
    private void sendBudgetAlert(TeamBudget budget) {
        Group group = groupRepository.findById(budget.getGroupId()).orElse(null);
        if (group == null) return;
        
        String alertType = budget.isExceeded() ? "EXCEEDED" : "WARNING";
        String title = budget.isExceeded() ? "Team Budget Exceeded!" : "Team Budget Alert";
        String message = String.format(
                "Team '%s' budget is at %d%% (%s %s of %s %s)",
                group.getName(),
                budget.getSpentPercentage(),
                budget.getCurrency(),
                budget.getSpentAmount(),
                budget.getCurrency(),
                budget.getAllocatedAmount()
        );
        
        // Notify team lead
        if (group.getTeamLead() != null) {
            notificationPublisher.publish(
                    group.getTeamLead().getId(),
                    "TEAM_BUDGET_" + alertType,
                    title,
                    message,
                    String.format("{\"type\":\"team_budget_alert\",\"groupId\":%d,\"budgetId\":%d,\"percentage\":%d}", 
                            group.getId(), budget.getId(), budget.getSpentPercentage()),
                    group.getCompanyId()
            );
        }
        
        // Also notify company admins/managers if company group
        if (group.getCompanyId() != null) {
            Company company = companyRepository.findById(group.getCompanyId()).orElse(null);
            if (company != null) {
                List<CompanyMember> admins = companyMemberRepository.findAllByCompany(company).stream()
                        .filter(m -> "OWNER".equals(m.getRole()) || "ADMIN".equals(m.getRole()) || "MANAGER".equals(m.getRole()))
                        .toList();
                
                for (CompanyMember admin : admins) {
                    notificationPublisher.publish(
                            admin.getUser().getId(),
                            "TEAM_BUDGET_" + alertType,
                            title,
                            message,
                            String.format("{\"type\":\"team_budget_alert\",\"groupId\":%d,\"budgetId\":%d,\"percentage\":%d}", 
                                    group.getId(), budget.getId(), budget.getSpentPercentage()),
                            group.getCompanyId()
                    );
                }
            }
        }
    }
}
