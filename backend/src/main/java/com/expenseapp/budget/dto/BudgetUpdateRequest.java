package com.expenseapp.budget.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BudgetUpdateRequest {
    @NotNull @Positive
    private BigDecimal amount;
    private boolean alert80 = true;
    private boolean alert100 = true;

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public boolean isAlert80() { return alert80; }
    public void setAlert80(boolean alert80) { this.alert80 = alert80; }
    public boolean isAlert100() { return alert100; }
    public void setAlert100(boolean alert100) { this.alert100 = alert100; }
}
