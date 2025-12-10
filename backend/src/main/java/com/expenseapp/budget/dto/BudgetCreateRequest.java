package com.expenseapp.budget.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public class BudgetCreateRequest {
    private Long groupId; // null for personal
    private Long categoryId; // null for all categories
    private Long companyId; // null = personal, non-null = company
    @NotNull
    private String period; // YYYY-MM
    @NotNull @Positive
    private BigDecimal amount;
    private boolean alert80 = true;
    private boolean alert100 = true;

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public boolean isAlert80() { return alert80; }
    public void setAlert80(boolean alert80) { this.alert80 = alert80; }
    public boolean isAlert100() { return alert100; }
    public void setAlert100(boolean alert100) { this.alert100 = alert100; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
}
