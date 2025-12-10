package com.expenseapp.budget.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class BudgetView {
    private Long id;
    private Long userId;
    private Long groupId;
    private Long categoryId;
    private String categoryName;
    private String period;
    private BigDecimal amount;
    private BigDecimal spent;
    private BigDecimal remaining;
    private double percentUsed;
    private boolean alert80;
    private boolean alert100;
    private Instant createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getSpent() { return spent; }
    public void setSpent(BigDecimal spent) { this.spent = spent; }
    public BigDecimal getRemaining() { return remaining; }
    public void setRemaining(BigDecimal remaining) { this.remaining = remaining; }
    public double getPercentUsed() { return percentUsed; }
    public void setPercentUsed(double percentUsed) { this.percentUsed = percentUsed; }
    public boolean isAlert80() { return alert80; }
    public void setAlert80(boolean alert80) { this.alert80 = alert80; }
    public boolean isAlert100() { return alert100; }
    public void setAlert100(boolean alert100) { this.alert100 = alert100; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
