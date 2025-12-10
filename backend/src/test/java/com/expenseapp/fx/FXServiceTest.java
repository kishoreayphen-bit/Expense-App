package com.expenseapp.fx;

import com.expenseapp.fx.provider.FXProviderClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class FXServiceTest {

    @Test
    void convertToBase_usesHistoricalRate() {
        FXRateRepository repo = mock(FXRateRepository.class);
        FXProviderClient provider = mock(FXProviderClient.class);
        FXService service = new FXService(repo, "INR", provider);

        LocalDate date = LocalDate.of(2025, 9, 1);
        when(repo.findTopByCurrencyAndRateDateLessThanEqualOrderByRateDateDesc("USD", date))
                .thenReturn(Optional.of(rate(date, "USD", new BigDecimal("80.00"))));

        BigDecimal base = service.convertToBase(date, "USD", new BigDecimal("10.00"));
        assertEquals(new BigDecimal("800.00"), base);
    }

    @Test
    void backfill_insertsWhenMissing_andProviderAvailable() {
        FXRateRepository repo = mock(FXRateRepository.class);
        FXProviderClient provider = mock(FXProviderClient.class);
        FXService service = new FXService(repo, "INR", provider);

        LocalDate from = LocalDate.of(2025, 9, 1);
        LocalDate to = LocalDate.of(2025, 9, 3);

        // No existing rates
        when(repo.findByRateDateAndCurrency(any(LocalDate.class), eq("USD")))
                .thenReturn(Optional.empty());
        // Provider returns a constant rate
        when(provider.historicalRateToBase(any(LocalDate.class), eq("INR"), eq("USD")))
                .thenReturn(Optional.of(new BigDecimal("82.50")));

        // Capture saves
        ArgumentCaptor<FXRate> captor = ArgumentCaptor.forClass(FXRate.class);
        when(repo.save(any(FXRate.class))).thenAnswer(inv -> inv.getArgument(0));

        int inserted = service.backfill(from, to, List.of("USD"));
        assertEquals(3, inserted);

        verify(repo, times(3)).save(captor.capture());
        for (FXRate r : captor.getAllValues()) {
            assertEquals("USD", r.getCurrency());
            assertEquals(new BigDecimal("82.50"), r.getRateToBase());
            assertTrue(!r.getRateDate().isBefore(from) && !r.getRateDate().isAfter(to));
        }
    }

    private FXRate rate(LocalDate date, String currency, BigDecimal rateToBase) {
        FXRate r = new FXRate();
        r.setRateDate(date);
        r.setCurrency(currency);
        r.setRateToBase(rateToBase);
        return r;
    }
}
