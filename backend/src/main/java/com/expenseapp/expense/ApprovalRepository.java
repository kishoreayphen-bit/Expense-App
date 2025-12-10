package com.expenseapp.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface ApprovalRepository extends JpaRepository<Approval, Long> {
    @Query(value = "SELECT COUNT(1) FROM approvals a WHERE a.approver_id = :approverId AND a.status = 'PENDING'", nativeQuery = true)
    long countPendingForApprover(Long approverId);
}
