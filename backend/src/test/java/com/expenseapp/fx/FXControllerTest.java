package com.expenseapp.fx;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FXController.class)
class FXControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FXService fxService;

    @Test
    void history_returnsRates() throws Exception {
        FXRate r1 = new FXRate(); r1.setCurrency("USD"); r1.setRateDate(LocalDate.of(2025,9,1)); r1.setRateToBase(new BigDecimal("80.00"));
        FXRate r2 = new FXRate(); r2.setCurrency("USD"); r2.setRateDate(LocalDate.of(2025,9,2)); r2.setRateToBase(new BigDecimal("81.00"));
        Mockito.when(fxService.history(eq("USD"), Mockito.any(LocalDate.class), Mockito.any(LocalDate.class)))
                .thenReturn(List.of(r1, r2));

        mockMvc.perform(get("/api/v1/fx/rates/history")
                        .param("currency", "USD")
                        .param("from", "2025-09-01")
                        .param("to", "2025-09-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].currency", is("USD")))
                .andExpect(jsonPath("$[0].rateToBase", is(80.00)))
                .andExpect(jsonPath("$[1].rateToBase", is(81.00)));
    }

    @Test
    void used_returnsRate() throws Exception {
        FXRate r = new FXRate(); r.setCurrency("USD"); r.setRateDate(LocalDate.of(2025,9,1)); r.setRateToBase(new BigDecimal("80.50"));
        Mockito.when(fxService.rateRecordFor(eq(LocalDate.of(2025,9,1)), eq("USD")))
                .thenReturn(Optional.of(r));
        Mockito.when(fxService.getBaseCurrency()).thenReturn("INR");

        mockMvc.perform(get("/api/v1/fx/rates/used")
                        .param("date", "2025-09-01")
                        .param("currency", "USD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currency", is("USD")))
                .andExpect(jsonPath("$.rateToBase", is(80.50)))
                .andExpect(jsonPath("$.baseCurrency", is("INR")));
    }

    @Test
    void backfill_returnsInsertedCount() throws Exception {
        Mockito.when(fxService.backfill(eq(LocalDate.of(2025,9,1)), eq(LocalDate.of(2025,9,03)), Mockito.anyList()))
                .thenReturn(3);
        Mockito.when(fxService.getBaseCurrency()).thenReturn("INR");

        mockMvc.perform(put("/api/v1/fx/backfill")
                        .contentType(MediaType.APPLICATION_JSON)
                        .param("from", "2025-09-01")
                        .param("to", "2025-09-03")
                        .param("currencies", "USD,EUR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inserted", is(3)))
                .andExpect(jsonPath("$.baseCurrency", is("INR")));
    }
}
