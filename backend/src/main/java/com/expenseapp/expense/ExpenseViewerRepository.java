package com.expenseapp.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseViewerRepository extends JpaRepository<ExpenseViewer, Long> {
    
    Optional<ExpenseViewer> findByExpenseIdAndUserId(Long expenseId, Long userId);
    
    List<ExpenseViewer> findByExpenseId(Long expenseId);
    
    List<ExpenseViewer> findByUserId(Long userId);
    
    @Query("SELECT ev FROM ExpenseViewer ev WHERE ev.userId = :userId AND ev.canView = true")
    List<ExpenseViewer> findViewableByUser(@Param("userId") Long userId);
    
    @Query("SELECT ev FROM ExpenseViewer ev WHERE ev.userId = :userId AND ev.canApprove = true")
    List<ExpenseViewer> findApprovableByUser(@Param("userId") Long userId);
    
    boolean existsByExpenseIdAndUserIdAndCanViewTrue(Long expenseId, Long userId);
    
    boolean existsByExpenseIdAndUserIdAndCanApproveTrue(Long expenseId, Long userId);
    
    void deleteByExpenseId(Long expenseId);
}
