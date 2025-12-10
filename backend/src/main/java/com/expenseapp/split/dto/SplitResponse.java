package com.expenseapp.split.dto;

import java.math.BigDecimal;
import java.util.List;

public class SplitResponse {
    public static class Share {
        private Long userId;
        private BigDecimal amount;
        private BigDecimal baseAmount;
        public Share(Long userId, BigDecimal amount, BigDecimal baseAmount) { this.userId = userId; this.amount = amount; this.baseAmount = baseAmount; }
        public Long getUserId() { return userId; }
        public BigDecimal getAmount() { return amount; }
        public BigDecimal getBaseAmount() { return baseAmount; }
    }

    private BigDecimal total;
    private List<Share> shares;
    private BigDecimal baseTotal;
    private String baseCurrency;

    public SplitResponse(BigDecimal total, List<Share> shares, BigDecimal baseTotal, String baseCurrency) {
        this.total = total;
        this.shares = shares;
        this.baseTotal = baseTotal;
        this.baseCurrency = baseCurrency;
    }

    public BigDecimal getTotal() { return total; }
    public List<Share> getShares() { return shares; }
    public BigDecimal getBaseTotal() { return baseTotal; }
    public String getBaseCurrency() { return baseCurrency; }
}
