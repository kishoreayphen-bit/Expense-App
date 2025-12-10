package com.expenseapp.approval.dto;

import jakarta.validation.constraints.NotNull;

public class SubmitApprovalRequest {
    @NotNull
    private Long expenseId;
    private Long approverId; // optional explicit approver

    public Long getExpenseId() { return expenseId; }
    public void setExpenseId(Long expenseId) { this.expenseId = expenseId; }
    public Long getApproverId() { return approverId; }
    public void setApproverId(Long approverId) { this.approverId = approverId; }
}
