package com.expenseapp.settlement.dto;

import java.math.BigDecimal;
import java.util.List;

public class NetBalancesView {
    public static class Pair {
        private Long counterpartyId;
        private BigDecimal credit; // they owe you
        private BigDecimal debit;  // you owe them
        private BigDecimal net;    // credit - debit
        public Pair(Long counterpartyId, BigDecimal credit, BigDecimal debit, BigDecimal net) {
            this.counterpartyId = counterpartyId; this.credit = credit; this.debit = debit; this.net = net;
        }
        public Long getCounterpartyId() { return counterpartyId; }
        public BigDecimal getCredit() { return credit; }
        public BigDecimal getDebit() { return debit; }
        public BigDecimal getNet() { return net; }
    }

    private List<Pair> pairs;

    public NetBalancesView(List<Pair> pairs) {
        this.pairs = pairs;
    }

    public List<Pair> getPairs() { return pairs; }
}
