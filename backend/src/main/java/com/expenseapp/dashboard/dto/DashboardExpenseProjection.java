package com.expenseapp.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface DashboardExpenseProjection {
    Long getId();
    LocalDate getOccurredOn();
    BigDecimal getAmount();
    String getCurrency();
    Long getCategoryId();
    String getCategoryName();
}
