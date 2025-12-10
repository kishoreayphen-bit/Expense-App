package com.expenseapp.approval;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalAuditRepository extends JpaRepository<ApprovalAudit, Long> {
}
