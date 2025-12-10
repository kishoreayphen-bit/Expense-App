package com.expenseapp.dashboard;

import com.expenseapp.dashboard.dto.DashboardSummary;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "false") boolean base,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        try {
            if (to == null) to = LocalDate.now();
            if (from == null) from = to.minusDays(30);
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of(
                    "status", "error",
                    "message", "Not authenticated"
                ));
            }
            
            Object principal = auth.getPrincipal();
            String email;
            
            if (principal instanceof UserDetails) {
                email = ((UserDetails) principal).getUsername();
            } else if (principal instanceof String) {
                email = (String) principal;
            } else {
                return ResponseEntity.status(401).body(Map.of(
                    "status", "error",
                    "message", "Invalid authentication details"
                ));
            }
            
            Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
            DashboardSummary result = dashboardService.getSummary(email, from, to, base, normalizedCompanyId);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "Error processing request: " + e.getMessage()
            ));
        }
    }
}
