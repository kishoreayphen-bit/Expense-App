package com.expenseapp.expense.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class ExpenseCreateRequest {
    @NotNull @Positive
    private BigDecimal amount;
    @NotNull
    private String currency;
    @NotNull
    private LocalDate occurredOn;
    
    private String description;
    private Long categoryId;
    private Long groupId;
    private String notes;
    private String merchant;
    private boolean reimbursable;
    private Long companyId; // null = personal, non-null = company
    
    // Split expense fields
    private List<Long> participants; // User IDs to split with
    private String splitType; // "equal", "custom", "percentage"

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public void setOccurredOn(LocalDate occurredOn) { this.occurredOn = occurredOn; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public boolean isReimbursable() { return reimbursable; }
    public void setReimbursable(boolean reimbursable) { this.reimbursable = reimbursable; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public List<Long> getParticipants() { return participants; }
    public void setParticipants(List<Long> participants) { this.participants = participants; }
    public String getSplitType() { return splitType; }
    public void setSplitType(String splitType) { this.splitType = splitType; }
}
