package com.expenseapp.acl;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ACLEntryRepository extends JpaRepository<ACLEntry, Long> {
    List<ACLEntry> findAllByResourceTypeAndResourceId(String resourceType, Long resourceId);
    Optional<ACLEntry> findByResourceTypeAndResourceIdAndPrincipalTypeAndPrincipalIdAndPermission(String resourceType, Long resourceId, String principalType, Long principalId, String permission);
    List<ACLEntry> findAllByPrincipalTypeAndPrincipalId(String principalType, Long principalId);
}
