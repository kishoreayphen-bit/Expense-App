package com.expenseapp.fx.provider;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public interface FXProviderClient {
    Optional<BigDecimal> historicalRateToBase(LocalDate date, String baseCurrency, String currency);
}
