package com.expenseapp.fx;

import com.expenseapp.fx.provider.FXProviderClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class FXService {

    private final FXRateRepository fxRateRepository;
    private final String baseCurrency;
    private final java.util.List<FXProviderClient> providers; // can have multiple
    private static final Logger log = LoggerFactory.getLogger(FXService.class);

    @Autowired
    public FXService(FXRateRepository fxRateRepository,
                     @Value("${app.baseCurrency:INR}") String baseCurrency,
                     @Nullable java.util.List<FXProviderClient> providers) {
        this.fxRateRepository = fxRateRepository;
        this.baseCurrency = baseCurrency;
        this.providers = providers == null ? java.util.List.of() : providers;
    }

    // Convenience constructor for tests and manual wiring with a single provider
    public FXService(FXRateRepository fxRateRepository,
                     String baseCurrency,
                     @Nullable FXProviderClient provider) {
        this(fxRateRepository, baseCurrency,
                provider == null ? java.util.List.of() : java.util.List.of(provider));
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public FXRate upsertRate(LocalDate date, String currency, BigDecimal rateToBase) {
        log.debug("[FX] Upserting rate {} -> {} on {} = {}", currency, baseCurrency, date, rateToBase);
        try {
            FXRate rate = fxRateRepository.findByRateDateAndCurrency(date, currency.toUpperCase()).orElseGet(FXRate::new);
            rate.setRateDate(date);
            rate.setCurrency(currency.toUpperCase());
            rate.setRateToBase(rateToBase);
            return fxRateRepository.save(rate);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // Handle race condition on unique(rate_date, currency): fetch existing and return
            log.warn("[FX] Unique constraint hit for {} on {} (likely concurrent insert); returning existing", currency, date);
            return fxRateRepository.findByRateDateAndCurrency(date, currency.toUpperCase()).orElseThrow(() -> ex);
        }
    }

    @Transactional(readOnly = true)
    public BigDecimal rateFor(LocalDate date, String currency) {
        if (currency == null) return BigDecimal.ONE;
        if (currency.equalsIgnoreCase(baseCurrency)) return BigDecimal.ONE;
        return fxRateRepository.findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency.toUpperCase(), date)
                .map(FXRate::getRateToBase)
                .orElse(BigDecimal.ONE); // fallback: 1:1 if missing
    }

    @Transactional(readOnly = true)
    public BigDecimal convertToBase(LocalDate date, String currency, BigDecimal amount) {
        if (amount == null) return null;
        BigDecimal rate = rateFor(date, currency);
        return amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Ensure a historical rate exists for the given date and currency relative to base.
     * If missing and a provider client is configured, fetch and upsert. Returns the rate (or 1 if base).
     */
    @Transactional(propagation = Propagation.SUPPORTS, readOnly = false)
    public BigDecimal ensureRate(LocalDate date, String currency) {
        if (currency == null || currency.equalsIgnoreCase(baseCurrency)) {
            return BigDecimal.ONE;
        }
        Optional<FXRate> existing = fxRateRepository.findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency.toUpperCase(), date);
        if (existing.isPresent()) {
            log.debug("[FX] Found existing rate for {} -> {} on or before {} = {}", currency, baseCurrency, date, existing.get().getRateToBase());
            return existing.get().getRateToBase();
        }
        if (providers != null && !providers.isEmpty()) {
            // Prefer Frankfurter first if present, then others
            java.util.List<FXProviderClient> ordered = new java.util.ArrayList<>(providers);
            ordered.sort((a, b) -> {
                String an = a.getClass().getSimpleName().toLowerCase();
                String bn = b.getClass().getSimpleName().toLowerCase();
                boolean af = an.contains("frankfurter");
                boolean bf = bn.contains("frankfurter");
                if (af == bf) return an.compareTo(bn);
                return af ? -1 : 1;
            });

            for (FXProviderClient client : ordered) {
                LocalDate probe = date;
                for (int i = 0; i < 7; i++) {
                    try {
                        Optional<BigDecimal> rate = client.historicalRateToBase(probe, baseCurrency, currency.toUpperCase());
                        if (rate.isPresent()) {
                            log.info("[FX] Fetched historical rate via {} {} -> {} for {} = {} (requested {}, used {})", client.getClass().getSimpleName(), currency, baseCurrency, probe, rate.get(), date, probe);
                            upsertRate(probe, currency, rate.get());
                            return rate.get();
                        } else {
                            log.warn("[FX] No rate from {} for {} -> {} on {} (attempt {} of 7)", client.getClass().getSimpleName(), currency, baseCurrency, probe, i + 1);
                        }
                    } catch (Exception ex) {
                        log.error("[FX] Error fetching rate from {} for {} -> {} on {}: {}", client.getClass().getSimpleName(), currency, baseCurrency, probe, ex.toString());
                    }
                    probe = probe.minusDays(1);
                }
            }
        } else {
            log.warn("[FX] No FXProviderClient configured; returning 1:1 for {} -> {} on {}", currency, baseCurrency, date);
        }
        // Fallback when provider is not configured or rate unavailable
        return BigDecimal.ONE;
    }

    @Transactional(readOnly = true)
    public java.util.Optional<FXRate> rateRecordFor(LocalDate date, String currency) {
        if (currency == null || currency.equalsIgnoreCase(baseCurrency)) {
            FXRate r = new FXRate();
            r.setRateDate(date);
            r.setCurrency(baseCurrency);
            r.setRateToBase(BigDecimal.ONE);
            return java.util.Optional.of(r);
        }
        return fxRateRepository.findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc(currency.toUpperCase(), date);
    }

    @Transactional(readOnly = true)
    public java.util.List<FXRate> history(String currency, LocalDate from, LocalDate to) {
        return fxRateRepository.findAllByCurrencyAndRateDateBetweenOrderByRateDateAsc(currency.toUpperCase(), from, to);
    }

    @Transactional
    public int backfill(LocalDate from, LocalDate to, List<String> currencies) {
        int inserted = 0;
        if (currencies == null || currencies.isEmpty()) return inserted;
        for (String cur : currencies) {
            if (cur == null) continue;
            String c = cur.toUpperCase();
            if (c.equalsIgnoreCase(baseCurrency)) continue;
            LocalDate d = from;
            while (!d.isAfter(to)) {
                Optional<FXRate> existing = fxRateRepository.findByRateDateAndCurrency(d, c);
                if (existing.isEmpty()) {
                    if (providers != null && !providers.isEmpty()) {
                        // Prefer Frankfurter first
                        java.util.List<FXProviderClient> ordered = new java.util.ArrayList<>(providers);
                        ordered.sort((a, b) -> {
                            String an = a.getClass().getSimpleName().toLowerCase();
                            String bn = b.getClass().getSimpleName().toLowerCase();
                            boolean af = an.contains("frankfurter");
                            boolean bf = bn.contains("frankfurter");
                            if (af == bf) return an.compareTo(bn);
                            return af ? -1 : 1;
                        });
                        for (FXProviderClient client : ordered) {
                            try {
                                Optional<BigDecimal> rate = client.historicalRateToBase(d, baseCurrency, c);
                                if (rate.isPresent()) {
                                    upsertRate(d, c, rate.get());
                                    inserted++;
                                    break;
                                }
                            } catch (Exception ignore) { }
                        }
                    }
                }
                d = d.plusDays(1);
            }
        }
        return inserted;
    }
}
