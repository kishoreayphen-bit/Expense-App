package com.expenseapp.approval;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/approvals")
public class ApprovalMaintenanceController {

    private final ApprovalService approvalService;

    public ApprovalMaintenanceController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping("/escalate-pending")
    public ResponseEntity<Integer> escalatePending() {
        int count = approvalService.escalatePendingPastSla();
        return ResponseEntity.ok(count);
    }

    @PostMapping("/escalate-steps")
    public ResponseEntity<Integer> escalateSteps() {
        int count = approvalService.escalatePendingStepsPastSla();
        return ResponseEntity.ok(count);
    }
}
