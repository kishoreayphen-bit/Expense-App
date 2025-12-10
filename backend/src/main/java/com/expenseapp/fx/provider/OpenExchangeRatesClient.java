package com.expenseapp.fx.provider;

import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

public class OpenExchangeRatesClient implements FXProviderClient {
    private final String appId;
    private final RestTemplate rest;

    public OpenExchangeRatesClient(String appId) {
        this.appId = appId;
        this.rest = new RestTemplate();
    }

    @SuppressWarnings("unchecked")
    @Override
    public Optional<BigDecimal> historicalRateToBase(LocalDate date, String baseCurrency, String currency) {
        try {
            String url = "https://openexchangerates.org/api/historical/" + date.format(DateTimeFormatter.ISO_DATE) + ".json?app_id=" + appId;
            Map<String, Object> json = rest.getForObject(url, Map.class);
            if (json == null || !json.containsKey("rates")) return Optional.empty();
            Map<String, Object> rates = (Map<String, Object>) json.get("rates");
            if (rates.get(currency.toUpperCase()) == null) return Optional.empty();
            Double usdToCurrency = ((Number) rates.get(currency.toUpperCase())).doubleValue();
            if (baseCurrency.equalsIgnoreCase("USD")) {
                if (usdToCurrency == 0.0) return Optional.empty();
                BigDecimal rateToBase = BigDecimal.valueOf(1.0d / usdToCurrency);
                return Optional.of(rateToBase);
            } else {
                if (rates.get(baseCurrency.toUpperCase()) == null) return Optional.empty();
                Double usdToBase = ((Number) rates.get(baseCurrency.toUpperCase())).doubleValue();
                if (usdToCurrency == 0.0) return Optional.empty();
                BigDecimal rateToBase = BigDecimal.valueOf(usdToBase / usdToCurrency);
                return Optional.of(rateToBase);
            }
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
