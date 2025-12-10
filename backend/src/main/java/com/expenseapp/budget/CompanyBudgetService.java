package com.expenseapp.budget;

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
public class CompanyBudgetService {
    
    private final CompanyBudgetRepository companyBudgetRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final NotificationPublisher notificationPublisher;
    
    /**
     * Create overall company budget
     */
    @Transactional
    public CompanyBudget createCompanyBudget(String userEmail, Long companyId, CompanyBudget budget) {
        log.info("[CompanyBudgetService] Creating company budget - User: {}, CompanyId: {}, Amount: {}", 
                userEmail, companyId, budget.getTotalAmount());
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        // Verify user is ADMIN or MANAGER
        verifyCanManageBudget(user, company);
        
        // Check if active budget already exists for this period
        boolean exists = companyBudgetRepository.existsByCompanyIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
                companyId, budget.getPeriodStart(), budget.getPeriodEnd());
        
        if (exists) {
            throw new IllegalArgumentException(
                    "An active budget already exists for this period. Please deactivate it first.");
        }
        
        // Set company and creator
        budget.setCompanyId(companyId);
        budget.setCreatedBy(user.getId());
        budget.setCreatedAt(Instant.now());
        budget.setUpdatedAt(Instant.now());
        budget.setIsActive(true);
        
        // Calculate initial spent amount
        BigDecimal spent = calculateSpentAmount(companyId, budget.getPeriodStart(), budget.getPeriodEnd());
        budget.setSpentAmount(spent);
        
        // Validate that existing category budgets don't exceed this overall budget
        validateCategoryBudgetsWithinOverall(companyId, budget.getPeriodStart(), budget.getPeriodEnd(), 
                budget.getTotalAmount());
        
        CompanyBudget saved = companyBudgetRepository.save(budget);
        log.info("[CompanyBudgetService] Company budget created - ID: {}, Spent: {}/{}", 
                saved.getId(), saved.getSpentAmount(), saved.getTotalAmount());
        
