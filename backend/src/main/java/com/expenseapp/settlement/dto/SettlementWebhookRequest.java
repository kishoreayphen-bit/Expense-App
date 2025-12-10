package com.expenseapp.settlement.dto;

public class SettlementWebhookRequest {
    private String externalRef;
    private String status; // SUCCESS | FAILED | CANCELLED

    public String getExternalRef() { return externalRef; }
    public void setExternalRef(String externalRef) { this.externalRef = externalRef; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
