package com.expenseapp.receipt.dto;

import java.math.BigDecimal;

public class ApplyReceiptFieldsRequest {
    private String merchant;
    private BigDecimal amount;
    private String date; // ISO yyyy-MM-dd

    public String getMerchant() { return merchant; }
    public void setMerchant(String merchant) { this.merchant = merchant; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
