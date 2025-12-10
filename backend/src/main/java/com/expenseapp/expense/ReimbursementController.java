package com.expenseapp.expense;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reimbursements")
@RequiredArgsConstructor
public class ReimbursementController {
    
    private final ReimbursementService reimbursementService;
    
    @PostMapping("/request/{expenseId}")
    public ResponseEntity<Expense> requestReimbursement(
            @PathVariable Long expenseId,
            Authentication auth) {
        String email = auth.getName();
        Expense expense = reimbursementService.requestReimbursement(email, expenseId);
        return ResponseEntity.ok(expense);
    }
    
    @PostMapping("/approve/{expenseId}")
    public ResponseEntity<Expense> approveReimbursement(
            @PathVariable Long expenseId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String email = auth.getName();
        String notes = body != null ? body.get("notes") : null;
        Expense expense = reimbursementService.approveReimbursement(email, expenseId, notes);
        return ResponseEntity.ok(expense);
    }
    
    @PostMapping("/reject/{expenseId}")
    public ResponseEntity<Expense> rejectReimbursement(
            @PathVariable Long expenseId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String email = auth.getName();
        String reason = body != null ? body.get("reason") : null;
        Expense expense = reimbursementService.rejectReimbursement(email, expenseId, reason);
        return ResponseEntity.ok(expense);
    }
    
    @PostMapping("/mark-paid/{expenseId}")
    public ResponseEntity<Expense> markAsPaid(
            @PathVariable Long expenseId,
            Authentication auth) {
        String email = auth.getName();
        Expense expense = reimbursementService.markAsPaid(email, expenseId);
        return ResponseEntity.ok(expense);
    }
    
    @GetMapping("/pending")
    public ResponseEntity<List<Expense>> listPendingReimbursements(
            @RequestParam Long companyId,
            Authentication auth) {
        String email = auth.getName();
        List<Expense> expenses = reimbursementService.listPendingReimbursements(email, companyId);
        return ResponseEntity.ok(expenses);
    }
    
    @GetMapping("/history")
    public ResponseEntity<List<Expense>> listReimbursementHistory(
            @RequestParam Long companyId,
            Authentication auth) {
        String email = auth.getName();
        List<Expense> expenses = reimbursementService.listReimbursementHistory(email, companyId);
        return ResponseEntity.ok(expenses);
    }
}
