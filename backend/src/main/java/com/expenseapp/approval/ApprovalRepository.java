package com.expenseapp.approval;

import com.expenseapp.expense.Expense;
import com.expenseapp.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ApprovalRepository extends JpaRepository<Approval, Long> {
    List<Approval> findAllByRequester(User requester);
    List<Approval> findAllByApprover(User approver);
    Approval findByExpense(Expense expense);
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM approvals WHERE status = 'PENDING' AND sla_due_at IS NOT NULL AND sla_due_at < NOW()", nativeQuery = true)
    List<Approval> findPendingPastSla();

    @Query(value = "SELECT COUNT(1) FROM approvals a WHERE a.approver_id = :approverId AND a.status = 'PENDING'", nativeQuery = true)
    long countPendingForApprover(Long approverId);
}
