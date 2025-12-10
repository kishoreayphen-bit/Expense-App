package com.expenseapp.fx;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface FXRateRepository extends JpaRepository<FXRate, Long> {
    Optional<FXRate> findByRateDateAndCurrency(LocalDate rateDate, String currency);
    Optional<FXRate> findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(String currency, LocalDate rateDate);
    java.util.List<FXRate> findAllByCurrencyAndRateDateBetweenOrderByRateDateAsc(String currency, LocalDate from, LocalDate to);
}
