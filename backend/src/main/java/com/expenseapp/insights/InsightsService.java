package com.expenseapp.insights;

import com.expenseapp.budget.Budget;
import com.expenseapp.budget.BudgetRepository;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class InsightsService {

    private final UserRepository userRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;

    public InsightsService(UserRepository userRepository,
                          BudgetRepository budgetRepository,
                          ExpenseRepository expenseRepository) {
        this.userRepository = userRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getTips(String userEmail, String period) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();
        List<Map<String, Object>> tips = new ArrayList<>();
        
        LocalDate from = LocalDate.parse(period + "-01");
        LocalDate to = from.plusMonths(1).minusDays(1);
        
        // Get budgets for period
        List<Budget> budgets = budgetRepository.findAllByUserAndPeriod(user, period);
        
        // Get category totals
        var categoryTotals = expenseRepository.userCategoryTotals(user.getId(), from, to);
        
        // Tip 1: Budget overruns
        for (Budget budget : budgets) {
            BigDecimal spent = calculateSpent(budget, categoryTotals);
            double percentUsed = spent.divide(budget.getAmount(), 4, java.math.RoundingMode.HALF_UP).doubleValue() * 100;
            
            if (percentUsed > 100) {
                Map<String, Object> tip = new HashMap<>();
                tip.put("type", "BUDGET_OVERRUN");
                tip.put("title", "Budget Exceeded");
                tip.put("message", "You've exceeded your " + 
                    (budget.getCategory() != null ? budget.getCategory().getName() : "overall") + 
                    " budget by " + String.format("%.1f%%", percentUsed - 100));
                tip.put("impact", "HIGH");
                tip.put("action", "Consider reducing spending in this category or adjusting your budget");
                tips.add(tip);
            }
        }
        
        // Tip 2: Top spending category
        if (!categoryTotals.isEmpty()) {
            Object[] topCategory = categoryTotals.get(0);
            Map<String, Object> tip = new HashMap<>();
            tip.put("type", "TOP_CATEGORY");
            tip.put("title", "Highest Spending Category");
            tip.put("message", "Your top spending category is " + topCategory[1] + 
                " with $" + topCategory[2]);
            tip.put("impact", "MEDIUM");
            tip.put("action", "Review transactions in this category for optimization opportunities");
            tips.add(tip);
        }
        
        // Tip 3: No budget set
        if (budgets.isEmpty() && !categoryTotals.isEmpty()) {
            Map<String, Object> tip = new HashMap<>();
            tip.put("type", "NO_BUDGET");
            tip.put("title", "Set Up Budgets");
            tip.put("message", "You have expenses but no budgets set for this period");
            tip.put("impact", "MEDIUM");
            tip.put("action", "Create budgets to better track and control your spending");
            tips.add(tip);
        }
        
        return tips;
    }
    
    private BigDecimal calculateSpent(Budget budget, List<Object[]> categoryTotals) {
        if (budget.getCategory() != null) {
            return categoryTotals.stream()
                    .filter(row -> budget.getCategory().getId().equals(row[0]))
                    .map(row -> (BigDecimal) row[2])
                    .findFirst()
                    .orElse(BigDecimal.ZERO);
        } else {
            return categoryTotals.stream()
                    .map(row -> (BigDecimal) row[2])
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }
}
