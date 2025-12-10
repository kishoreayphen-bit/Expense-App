package com.expenseapp.expense;

import com.expenseapp.expense.dto.ExpenseCreateRequest;
import com.expenseapp.expense.dto.ExpenseUpdateRequest;
import com.expenseapp.expense.dto.ExpenseView;
import com.expenseapp.expense.dto.ReceiptView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private static final Logger log = LoggerFactory.getLogger(ExpenseController.class);

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping
    public ResponseEntity<ExpenseView> create(
            @Valid @RequestBody ExpenseCreateRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake
    ) {
        String email = currentEmail();
        if (email == null || email.isBlank() || email.equalsIgnoreCase("anonymousUser")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        // PRIORITY: body > header > query params (body is most explicit)
        Long coId = req.getCompanyId() != null ? req.getCompanyId() 
                  : (companyId != null ? companyId 
                  : (companyIdParam != null ? companyIdParam : companyIdSnake));
        try {
            log.info("[Expenses] Create request email={}, companyId(body)={}, companyId(hdr)={}, companyId(param)={}, company_id(param)={}, USING={}, payload amount={}, currency={}, occurredOn={}, categoryId={}, groupId={}, merchant={}",
                    email, req.getCompanyId(), companyId, companyIdParam, companyIdSnake, coId, req.getAmount(), req.getCurrency(), req.getOccurredOn(), req.getCategoryId(), req.getGroupId(), req.getMerchant());
        } catch (Exception ignore) {}
        return ResponseEntity.ok(expenseService.create(email, req, coId));
    }

    @GetMapping
    public ResponseEntity<List<ExpenseView>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake
    ) {
        String email = currentEmail();
        Long coId = companyId != null ? companyId : (companyIdParam != null ? companyIdParam : companyIdSnake);
        log.info("[Expenses] list() email={}, X-Company-Id(header)={}, companyId(param)={}, company_id(param)={}, USING coId={}, from={}, to={}",
                email, companyId, companyIdParam, companyIdSnake, coId, from, to);
        return ResponseEntity.ok(expenseService.list(email, from, to, coId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseView> get(
            @PathVariable Long id,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake
    ) {
        String email = currentEmail();
        Long coId = companyId != null ? companyId : (companyIdParam != null ? companyIdParam : companyIdSnake);
        return ResponseEntity.ok(expenseService.get(email, id, coId));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ExpenseView> update(
            @PathVariable Long id,
            @RequestBody ExpenseUpdateRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        return ResponseEntity.ok(expenseService.update(email, id, req, companyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(
            @PathVariable Long id,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        expenseService.delete(email, id, companyId);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping(path = "/{id}/receipts", consumes = {"multipart/form-data"})
    public ResponseEntity<ReceiptView> upload(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
        String email = currentEmail();
        return ResponseEntity.ok(expenseService.uploadReceipt(email, id, file));
    }

    @GetMapping("/{id}/receipts")
    public ResponseEntity<List<ReceiptView>> listReceipts(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(expenseService.listReceipts(email, id));
    }

    @GetMapping("/{id}/splits")
    public ResponseEntity<Map<String, Object>> getSplitShares(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(expenseService.getSplitShares(email, id));
    }

    @PatchMapping("/{id}/group")
    public ResponseEntity<Map<String, Object>> linkExpenseToGroup(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String email = currentEmail();
        Long groupId = payload.get("groupId") != null ? ((Number) payload.get("groupId")).longValue() : null;
        expenseService.linkExpenseToGroup(email, id, groupId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Expense linked to group successfully"));
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<ExpenseView>> searchExpenses(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String merchant,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) java.math.BigDecimal minAmount,
            @RequestParam(required = false) java.math.BigDecimal maxAmount,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            Authentication auth) {
        
        String email = auth.getName();
        Long coId = (companyId != null && companyId > 0) ? companyId : null;
        
        return ResponseEntity.ok(expenseService.searchExpenses(
                email, coId, categoryId, currency, merchant, description,
                minAmount, maxAmount, startDate, endDate
        ));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth != null ? auth.getPrincipal() : null;
        if (principal instanceof UserDetails) {
            String u = ((UserDetails) principal).getUsername();
            return u != null ? u.toLowerCase() : null;
        }
        if (principal instanceof String) {
            String name = (String) principal;
            if (name != null && !name.equalsIgnoreCase("anonymousUser") && !name.isBlank()) {
                return name.toLowerCase();
            }
        }
        String n = auth != null ? auth.getName() : null;
        if (n != null && !n.equalsIgnoreCase("anonymousUser") && !n.isBlank()) {
            return n.toLowerCase();
        }
        return null;
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ExpenseView> approve(
            @PathVariable Long id,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String email = currentEmail();
        if (email == null || email.isBlank() || email.equalsIgnoreCase("anonymousUser")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        Long coId = companyId != null ? companyId : (companyIdParam != null ? companyIdParam : companyIdSnake);
        String notes = body != null ? body.get("notes") : null;
        log.info("[Expenses] Approve request id={}, email={}, companyId={}, notes={}", id, email, coId, notes);
        return ResponseEntity.ok(expenseService.approve(email, id, coId, notes));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ExpenseView> reject(
            @PathVariable Long id,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId,
            @RequestParam(value = "companyId", required = false) Long companyIdParam,
            @RequestParam(value = "company_id", required = false) Long companyIdSnake,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String email = currentEmail();
        if (email == null || email.isBlank() || email.equalsIgnoreCase("anonymousUser")) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        Long coId = companyId != null ? companyId : (companyIdParam != null ? companyIdParam : companyIdSnake);
        String reason = body != null ? body.get("reason") : null;
        log.info("[Expenses] Reject request id={}, email={}, companyId={}, reason={}", id, email, coId, reason);
        return ResponseEntity.ok(expenseService.reject(email, id, coId, reason));
    }
}
