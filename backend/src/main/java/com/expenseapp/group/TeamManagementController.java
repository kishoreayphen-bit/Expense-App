package com.expenseapp.group;

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
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
public class TeamManagementController {
    
    private final GroupService groupService;
    private final TeamBudgetService teamBudgetService;
    
    /**
     * Assign team lead to a group
     */
    @PostMapping("/{groupId}/assign-lead")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> assignTeamLead(
            @PathVariable Long groupId,
            @RequestBody Map<String, Long> request,
            Authentication auth) {
        try {
            String email = auth.getName();
            Long teamLeadUserId = request.get("teamLeadUserId");
            
            if (teamLeadUserId == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "code", "INVALID_REQUEST",
                        "message", "teamLeadUserId is required"
                ));
            }
            
            Group updated = groupService.assignTeamLead(email, groupId, teamLeadUserId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Remove team lead from a group
     */
    @DeleteMapping("/{groupId}/team-lead")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> removeTeamLead(
            @PathVariable Long groupId,
            Authentication auth) {
        try {
            String email = auth.getName();
            Group updated = groupService.removeTeamLead(email, groupId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get groups where user is team lead
     */
    @GetMapping("/led-by-me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Group>> getGroupsLedByMe(Authentication auth) {
        try {
            String email = auth.getName();
            // Get user ID from email
            Long userId = groupService.getGroupsLedBy(0L).stream()
                    .findFirst()
                    .map(g -> g.getTeamLead().getId())
                    .orElse(null);
            
            if (userId == null) {
                return ResponseEntity.ok(List.of());
            }
            
            List<Group> groups = groupService.getGroupsLedBy(userId);
            return ResponseEntity.ok(groups);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }
    
    /**
     * Set team budget
     */
    @PostMapping("/{groupId}/budget")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")
    public ResponseEntity<?> setTeamBudget(
            @PathVariable Long groupId,
            @RequestBody TeamBudget budget,
            Authentication auth) {
        try {
            String email = auth.getName();
            TeamBudget created = teamBudgetService.setTeamBudget(email, groupId, budget);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Update team budget
     */
    @PutMapping("/budgets/{budgetId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateTeamBudget(
            @PathVariable Long budgetId,
            @RequestBody TeamBudget updates,
            Authentication auth) {
        try {
            String email = auth.getName();
            TeamBudget updated = teamBudgetService.updateTeamBudget(email, budgetId, updates);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get current budget for team
     */
    @GetMapping("/{groupId}/budget/current")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getCurrentBudget(@PathVariable Long groupId) {
        return teamBudgetService.getCurrentBudget(groupId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * List all budgets for team
     */
    @GetMapping("/{groupId}/budgets")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> listTeamBudgets(
            @PathVariable Long groupId,
            Authentication auth) {
        try {
            String email = auth.getName();
            List<TeamBudget> budgets = teamBudgetService.listTeamBudgets(email, groupId);
            return ResponseEntity.ok(budgets);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Recalculate team budget spent amount
     */
    @PostMapping("/budgets/{budgetId}/recalculate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> recalculateSpent(@PathVariable Long budgetId) {
        try {
            teamBudgetService.recalculateSpentAmount(budgetId);
            return ResponseEntity.ok(Map.of("message", "Spent amount recalculated"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "code", "INVALID_REQUEST",
                    "message", e.getMessage()
            ));
        }
    }
}
