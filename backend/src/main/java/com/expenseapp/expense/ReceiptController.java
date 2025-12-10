package com.expenseapp.expense;

import com.expenseapp.expense.dto.ReceiptView;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.context.annotation.Profile;

@Profile("legacy")
@RestController("expenseReceiptController")
@RequestMapping("/api/v1/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @PostMapping("/{id}/ocr")
    public ResponseEntity<ReceiptView> processOcr(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.processOcr(email, id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReceiptView> get(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.getReceipt(email, id));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
