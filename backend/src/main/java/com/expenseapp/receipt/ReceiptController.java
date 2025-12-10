package com.expenseapp.receipt;

import com.expenseapp.receipt.dto.ReceiptCreateRequest;
import com.expenseapp.receipt.dto.ApplyReceiptFieldsRequest;
import com.expenseapp.receipt.dto.ReceiptPageCreateRequest;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/v1/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;

    public ReceiptController(ReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @PostMapping
    public ResponseEntity<Receipt> create(@Valid @RequestBody ReceiptCreateRequest req) {
        String email = currentEmail();
        return ResponseEntity.ok(
                receiptService.create(email, req.getExpenseId(), req.getFileName(), req.getContentType(), req.getFileSize())
        );
    }

    @GetMapping
    public ResponseEntity<List<Receipt>> list(@RequestParam Long expenseId) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.listByExpense(email, expenseId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Receipt> get(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.get(email, id));
    }

    @PostMapping("/{id}/scan")
    public ResponseEntity<OCRJob> scan(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.startScan(email, id));
    }

    @PutMapping("/{id}/apply")
    public ResponseEntity<Receipt> apply(@PathVariable Long id, @Valid @RequestBody ApplyReceiptFieldsRequest req) {
        String email = currentEmail();
        Receipt r = receiptService.applyFields(email, id, req.getMerchant(), req.getAmount(), req.getDate());
        return ResponseEntity.ok(r);
    }

    @PostMapping("/{id}/pages")
    public ResponseEntity<ReceiptPage> addPage(@PathVariable Long id, @Valid @RequestBody ReceiptPageCreateRequest req) {
        String email = currentEmail();
        ReceiptPage page = receiptService.addPage(email, id, req.getFileName(), req.getContentType(), req.getFileSize());
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}/pages")
    public ResponseEntity<List<ReceiptPage>> listPages(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.listPages(email, id));
    }

    @GetMapping("/{id}/presign-download")
    public ResponseEntity<com.expenseapp.receipt.dto.PresignResponse> presignDownload(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.presignDownload(email, id));
    }

    @PostMapping("/{id}/presign-upload")
    public ResponseEntity<com.expenseapp.receipt.dto.PresignResponse> presignUpload(@PathVariable Long id,
                                                                                     @RequestParam String fileName,
                                                                                     @RequestParam(required = false) String contentType,
                                                                                     @RequestParam(required = false) Long fileSize) {
        String email = currentEmail();
        return ResponseEntity.ok(receiptService.presignUpload(email, id, fileName, contentType, fileSize));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadReceipt(@PathVariable Long id) {
        try {
            String email = currentEmail();
            Receipt receipt = receiptService.get(email, id);
            
            // Construct the file path - receipts are stored in storage/receipts/{userId}/{fileName}
            // We need to get the user ID from the expense
            Long userId = receipt.getExpense().getUser().getId();
            Path filePath = Paths.get("storage", "receipts", String.valueOf(userId), receipt.getFileName());
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists() && resource.isReadable()) {
                String contentType = receipt.getContentType() != null ? receipt.getContentType() : "application/octet-stream";
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + receipt.getFileName() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
