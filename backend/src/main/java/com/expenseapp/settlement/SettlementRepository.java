package com.expenseapp.settlement;

import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findAllByPayerOrPayee(User payer, User payee);
    java.util.Optional<Settlement> findByExternalRef(String externalRef);

    @org.springframework.data.jpa.repository.Query(value = "SELECT payee_id, COALESCE(SUM(amount),0) FROM settlements WHERE payer_id = :userId AND status = 'CONFIRMED' GROUP BY payee_id", nativeQuery = true)
    java.util.List<Object[]> confirmedPaidByUser(Long userId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT payer_id, COALESCE(SUM(amount),0) FROM settlements WHERE payee_id = :userId AND status = 'CONFIRMED' GROUP BY payer_id", nativeQuery = true)
    java.util.List<Object[]> confirmedReceivedByUser(Long userId);
}
