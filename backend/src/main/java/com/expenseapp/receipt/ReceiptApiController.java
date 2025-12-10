package com.expenseapp.receipt;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/receipts-api")
public class ReceiptApiController {

    private final ReceiptService receiptService;

    public ReceiptApiController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @GetMapping("/expenses/{expenseId}/receipts")
    public ResponseEntity<List<Receipt>> listByExpense(@PathVariable Long expenseId) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.listByExpense(email, expenseId));
    }

    @GetMapping("/receipts/{id}/pages")
    public ResponseEntity<List<ReceiptPage>> listPages(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.listPages(email, id));
    }

    @GetMapping("/receipts/{id}/presign-download")
    public ResponseEntity<com.expenseapp.receipt.dto.PresignResponse> presignDownload(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.presignDownload(email, id));
    }

    @GetMapping("/receipts/{id}/presign-upload")
    public ResponseEntity<com.expenseapp.receipt.dto.PresignResponse> presignUpload(@PathVariable Long id,
                                                                                    @RequestParam String fileName,
                                                                                    @RequestParam(required = false) String contentType,
                                                                                    @RequestParam(required = false) Long fileSize) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.presignUpload(email, id, fileName, contentType, fileSize));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
