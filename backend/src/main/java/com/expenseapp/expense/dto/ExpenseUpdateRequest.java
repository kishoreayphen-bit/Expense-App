package com.expenseapp.expense.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ExpenseUpdateRequest {
    private BigDecimal amount;
    private String currency;
    private LocalDate occurredOn;
    private Long categoryId;
    private String notes;
    private String merchant;
    private Boolean reimbursable;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public void setOccurredOn(LocalDate occurredOn) { this.occurredOn = occurredOn; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public Boolean getReimbursable() { return reimbursable; }
    public void setReimbursable(Boolean reimbursable) { this.reimbursable = reimbursable; }
}
