package com.expenseapp.budget;

import com.expenseapp.budget.dto.BudgetCreateRequest;
import com.expenseapp.budget.dto.BudgetUpdateRequest;
import com.expenseapp.budget.dto.BudgetView;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetController {

    private final BudgetService budgetService;
    private static final Logger log = LoggerFactory.getLogger(BudgetController.class);

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @PostMapping
    public ResponseEntity<BudgetView> create(
            @Valid @RequestBody BudgetCreateRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        return ResponseEntity.ok(budgetService.create(email, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BudgetView> update(@PathVariable Long id, @Valid @RequestBody BudgetUpdateRequest req) {
        String email = currentEmail();
        log.info("Budget PUT received: id={} by {} payload(amount={}, alert80={}, alert100={})",
                id, email, req != null ? req.getAmount() : null,
                req != null && req.isAlert80(),
                req != null && req.isAlert100());
        try {
            BudgetView updated = budgetService.update(email, id, req);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException iae) {
            String msg = iae.getMessage() == null ? "Bad request" : iae.getMessage();
            // Map specific messages to statuses
            if ("Budget not found".equalsIgnoreCase(msg)) {
                log.warn("Budget update 404 for id={} by {}: {}", id, email, msg);
                return ResponseEntity.status(404).build();
            }
            if (msg.toLowerCase().contains("others' budget") || msg.toLowerCase().contains("others")) {
                log.warn("Budget update 403 for id={} by {}: {}", id, email, msg);
                return ResponseEntity.status(403).build();
            }
            log.warn("Budget update 400 for id={} by {}: {}", id, email, msg);
            return ResponseEntity.badRequest().build();
        } catch (Exception ex) {
            log.error("Budget update 500 for id={} by {}: {}", id, email, ex.getMessage(), ex);
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        String email = currentEmail();
        budgetService.delete(email, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<BudgetView>> list(
            @RequestParam String period,
            @RequestParam(required = false) Long groupId,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        return ResponseEntity.ok(budgetService.list(email, period, groupId));
    }

    @PostMapping("/check-alerts")
    public ResponseEntity<Integer> checkAlerts(@RequestParam String period) {
        try {
            if (period == null || !period.matches("\\d{4}-\\d{2}")) {
                log.warn("check-alerts called with invalid period: {}", period);
                return ResponseEntity.badRequest().build();
            }
            String email = currentEmail();
            log.info("check-alerts invoked for user={}, period={}", email, period);
            int count = budgetService.checkAlertsForUser(email, period);
            return ResponseEntity.ok(count);
        } catch (Exception ex) {
            log.error("check-alerts failed for period={}: {}", period, ex.getMessage(), ex);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/anomalies")
    public ResponseEntity<List<java.util.Map<String, Object>>> anomalies(
            @RequestParam String period,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false, defaultValue = "false") boolean base,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        return ResponseEntity.ok(budgetService.anomalies(email, period, groupId, base));
    }

    @GetMapping("/predicted")
    public ResponseEntity<java.util.Map<String, Object>> predicted(
            @RequestParam String period,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false, defaultValue = "false") boolean base,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        return ResponseEntity.ok(budgetService.predicted(email, period, groupId, base));
    }

    @GetMapping("/variance")
    public ResponseEntity<List<java.util.Map<String, Object>>> variance(
            @RequestParam String period,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false, name = "categoryId") Long categoryFilterId,
            @RequestParam(required = false, defaultValue = "false") boolean base,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        return ResponseEntity.ok(budgetService.variance(email, period, groupId, categoryFilterId, base));
    }

    @GetMapping(value = "/variance.csv", produces = "text/csv")
    public ResponseEntity<String> varianceCsv(
            @RequestParam String period,
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false, name = "categoryId") Long categoryFilterId,
            @RequestParam(required = false, defaultValue = "false") boolean base,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        List<java.util.Map<String, Object>> data = budgetService.variance(email, period, groupId, categoryFilterId, base);
        StringBuilder sb = new StringBuilder();
        sb.append("categoryId,category,budget,spent,variance,currency\n");
        for (var row : data) {
            sb.append(row.getOrDefault("categoryId", ""))
              .append(',')
              .append(escapeCsv((String) row.getOrDefault("category", "")))
              .append(',')
              .append(row.getOrDefault("budget", "0"))
              .append(',')
              .append(row.getOrDefault("spent", "0"))
              .append(',')
              .append(row.getOrDefault("variance", "0"))
              .append(',')
              .append(escapeCsv((String) row.getOrDefault("currency", "")))
              .append('\n');
        }
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=variance-" + period + ".csv")
                .body(sb.toString());
    }

    private String escapeCsv(String s) {
        if (s == null) return "";
        boolean hasComma = s.contains(",");
        boolean hasQuote = s.contains("\"");
        boolean hasNewline = s.contains("\n") || s.contains("\r");
        if (hasQuote) s = s.replace("\"", "\"\"");
        if (hasComma || hasQuote || hasNewline) return "\"" + s + "\"";
        return s;
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
