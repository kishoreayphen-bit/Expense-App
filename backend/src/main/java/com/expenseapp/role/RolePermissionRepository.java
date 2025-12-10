package com.expenseapp.role;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    
    List<RolePermission> findByRole(RoleEntity role);
    
    List<RolePermission> findByRoleId(Long roleId);
    
    Optional<RolePermission> findByRoleAndPermissionNameAndResourceType(
        RoleEntity role, String permissionName, String resourceType);
    
    List<RolePermission> findByResourceType(String resourceType);
    
    boolean existsByRoleAndPermissionName(RoleEntity role, String permissionName);
}
