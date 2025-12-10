package com.expenseapp.approval;

import com.expenseapp.approval.dto.SubmitApprovalRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping("/submit")
    public ResponseEntity<Approval> submit(
            @Valid @RequestBody SubmitApprovalRequest req,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(approvalService.submit(email, req.getExpenseId(), req.getApproverId(), normalizedCompanyId));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<Approval> approve(
            @PathVariable Long id,
            @RequestBody(required = false) String notes,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(approvalService.approve(email, id, notes, normalizedCompanyId));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<Approval> reject(
            @PathVariable Long id,
            @RequestBody(required = false) String notes,
            @RequestHeader(value = "X-Company-Id", required = false) Long companyId
    ) {
        String email = currentEmail();
        Long normalizedCompanyId = (companyId != null && companyId > 0) ? companyId : null;
        return ResponseEntity.ok(approvalService.reject(email, id, notes, normalizedCompanyId));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<Approval>> myRequests() {
        String email = currentEmail();
        return ResponseEntity.ok(approvalService.myRequests(email));
    }

    @GetMapping("/to-approve")
    public ResponseEntity<List<Approval>> toApprove() {
        String email = currentEmail();
        return ResponseEntity.ok(approvalService.toApprove(email));
    }

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((UserDetails) auth.getPrincipal()).getUsername();
    }
}
