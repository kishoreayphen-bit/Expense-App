package com.expenseapp.approval;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/approvals/policies")
public class ApprovalPolicyController {

    private final ApprovalPolicyService policyService;

    public ApprovalPolicyController(ApprovalPolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping
    public ResponseEntity<ApprovalPolicy> getDefault() {
        return ResponseEntity.ok(policyService.getDefaultPolicy());
    }

    @PutMapping
    public ResponseEntity<ApprovalPolicy> update(@RequestBody String rulesJson) {
        return ResponseEntity.ok(policyService.updateDefaultPolicy(rulesJson));
    }

    @GetMapping("/preview")
    public ResponseEntity<List<ApprovalPolicyService.StepPlan>> preview(@RequestParam Long expenseId) {
        return ResponseEntity.ok(policyService.previewStepsForExpense(expenseId));
    }
}
