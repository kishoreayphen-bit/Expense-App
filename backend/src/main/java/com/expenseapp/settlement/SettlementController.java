package com.expenseapp.settlement;

import com.expenseapp.settlement.dto.NetBalancesView;
import com.expenseapp.settlement.dto.SettlementCreateRequest;
import com.expenseapp.settlement.dto.SettlementInitiateResponse;
import com.expenseapp.settlement.dto.SettlementWebhookRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/settlements")
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @GetMapping("/net")
    public ResponseEntity<NetBalancesView> net(
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(settlementService.netBalances(email, normalizedCompanyId));
    }

    @PostMapping
    public ResponseEntity<Settlement> create(
            @Valid @RequestBody SettlementCreateRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        Settlement s = settlementService.create(email, req.getPayeeId(), req.getAmount(), req.getGroupId(), normalizedCompanyId);
        return ResponseEntity.ok(s);
    }

    @PostMapping("/initiate")
    public ResponseEntity<SettlementInitiateResponse> initiate(
            @Valid @RequestBody SettlementCreateRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(settlementService.initiate(email, req.getPayeeId(), req.getAmount(), req.getGroupId(), normalizedCompanyId));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody SettlementWebhookRequest req) {
        settlementService.processWebhook(req.getExternalRef(), req.getStatus());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<Settlement> confirm(
            @PathVariable Long id,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(settlementService.confirm(email, id, normalizedCompanyId));
    }

    @GetMapping
    public ResponseEntity<List<Settlement>> listMine(
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(settlementService.listMine(email, normalizedCompanyId));
    }

    @PostMapping(path = "/{id}/receipts", consumes = {"multipart/form-data"})
    public ResponseEntity<String> uploadReceipt(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
        String email = currentEmail();
        String uri = settlementService.uploadReceipt(email, id, file);
        return ResponseEntity.ok(uri);
    }

    @GetMapping("/{id}/receipts")
    public ResponseEntity<List<String>> listReceipts(@PathVariable Long id) {
        String email = currentEmail();
        return ResponseEntity.ok(settlementService.listReceipts(email, id));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
