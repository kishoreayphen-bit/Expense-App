package com.expenseapp.budget;

import java.math.BigDecimal;

public class BudgetExceededException extends RuntimeException {
    
    private final BigDecimal overallBudget;
    private final BigDecimal proposedTotal;
    
    public BudgetExceededException(String message, BigDecimal overallBudget, BigDecimal proposedTotal) {
        super(message);
        this.overallBudget = overallBudget;
        this.proposedTotal = proposedTotal;
    }
    
    public BigDecimal getOverallBudget() {
        return overallBudget;
    }
    
    public BigDecimal getProposedTotal() {
        return proposedTotal;
    }
    
    public BigDecimal getDifference() {
        return proposedTotal.subtract(overallBudget);
    }
}
