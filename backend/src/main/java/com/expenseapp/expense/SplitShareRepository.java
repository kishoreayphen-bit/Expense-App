package com.expenseapp.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface SplitShareRepository extends JpaRepository<SplitShare, Long> {
    @Query(value = "SELECT COUNT(1) FROM split_shares s WHERE s.user_id = :userId AND s.status = 'PENDING'", nativeQuery = true)
    long countPendingForUser(Long userId);
    
    List<SplitShare> findByExpenseId(Long expenseId);
}
