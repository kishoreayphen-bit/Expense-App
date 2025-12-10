package com.expenseapp.dashboard;

import com.expenseapp.approval.ApprovalRepository;
import com.expenseapp.dashboard.dto.DashboardSummary;
import com.expenseapp.expense.Category;
import com.expenseapp.expense.Expense;
import com.expenseapp.expense.ExpenseRepository;
import com.expenseapp.expense.SplitShareRepository;
import com.expenseapp.fx.FXService;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ExpenseRepository expenseRepository;
    private final SplitShareRepository splitShareRepository;
    private final ApprovalRepository approvalRepository;
    private final UserRepository userRepository;
    private final FXService fxService;

    @Transactional(readOnly = true)
    public DashboardSummary getSummary(String email, LocalDate from, LocalDate to, boolean base, Long companyId) {
        // TODO: Filter dashboard data by companyId when repository methods support it
        try {
            User user = userRepository.findByEmail(email).orElseThrow();
            BigDecimal totalSpent;
            List<DashboardSummary.CategoryTotal> categoryTotals;
            List<DashboardSummary.TrendPoint> trends;
            String currency;

            if (!base) {
                totalSpent = expenseRepository.totalSpent(user.getId(), from, to);
                categoryTotals = expenseRepository.categoryTotals(user.getId(), from, to)
                        .stream()
                        .map(arr -> new DashboardSummary.CategoryTotal(
                                arr[0] != null ? ((Number) arr[0]).longValue() : null,
                                (String) arr[1],
                                (java.math.BigDecimal) arr[2]
                        )).toList();
                trends = expenseRepository.trends(user.getId(), from, to)
                        .stream()
                        .map(arr -> new DashboardSummary.TrendPoint(
                                ((java.sql.Date) arr[0]).toLocalDate(),
                                (java.math.BigDecimal) arr[1]
                        )).toList();
                currency = null;
            } else {
                // Get all expenses for the user in the date range
                List<Expense> expenses = expenseRepository.findAllByUserAndOccurredOnBetween(user, from, to);

                // Calculate total spent in base currency
                totalSpent = expenses.stream()
                        .map(expense -> fxService.convertToBase(expense.getOccurredOn(), expense.getCurrency(), expense.getAmount()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Group by category
                Map<Category, BigDecimal> byCat = expenses.stream()
                        .collect(Collectors.groupingBy(
                                expense -> expense.getCategory(),
                                Collectors.reducing(
                                        BigDecimal.ZERO,
                                        expense -> fxService.convertToBase(expense.getOccurredOn(), expense.getCurrency(), expense.getAmount()),
                                        BigDecimal::add
                                )
                        ));

                // Create category totals
                categoryTotals = byCat.entrySet().stream()
                        .map(entry -> new DashboardSummary.CategoryTotal(
                                entry.getKey() != null ? entry.getKey().getId() : null,
                                entry.getKey() != null ? entry.getKey().getName() : "Uncategorized",
                                entry.getValue()
                        ))
                        .toList();

                // Group by day for trends
                Map<LocalDate, BigDecimal> byDay = expenses.stream()
                        .collect(Collectors.groupingBy(
                                Expense::getOccurredOn,
                                Collectors.reducing(
                                        BigDecimal.ZERO,
                                        expense -> fxService.convertToBase(expense.getOccurredOn(), expense.getCurrency(), expense.getAmount()),
                                        BigDecimal::add
                                )
                        ));

                trends = byDay.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> new DashboardSummary.TrendPoint(entry.getKey(), entry.getValue()))
                        .toList();

                currency = fxService.getBaseCurrency();
            }
        if (!base) {
            totalSpent = expenseRepository.totalSpent(user.getId(), from, to);
            categoryTotals = expenseRepository.categoryTotals(user.getId(), from, to)
                    .stream()
                    .map(arr -> new DashboardSummary.CategoryTotal(
                            arr[0] != null ? ((Number) arr[0]).longValue() : null,
                            (String) arr[1],
                            (java.math.BigDecimal) arr[2]
                    )).toList();
            trends = expenseRepository.trends(user.getId(), from, to)
                    .stream()
                    .map(arr -> new DashboardSummary.TrendPoint(
                            ((java.sql.Date) arr[0]).toLocalDate(),
                            (java.math.BigDecimal) arr[1]
                    )).toList();
            currency = null;
        } else {
            // Get all expenses for the user in the date range
            List<Expense> expenses = expenseRepository.findAllByUserAndOccurredOnBetween(user, from, to);
            
            // Calculate total spent in base currency
            totalSpent = expenses.stream()
                .map(expense -> fxService.convertToBase(expense.getOccurredOn(), expense.getCurrency(), expense.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            // Group by category
            Map<Category, BigDecimal> byCat = expenses.stream()
                .collect(Collectors.groupingBy(
                    expense -> expense.getCategory(),
                    Collectors.reducing(
                        BigDecimal.ZERO,
                        expense -> fxService.convertToBase(expense.getOccurredOn(), expense.getCurrency(), expense.getAmount()),
                        BigDecimal::add
                    )
                ));
            
            // Create category totals
            categoryTotals = byCat.entrySet().stream()
                .map(entry -> new DashboardSummary.CategoryTotal(
                    entry.getKey() != null ? entry.getKey().getId() : null,
                    entry.getKey() != null ? entry.getKey().getName() : "Uncategorized",
                    entry.getValue()
                ))
                .toList();
            
            // Group by day for trends
            Map<LocalDate, BigDecimal> byDay = expenses.stream()
                .collect(Collectors.groupingBy(
                    Expense::getOccurredOn,
                    Collectors.reducing(
                        BigDecimal.ZERO,
                        expense -> fxService.convertToBase(expense.getOccurredOn(), expense.getCurrency(), expense.getAmount()),
                        BigDecimal::add
                    )
                ));
            
            trends = byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new DashboardSummary.TrendPoint(entry.getKey(), entry.getValue()))
                .toList();
            
            currency = fxService.getBaseCurrency();
        }
            long pendingSplits = splitShareRepository.countPendingForUser(user.getId());
            long pendingApprovals = approvalRepository.countPendingForApprover(user.getId());
            return new DashboardSummary(totalSpent, categoryTotals, trends, pendingSplits, pendingApprovals, currency);
        } catch (Exception e) {
            log.error("Error generating dashboard summary for user: " + email, e);
            throw new RuntimeException("Failed to generate dashboard summary", e);
        }
    }
}
