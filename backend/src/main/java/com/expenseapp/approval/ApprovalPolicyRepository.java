package com.expenseapp.approval;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalPolicyRepository extends JpaRepository<ApprovalPolicy, Long> {
    ApprovalPolicy findByName(String name);
}
