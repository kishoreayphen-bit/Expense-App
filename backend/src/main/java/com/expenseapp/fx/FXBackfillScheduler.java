package com.expenseapp.fx;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Component
public class FXBackfillScheduler {
    private static final Logger log = LoggerFactory.getLogger(FXBackfillScheduler.class);

    private final FXService fxService;
    private final boolean enabled;
    private final List<String> currencies;

    public FXBackfillScheduler(
            FXService fxService,
            @Value("${fx.backfill.enabled:false}") boolean enabled,
            @Value("${fx.backfill.currencies:}") String currenciesCsv
    ) {
        this.fxService = fxService;
        this.enabled = enabled;
        this.currencies = currenciesCsv == null || currenciesCsv.isBlank()
                ? java.util.Collections.emptyList()
                : Arrays.stream(currenciesCsv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    // Run daily at 02:15 AM server time
    @Scheduled(cron = "0 15 2 * * *")
    public void backfillPreviousDay() {
        if (!enabled || currencies.isEmpty()) return;
        LocalDate yesterday = LocalDate.now().minusDays(1);
        int inserted = fxService.backfill(yesterday, yesterday, currencies);
        if (inserted > 0) {
            log.info("FX backfill inserted {} rates for {}", inserted, yesterday);
        }
    }
}
