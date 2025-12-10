package com.expenseapp.approval;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, Long> {
    List<ApprovalStep> findByApprovalOrderByStepOrder(Approval approval);

    @Query("SELECT s FROM ApprovalStep s WHERE s.approval = :approval AND s.status = 'PENDING' ORDER BY s.stepOrder")
    List<ApprovalStep> findPendingStepsOrdered(Approval approval);

    @Query(value = "SELECT * FROM approval_steps WHERE status = 'PENDING' AND sla_due_at IS NOT NULL AND sla_due_at < NOW()", nativeQuery = true)
    List<ApprovalStep> findPendingPastSla();
}
