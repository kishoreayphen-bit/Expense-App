package com.expenseapp.group.dto;

import java.math.BigDecimal;
import java.util.List;

public class GroupLedgerView {
    private Long groupId;
    private List<MemberBalance> balances;

    public GroupLedgerView(Long groupId, List<MemberBalance> balances) {
        this.groupId = groupId; this.balances = balances;
    }

    public Long getGroupId() { return groupId; }
    public List<MemberBalance> getBalances() { return balances; }

    public static class MemberBalance {
        private Long userId;
        private BigDecimal credit; // others owe you
        private BigDecimal debit;  // you owe others
        private BigDecimal net;    // credit - debit
        public MemberBalance(Long userId, BigDecimal credit, BigDecimal debit, BigDecimal net) {
            this.userId = userId; this.credit = credit; this.debit = debit; this.net = net;
        }
        public Long getUserId() { return userId; }
        public BigDecimal getCredit() { return credit; }
        public BigDecimal getDebit() { return debit; }
        public BigDecimal getNet() { return net; }
    }
}
