package com.expenseapp.fx;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fx")
public class FXController {

    private final FXService fxService;

    public FXController(FXService fxService) {
        this.fxService = fxService;
    }

    @GetMapping("/base-currency")
    public ResponseEntity<Map<String, Object>> baseCurrency() {
        Map<String, Object> m = new HashMap<>();
        m.put("baseCurrency", fxService.getBaseCurrency());
        return ResponseEntity.ok(m);
    }

    @PutMapping("/rates")
    public ResponseEntity<FXRate> upsertRate(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                             @RequestParam String currency,
                                             @RequestParam BigDecimal rateToBase) {
        return ResponseEntity.ok(fxService.upsertRate(date, currency, rateToBase));
    }

    @GetMapping("/convert")
    public ResponseEntity<Map<String, Object>> convert(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                                       @RequestParam String currency,
                                                       @RequestParam BigDecimal amount) {
        BigDecimal base = fxService.convertToBase(date, currency, amount);
        Map<String, Object> m = new HashMap<>();
        m.put("baseCurrency", fxService.getBaseCurrency());
        m.put("baseAmount", base);
        return ResponseEntity.ok(m);
    }

    @GetMapping("/rates/history")
    public ResponseEntity<java.util.List<FXRate>> history(@RequestParam String currency,
                                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(
                fxService.history(currency, from, to)
        );
    }

    @GetMapping("/rates/used")
    public ResponseEntity<Map<String, Object>> rateUsed(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                                        @RequestParam String currency) {
        var opt = fxService.rateRecordFor(date, currency);
        Map<String, Object> m = new HashMap<>();
        if (opt.isPresent()) {
            FXRate r = opt.get();
            m.put("rateDate", r.getRateDate());
            m.put("currency", r.getCurrency());
            m.put("rateToBase", r.getRateToBase());
            m.put("baseCurrency", fxService.getBaseCurrency());
        }
        return ResponseEntity.ok(m);
    }

    @PutMapping("/backfill")
    public ResponseEntity<Map<String, Object>> backfill(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                        @RequestParam String currencies) {
        java.util.List<String> list = java.util.Arrays.stream(currencies.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        int inserted = fxService.backfill(from, to, list);
        Map<String, Object> m = new HashMap<>();
        m.put("inserted", inserted);
        m.put("baseCurrency", fxService.getBaseCurrency());
        return ResponseEntity.ok(m);
    }
}
