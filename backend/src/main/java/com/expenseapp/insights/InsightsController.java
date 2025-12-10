package com.expenseapp.insights;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/insights")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping("/tips")
    public ResponseEntity<List<Map<String, Object>>> getTips(
            @RequestParam String period,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        // Normalize company ID: null if invalid, otherwise use the value
        // TODO: Pass companyId to insightsService when company-scoped insights are implemented
        return ResponseEntity.ok(insightsService.getTips(email, period));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