        return saved;
    }
    
    /**
     * Update company budget
     */
    @Transactional
    public CompanyBudget updateCompanyBudget(String userEmail, Long budgetId, CompanyBudget updates) {
        log.info("[CompanyBudgetService] Updating company budget - User: {}, BudgetId: {}", 
                userEmail, budgetId);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        CompanyBudget existing = companyBudgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        
        Company company = companyRepository.findById(existing.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        verifyCanManageBudget(user, company);
        
        // Update allowed fields
        if (updates.getTotalAmount() != null) {
            // Validate new amount against category budgets
            validateCategoryBudgetsWithinOverall(existing.getCompanyId(), 
                    existing.getPeriodStart(), existing.getPeriodEnd(), updates.getTotalAmount());
            existing.setTotalAmount(updates.getTotalAmount());
        }
        
        if (updates.getAlertThresholdPercent() != null) {
            existing.setAlertThresholdPercent(updates.getAlertThresholdPercent());
        }
        
        if (updates.getIsActive() != null) {
            existing.setIsActive(updates.getIsActive());
        }
        
        existing.setUpdatedAt(Instant.now());
        
        CompanyBudget saved = companyBudgetRepository.save(existing);
        log.info("[CompanyBudgetService] Company budget updated - ID: {}", saved.getId());
        
        return saved;
    }
    
    /**
     * Get current active budget for company
     */
    @Transactional(readOnly = true)
    public Optional<CompanyBudget> getCurrentBudget(Long companyId) {
        return companyBudgetRepository.findActiveByCompanyAndDate(companyId, LocalDate.now());
    }
    
    /**
     * Get budget for specific period
     */
    @Transactional(readOnly = true)
    public Optional<CompanyBudget> getBudgetForPeriod(Long companyId, LocalDate periodStart, LocalDate periodEnd) {
        return companyBudgetRepository.findByCompanyIdAndPeriodStartAndPeriodEndAndIsActiveTrue(
                companyId, periodStart, periodEnd);
    }
    
    /**
     * List all budgets for company
     */
    @Transactional(readOnly = true)
    public List<CompanyBudget> listCompanyBudgets(String userEmail, Long companyId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        verifyCanViewBudget(user, company);
        
        return companyBudgetRepository.findByCompanyId(companyId);
    }
    
    /**
     * Extend budget amount (when category budgets exceed overall)
     */
    @Transactional
    public CompanyBudget extendBudget(String userEmail, Long budgetId, BigDecimal additionalAmount) {
        log.info("[CompanyBudgetService] Extending budget - User: {}, BudgetId: {}, Additional: {}", 
                userEmail, budgetId, additionalAmount);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        CompanyBudget budget = companyBudgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        
        Company company = companyRepository.findById(budget.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        verifyCanManageBudget(user, company);
        
        BigDecimal newTotal = budget.getTotalAmount().add(additionalAmount);
        budget.setTotalAmount(newTotal);
        budget.setUpdatedAt(Instant.now());
        
        CompanyBudget saved = companyBudgetRepository.save(budget);
        log.info("[CompanyBudgetService] Budget extended - ID: {}, New Total: {}", 
                saved.getId(), saved.getTotalAmount());
        
        return saved;
    }
    
    /**
     * Recalculate spent amount from expenses
     */
    @Transactional
    public void recalculateSpentAmount(Long budgetId) {
        CompanyBudget budget = companyBudgetRepository.findById(budgetId)
                .orElseThrow(() -> new IllegalArgumentException("Budget not found"));
        
        BigDecimal spent = calculateSpentAmount(budget.getCompanyId(), 
                budget.getPeriodStart(), budget.getPeriodEnd());
        
        budget.setSpentAmount(spent);
        budget.setUpdatedAt(Instant.now());
        
        companyBudgetRepository.save(budget);
        
        // Check if alert should be sent
        if (budget.isAlertThresholdReached()) {
            sendBudgetAlert(budget);
        }
    }
    
    /**
     * Calculate total spent amount for company in period
     */
    private BigDecimal calculateSpentAmount(Long companyId, LocalDate start, LocalDate end) {
        // Sum all expenses for company in period
        List<Object[]> results = expenseRepository.findAll().stream()
                .filter(e -> e.getCompanyId() != null && e.getCompanyId().equals(companyId))
                .filter(e -> !e.getOccurredOn().isBefore(start) && !e.getOccurredOn().isAfter(end))
                .map(e -> new Object[]{e.getAmount()})
                .toList();
        
        return results.stream()
                .map(r -> (BigDecimal) r[0])
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    
    /**
     * Validate that sum of category budgets doesn't exceed overall budget
     */
    private void validateCategoryBudgetsWithinOverall(Long companyId, LocalDate start, LocalDate end, 
                                                      BigDecimal overallAmount) {
        // Get all category budgets for this company and period
        // Period format is YYYY-MM, so we need to match based on year-month
        String startPeriod = start.getYear() + "-" + String.format("%02d", start.getMonthValue());
        String endPeriod = end.getYear() + "-" + String.format("%02d", end.getMonthValue());
        
        List<Budget> categoryBudgets = budgetRepository.findAll().stream()
                .filter(b -> b.getCompanyId() != null && b.getCompanyId().equals(companyId))
                .filter(b -> {
                    String period = b.getPeriod();
                    // Check if period is within range
                    return period.compareTo(startPeriod) >= 0 && period.compareTo(endPeriod) <= 0;
                })
                .toList();
        
        BigDecimal categoryTotal = categoryBudgets.stream()
                .map(Budget::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (categoryTotal.compareTo(overallAmount) > 0) {
            throw new BudgetExceededException(
                    "Sum of category budgets (" + categoryTotal + ") exceeds overall budget (" + overallAmount + ")",
                    overallAmount,
                    categoryTotal
            );
        }
    }
    
    /**
     * Verify user can manage budgets (ADMIN or MANAGER)
     */
    private void verifyCanManageBudget(User user, Company company) {
        // Super admin can manage all
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return;
        }
        
        CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user)
                .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
        
        String role = member.getRole();
        if (!"ADMIN".equals(role) && !"MANAGER".equals(role) && !"OWNER".equals(role)) {
            throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can manage company budgets");
        }
    }
    
    /**
     * Verify user can view budgets (ADMIN or MANAGER only, not EMPLOYEE)
     */
    private void verifyCanViewBudget(User user, Company company) {
        // Super admin can view all
        if (user.getRole() == com.expenseapp.user.Role.SUPER_ADMIN) {
            return;
        }
        
        CompanyMember member = companyMemberRepository.findByCompanyAndUser(company, user)
                .orElseThrow(() -> new IllegalArgumentException("Not a member of this company"));
        
        String role = member.getRole();
        if (!"ADMIN".equals(role) && !"MANAGER".equals(role) && !"OWNER".equals(role)) {
            throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can view company budgets");
        }
    }
    
    /**
     * Send budget alert notification
     */
    private void sendBudgetAlert(CompanyBudget budget) {
        Company company = companyRepository.findById(budget.getCompanyId()).orElse(null);
        if (company == null) return;
        
        // Find all admins and managers
        List<CompanyMember> recipients = companyMemberRepository.findAllByCompany(company).stream()
                .filter(m -> "OWNER".equals(m.getRole()) || "ADMIN".equals(m.getRole()) || "MANAGER".equals(m.getRole()))
                .toList();
        
        String alertType = budget.isExceeded() ? "EXCEEDED" : "WARNING";
        String title = budget.isExceeded() ? "Budget Exceeded!" : "Budget Alert";
        String message = String.format(
                "Company budget is at %d%% (%s %s of %s %s)",
                budget.getSpentPercentage(),
                budget.getCurrency(),
                budget.getSpentAmount(),
                budget.getCurrency(),
                budget.getTotalAmount()
        );
        
        for (CompanyMember recipient : recipients) {
            notificationPublisher.publish(
                    recipient.getUser().getId(),
                    "COMPANY_BUDGET_" + alertType,
                    title,
                    message,
                    String.format("{\"type\":\"company_budget_alert\",\"budgetId\":%d,\"percentage\":%d}", 
                            budget.getId(), budget.getSpentPercentage()),
                    budget.getCompanyId()
            );
        }
    }
}
