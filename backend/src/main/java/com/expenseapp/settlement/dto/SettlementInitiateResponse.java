package com.expenseapp.settlement.dto;

public class SettlementInitiateResponse {
    private String externalRef;
    private String redirectUrl;

    public SettlementInitiateResponse(String externalRef, String redirectUrl) {
        this.externalRef = externalRef;
        this.redirectUrl = redirectUrl;
    }

    public String getExternalRef() { return externalRef; }
    public String getRedirectUrl() { return redirectUrl; }
}
