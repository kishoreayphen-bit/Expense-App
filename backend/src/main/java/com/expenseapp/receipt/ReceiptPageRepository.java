package com.expenseapp.receipt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReceiptPageRepository extends JpaRepository<ReceiptPage, Long> {
    List<ReceiptPage> findAllByReceiptOrderByPageNumber(Receipt receipt);
}
