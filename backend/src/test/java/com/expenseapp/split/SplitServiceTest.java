package com.expenseapp.split;

import com.expenseapp.fx.FXService;
import com.expenseapp.split.dto.SplitRequest;
import com.expenseapp.split.dto.SplitResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class SplitServiceTest {

    @Test
    void equalSplit_convertsToBase_withPerShareBaseAmounts() {
        FXService fx = mock(FXService.class);
        when(fx.rateFor(any(LocalDate.class), eq("USD"))).thenReturn(new BigDecimal("80.00"));
        when(fx.getBaseCurrency()).thenReturn("INR");
        SplitService svc = new SplitService(fx);

        SplitRequest req = new SplitRequest();
        req.setType("EQUAL");
        req.setTotalAmount(new BigDecimal("100.00"));
        req.setCurrency("USD");
        req.setOccurredOn(LocalDate.of(2025, 9, 5));

        SplitRequest.Participant p1 = new SplitRequest.Participant(); p1.setUserId(1L);
        SplitRequest.Participant p2 = new SplitRequest.Participant(); p2.setUserId(2L);
        req.setParticipants(List.of(p1, p2));

        SplitResponse res = svc.simulate(req);
        assertEquals(new BigDecimal("100.00"), res.getTotal());
        assertEquals("INR", res.getBaseCurrency());
        assertEquals(new BigDecimal("8000.00"), res.getBaseTotal());
        assertEquals(2, res.getShares().size());
        assertEquals(new BigDecimal("50.00"), res.getShares().get(0).getAmount());
        assertEquals(new BigDecimal("4000.00"), res.getShares().get(0).getBaseAmount());
        assertEquals(new BigDecimal("50.00"), res.getShares().get(1).getAmount());
        assertEquals(new BigDecimal("4000.00"), res.getShares().get(1).getBaseAmount());
    }

    @Test
    void caps_and_rounding_hold_total_constant() {
        FXService fx = mock(FXService.class);
        when(fx.rateFor(any(LocalDate.class), eq("USD"))).thenReturn(new BigDecimal("80.00"));
        when(fx.getBaseCurrency()).thenReturn("INR");
        SplitService svc = new SplitService(fx);

        SplitRequest req = new SplitRequest();
        req.setType("RATIO");
        req.setTotalAmount(new BigDecimal("99.99"));
        req.setCurrency("USD");
        req.setOccurredOn(LocalDate.of(2025, 9, 5));

        SplitRequest.Participant a = new SplitRequest.Participant(); a.setUserId(1L); a.setRatio(new BigDecimal("1")); a.setCapAmount(new BigDecimal("20.00"));
        SplitRequest.Participant b = new SplitRequest.Participant(); b.setUserId(2L); b.setRatio(new BigDecimal("1"));
        SplitRequest.Participant c = new SplitRequest.Participant(); c.setUserId(3L); c.setRatio(new BigDecimal("1"));
        req.setParticipants(List.of(a, b, c));

        SplitResponse res = svc.simulate(req);
        // Totals hold
        assertEquals(new BigDecimal("99.99"), res.getTotal());
        // Sum of share amounts equals total
        BigDecimal sum = res.getShares().stream().map(SplitResponse.Share::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(res.getTotal(), sum);
        // Base totals line up
        BigDecimal baseSum = res.getShares().stream().map(SplitResponse.Share::getBaseAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(res.getBaseTotal(), baseSum);
    }
}
