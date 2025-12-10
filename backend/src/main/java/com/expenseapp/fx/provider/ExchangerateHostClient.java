package com.expenseapp.fx.provider;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * FX provider client using exchangerate.host (free, no API key) for historical rates.
 * API doc: https://exchangerate.host/#/#docs
 */
@Service
public class ExchangerateHostClient implements FXProviderClient {

    private final RestTemplate rest = new RestTemplate();
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public Optional<BigDecimal> historicalRateToBase(LocalDate date, String baseCurrency, String currency) {
        try {
            if (currency == null || baseCurrency == null) return Optional.empty();
            if (currency.equalsIgnoreCase(baseCurrency)) return Optional.of(BigDecimal.ONE);
            String d = DF.format(date);
            // Example: https://api.exchangerate.host/2020-01-10?base=USD&symbols=INR
            String url = String.format("https://api.exchangerate.host/%s?base=%s&symbols=%s", d,
                    currency.toUpperCase(), baseCurrency.toUpperCase());
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = rest.getForObject(url, Map.class);
            if (resp == null) return Optional.empty();
            Object ratesObj = resp.get("rates");
            if (!(ratesObj instanceof Map)) return Optional.empty();
            Object rateVal = ((Map<?, ?>) ratesObj).get(baseCurrency.toUpperCase());
            if (rateVal instanceof Number) {
                return Optional.of(new BigDecimal(((Number) rateVal).toString()));
            } else if (rateVal != null) {
                try {
                    return Optional.of(new BigDecimal(rateVal.toString()));
                } catch (Exception ignore) { }
            }
            return Optional.empty();
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
