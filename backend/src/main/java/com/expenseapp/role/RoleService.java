package com.expenseapp.role;

import com.expenseapp.audit.AuditLogService;
import com.expenseapp.user.Role;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService {
    
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    
    /**
     * Get all roles ordered by level
     */
    @Transactional(readOnly = true)
    public List<RoleEntity> getAllRoles() {
        return roleRepository.findAllByOrderByLevelAsc();
    }
    
    /**
     * Get role by name
     */
    @Transactional(readOnly = true)
    public RoleEntity getRoleByName(String name) {
        return roleRepository.findByName(name)
            .orElseThrow(() -> new IllegalArgumentException("Role not found: " + name));
    }
    
    /**
     * Get role by ID
     */
    @Transactional(readOnly = true)
    public RoleEntity getRoleById(Long id) {
        return roleRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Role not found with ID: " + id));
    }
    
    /**
     * Assign role to user (SUPER_ADMIN only)
     */
    @Transactional
    public void assignRole(String adminEmail, Long userId, String roleName) {
        User admin = userRepository.findByEmail(adminEmail)
            .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        // Only SUPER_ADMIN can assign roles
        if (!admin.getRole().name().equals("SUPER_ADMIN")) {
            log.warn("User {} attempted to assign role but is not SUPER_ADMIN", adminEmail);
            throw new IllegalArgumentException("Only SUPER_ADMIN can assign roles");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Verify role exists
        getRoleByName(roleName);
        
        // Store old role for audit
        String oldRole = user.getRole().name();
        
        // Update user role
        user.setRole(Role.valueOf(roleName));
        userRepository.save(user);
        
        // Log the action
        auditLogService.log(
            adminEmail,
            "ASSIGN_ROLE",
            "user",
            userId,
            oldRole,
            roleName,
            null
        );
        
        log.info("Role assigned: User {} changed from {} to {} by {}", 
            user.getEmail(), oldRole, roleName, adminEmail);
    }
    
    /**
     * Check if user has specific permission
     */
    @Transactional(readOnly = true)
    public boolean hasPermission(User user, String permission) {
        if (user == null) {
            return false;
        }
        
        String roleName = user.getRole().name();
        
        // SUPER_ADMIN has all permissions
        if ("SUPER_ADMIN".equals(roleName)) {
            return true;
        }
        
        // ADMIN has all permissions except SUPER_ADMIN specific ones
        if ("ADMIN".equals(roleName)) {
            return !permission.startsWith("SUPER_");
        }
        
        // MANAGER permissions
        if ("MANAGER".equals(roleName)) {
            return permission.startsWith("EXPENSE_") || 
                   permission.startsWith("TEAM_") ||
                   permission.startsWith("REIMBURSEMENT_") ||
                   permission.equals("VIEW_REPORTS") ||
                   permission.equals("APPROVE_EXPENSES") ||
                   permission.equals("VIEW_TEAM_DATA");
        }
        
        // EMPLOYEE permissions
        if ("EMPLOYEE".equals(roleName) || "USER".equals(roleName)) {
            return permission.startsWith("OWN_EXPENSE_") ||
                   permission.equals("VIEW_OWN_DATA") ||
                   permission.equals("SUBMIT_EXPENSE") ||
                   permission.equals("UPLOAD_BILL") ||
                   permission.equals("REQUEST_REIMBURSEMENT");
        }
        
        return false;
    }
    
    /**
     * Check if user can perform action on resource
     */
    @Transactional(readOnly = true)
    public boolean canPerformAction(User user, String action, String resourceType) {
        if (user == null) {
            return false;
        }
        
        String roleName = user.getRole().name();
        RoleEntity role = roleRepository.findByName(roleName).orElse(null);
        
        if (role == null) {
            return false;
        }
        
        // SUPER_ADMIN can do everything
        if (role.getLevel() >= 3) {
            return true;
        }
        
        // Check specific permissions
        List<RolePermission> permissions = rolePermissionRepository.findByRoleId(role.getId());
        
        for (RolePermission perm : permissions) {
            if (perm.getResourceType() == null || perm.getResourceType().equals(resourceType)) {
                switch (action.toUpperCase()) {
                    case "CREATE":
                        if (perm.isCanCreate()) return true;
                        break;
                    case "READ":
                        if (perm.isCanRead()) return true;
                        break;
                    case "UPDATE":
                        if (perm.isCanUpdate()) return true;
                        break;
                    case "DELETE":
                        if (perm.isCanDelete()) return true;
                        break;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Get permissions for a role
     */
    @Transactional(readOnly = true)
    public List<RolePermission> getRolePermissions(String roleName) {
        RoleEntity role = getRoleByName(roleName);
        return rolePermissionRepository.findByRoleId(role.getId());
    }
    
    /**
     * Check if user is at least a certain role level
     */
    @Transactional(readOnly = true)
    public boolean isAtLeastRole(User user, String minRoleName) {
        if (user == null) {
            return false;
        }
        
        RoleEntity userRole = roleRepository.findByName(user.getRole().name()).orElse(null);
        RoleEntity minRole = roleRepository.findByName(minRoleName).orElse(null);
        
        if (userRole == null || minRole == null) {
            return false;
        }
        
        return userRole.getLevel() >= minRole.getLevel();
    }
    
    /**
     * Get users by role
     * TODO: Add findByRole method to UserRepository
     */
    // @Transactional(readOnly = true)
    // public List<User> getUsersByRole(String roleName) {
    //     Role role = Role.valueOf(roleName);
    //     return userRepository.findByRole(role);
    // }
}
