package com.expenseapp.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DashboardExpenseProjectionImpl implements DashboardExpenseProjection {
    private final Long id;
    private final LocalDate occurredOn;
    private final BigDecimal amount;
    private final String currency;
    private final Long categoryId;
    private final String categoryName;

    public DashboardExpenseProjectionImpl(
            Long id, 
            LocalDate occurredOn, 
            BigDecimal amount, 
            String currency, 
            Long categoryId, 
            String categoryName
    ) {
        this.id = id;
        this.occurredOn = occurredOn;
        this.amount = amount;
        this.currency = currency;
        this.categoryId = categoryId == -1L ? null : categoryId;
        this.categoryName = categoryName;
    }

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public LocalDate getOccurredOn() {
        return occurredOn;
    }

    @Override
    public BigDecimal getAmount() {
        return amount;
    }

    @Override
    public String getCurrency() {
        return currency;
    }

    @Override
    public Long getCategoryId() {
        return categoryId;
    }

    @Override
    public String getCategoryName() {
        return categoryName;
    }
}
