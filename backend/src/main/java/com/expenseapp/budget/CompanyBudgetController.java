package com.expenseapp.budget;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/company-budgets")
@RequiredArgsConstructor
public class CompanyBudgetController {
    
    private final CompanyBudgetService companyBudgetService;
    
    /**
     * Create overall company budget
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> createCompanyBudget(
            @RequestBody CompanyBudget budget,
            @RequestParam Long companyId,
            Authentication auth) {
        try {
            String email = auth.getName();
            CompanyBudget created = companyBudgetService.createCompanyBudget(email, companyId, budget);
            return ResponseEntity.ok(created);
        } catch (BudgetExceededException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "BUDGET_EXCEEDED",
                    "message", e.getMessage(),
                    "overallBudget", e.getOverallBudget(),
                    "proposedTotal", e.getProposedTotal(),
                    "difference", e.getDifference()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Update company budget
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateCompanyBudget(
            @PathVariable Long id,
            @RequestBody CompanyBudget updates,
            Authentication auth) {
        try {
            String email = auth.getName();
            CompanyBudget updated = companyBudgetService.updateCompanyBudget(email, id, updates);
            return ResponseEntity.ok(updated);
        } catch (BudgetExceededException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "BUDGET_EXCEEDED",
                    "message", e.getMessage(),
                    "overallBudget", e.getOverallBudget(),
                    "proposedTotal", e.getProposedTotal(),
                    "difference", e.getDifference()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get current active budget for company
     */
    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> getCurrentBudget(@RequestParam Long companyId) {
        return companyBudgetService.getCurrentBudget(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * List all budgets for company
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<List<CompanyBudget>> listCompanyBudgets(
            @RequestParam Long companyId,
            Authentication auth) {
        try {
            String email = auth.getName();
            List<CompanyBudget> budgets = companyBudgetService.listCompanyBudgets(email, companyId);
            return ResponseEntity.ok(budgets);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Extend budget amount
     */
    @PostMapping("/{id}/extend")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> extendBudget(
            @PathVariable Long id,
            @RequestBody Map<String, BigDecimal> request,
            Authentication auth) {
        try {
            String email = auth.getName();
            BigDecimal additionalAmount = request.get("additionalAmount");
            
            if (additionalAmount == null || additionalAmount.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "code", "INVALID_AMOUNT",
                        "message", "Additional amount must be positive"
                ));
            }
            
            CompanyBudget extended = companyBudgetService.extendBudget(email, id, additionalAmount);
            return ResponseEntity.ok(extended);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Recalculate spent amount
     */
    @PostMapping("/{id}/recalculate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> recalculateSpent(@PathVariable Long id) {
        try {
            companyBudgetService.recalculateSpentAmount(id);
            return ResponseEntity.ok(Map.of("message", "Spent amount recalculated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Delete/deactivate budget
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteBudget(
            @PathVariable Long id,
            Authentication auth) {
        try {
            String email = auth.getName();
            CompanyBudget updates = new CompanyBudget();
            updates.setIsActive(false);
            companyBudgetService.updateCompanyBudget(email, id, updates);
            return ResponseEntity.ok(Map.of("message", "Budget deactivated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
}
