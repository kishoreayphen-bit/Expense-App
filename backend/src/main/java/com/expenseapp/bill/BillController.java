package com.expenseapp.bill;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/bills")
@RequiredArgsConstructor
public class BillController {
    
    private final BillService billService;
    
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Bill> uploadBill(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String billNumber,
            @RequestParam(required = false) Long expenseId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String merchant,
            @RequestParam(required = false) String amount,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String billDate,
            @RequestParam(required = false) String notes,
            @RequestParam(required = false, defaultValue = "0") Long companyId,
            Authentication auth) {
        
        BillUploadRequest request = new BillUploadRequest();
        request.setBillNumber(billNumber);
        request.setExpenseId(expenseId);
        request.setCategoryId(categoryId);
        request.setMerchant(merchant);
        if (amount != null) request.setAmount(new java.math.BigDecimal(amount));
        request.setCurrency(currency);
        if (billDate != null) request.setBillDate(LocalDate.parse(billDate));
        request.setNotes(notes);
        
        Long cid = (companyId != null && companyId > 0) ? companyId : null;
        Bill bill = billService.uploadBill(auth.getName(), file, request, cid);
        return ResponseEntity.ok(bill);
    }
    
    @GetMapping
    public ResponseEntity<List<Bill>> listBills(
            @RequestParam(required = false, defaultValue = "0") Long companyId,
            Authentication auth) {
        Long cid = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(billService.listBills(auth.getName(), cid));
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Bill>> searchBills(
            @RequestParam(required = false, defaultValue = "0") Long companyId,
            @RequestParam(required = false) String billNumber,
            @RequestParam(required = false) String merchant,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication auth) {
        
        Long cid = (companyId != null && companyId > 0) ? companyId : null;
        LocalDate start = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate end = endDate != null ? LocalDate.parse(endDate) : null;
        
        return ResponseEntity.ok(billService.searchBills(auth.getName(), cid, billNumber, 
                                                         merchant, categoryId, start, end));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Bill> getBill(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(billService.getBill(id, auth.getName()));
    }
    
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadBill(@PathVariable Long id, Authentication auth) {
        try {
            Bill bill = billService.getBill(id, auth.getName());
            byte[] data = billService.getBillFile(id, auth.getName());
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + bill.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(bill.getMimeType()))
                .body(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBill(@PathVariable Long id, Authentication auth) {
        billService.deleteBill(id, auth.getName());
        return ResponseEntity.ok().build();
    }
}
