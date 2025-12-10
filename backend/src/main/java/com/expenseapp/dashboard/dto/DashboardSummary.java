package com.expenseapp.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class DashboardSummary {
    public static class CategoryTotal {
        private Long categoryId;
        private String categoryName;
        private BigDecimal total;
        public CategoryTotal(Long categoryId, String categoryName, BigDecimal total) {
            this.categoryId = categoryId; this.categoryName = categoryName; this.total = total;
        }
        public Long getCategoryId() { return categoryId; }
        public String getCategoryName() { return categoryName; }
        public BigDecimal getTotal() { return total; }
    }

    public static class TrendPoint {
        private LocalDate date;
        private BigDecimal total;
        public TrendPoint(LocalDate date, BigDecimal total) { this.date = date; this.total = total; }
        public LocalDate getDate() { return date; }
        public BigDecimal getTotal() { return total; }
    }

    private BigDecimal totalSpent;
    private List<CategoryTotal> categoryTotals;
    private List<TrendPoint> trends;
    private long pendingSplits;
    private long pendingApprovals;
    private String currency;

    public DashboardSummary(BigDecimal totalSpent, List<CategoryTotal> categoryTotals, List<TrendPoint> trends,
                            long pendingSplits, long pendingApprovals, String currency) {
        this.totalSpent = totalSpent;
        this.categoryTotals = categoryTotals;
        this.trends = trends;
        this.pendingSplits = pendingSplits;
        this.pendingApprovals = pendingApprovals;
        this.currency = currency;
    }

    public BigDecimal getTotalSpent() { return totalSpent; }
    public List<CategoryTotal> getCategoryTotals() { return categoryTotals; }
    public List<TrendPoint> getTrends() { return trends; }
    public long getPendingSplits() { return pendingSplits; }
    public long getPendingApprovals() { return pendingApprovals; }
    public String getCurrency() { return currency; }
}
