package com.expenseapp.settlement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementReceiptRepository extends JpaRepository<SettlementReceipt, Long> {
    List<SettlementReceipt> findAllBySettlement(Settlement settlement);
}
