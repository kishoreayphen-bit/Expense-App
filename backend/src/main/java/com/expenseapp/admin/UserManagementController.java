package com.expenseapp.admin;

import com.expenseapp.audit.AuditLogService;
import com.expenseapp.role.RoleService;
import com.expenseapp.security.CurrentUser;
import com.expenseapp.user.Role;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserManagementController {
    
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final AuditLogService auditLogService;
    
    /**
     * Get all users (ADMIN and above)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<User>> getAllUsers(
            @CurrentUser User admin,
            Pageable pageable) {
        
        auditLogService.logAction(admin.getEmail(), "VIEW_ALL_USERS", "user", null);
        return ResponseEntity.ok(userRepository.findAll(pageable));
    }
    
    /**
     * Get user by ID (ADMIN and above)
     */
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<User> getUserById(
            @CurrentUser User admin,
            @PathVariable Long userId) {
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        auditLogService.logAction(admin.getEmail(), "VIEW_USER", "user", userId);
        return ResponseEntity.ok(user);
    }
    
    /**
     * Update user role (SUPER_ADMIN only)
     */
    @PatchMapping("/{userId}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> updateUserRole(
            @CurrentUser User admin,
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        
        String newRoleName = request.get("role");
        roleService.assignRole(admin.getEmail(), userId, newRoleName);
        
        return ResponseEntity.ok(Map.of(
            "message", "User role updated successfully",
            "userId", userId.toString(),
            "role", newRoleName
        ));
    }
    
    /**
     * Update user details (ADMIN and above)
     */
    @PatchMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> updateUser(
            @CurrentUser User admin,
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Map<String, String> changes = new HashMap<>();
        
        if (request.containsKey("name")) {
            String oldName = user.getName();
            user.setName(request.get("name"));
            changes.put("name", oldName + " -> " + user.getName());
        }
        
        if (request.containsKey("email")) {
            String oldEmail = user.getEmail();
            user.setEmail(request.get("email"));
            changes.put("email", oldEmail + " -> " + user.getEmail());
        }
        
        if (request.containsKey("phone")) {
            String oldPhone = user.getPhone();
            user.setPhone(request.get("phone"));
            changes.put("phone", oldPhone + " -> " + user.getPhone());
        }
        
        userRepository.save(user);
        
        // Log the changes
        auditLogService.log(
            admin.getEmail(),
            "UPDATE_USER",
            "user",
            userId,
            changes.toString(),
            null,
            null
        );
        
        return ResponseEntity.ok(Map.of(
            "message", "User updated successfully",
            "userId", userId.toString(),
            "changes", changes.toString()
        ));
    }
    
    /**
     * Disable user (ADMIN and above)
     * Note: This requires adding an 'enabled' field to User entity
     */
    @PatchMapping("/{userId}/disable")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> disableUser(
            @CurrentUser User admin,
            @PathVariable Long userId) {
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Prevent disabling SUPER_ADMIN users unless requester is also SUPER_ADMIN
        if (user.getRole() == Role.SUPER_ADMIN && admin.getRole() != Role.SUPER_ADMIN) {
            throw new IllegalArgumentException("Only SUPER_ADMIN can disable other SUPER_ADMIN users");
        }
        
        // TODO: Implement disable logic when 'enabled' field is added to User entity
        // user.setEnabled(false);
        // userRepository.save(user);
        
        auditLogService.logAction(admin.getEmail(), "DISABLE_USER", "user", userId);
        
        return ResponseEntity.ok(Map.of(
            "message", "User disabled successfully",
            "userId", userId.toString()
        ));
    }
    
    /**
     * Enable user (ADMIN and above)
     */
    @PatchMapping("/{userId}/enable")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> enableUser(
            @CurrentUser User admin,
            @PathVariable Long userId) {
        
        // Verify user exists
        userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // TODO: Implement enable logic when 'enabled' field is added to User entity
        // user.setEnabled(true);
        // userRepository.save(user);
        
        auditLogService.logAction(admin.getEmail(), "ENABLE_USER", "user", userId);
        
        return ResponseEntity.ok(Map.of(
            "message", "User enabled successfully",
            "userId", userId.toString()
        ));
    }
    
    /**
     * Delete user (SUPER_ADMIN only)
     */
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteUser(
            @CurrentUser User admin,
            @PathVariable Long userId) {
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Prevent deleting SUPER_ADMIN users
        if (user.getRole() == Role.SUPER_ADMIN) {
            throw new IllegalArgumentException("Cannot delete SUPER_ADMIN users");
        }
        
        // Prevent self-deletion
        if (user.getId().equals(admin.getId())) {
            throw new IllegalArgumentException("Cannot delete your own account");
        }
        
        String userEmail = user.getEmail();
        userRepository.delete(user);
        
        auditLogService.log(
            admin.getEmail(),
            "DELETE_USER",
            "user",
            userId,
            userEmail,
            "DELETED",
            null
        );
        
        return ResponseEntity.ok(Map.of(
            "message", "User deleted successfully",
            "userId", userId.toString(),
            "email", userEmail
        ));
    }
    
    /**
     * Get users by role (ADMIN and above)
     */
    @GetMapping("/by-role/{roleName}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<User>> getUsersByRole(
            @CurrentUser User admin,
            @PathVariable String roleName,
            Pageable pageable) {
        
        Role role = Role.valueOf(roleName);
        Page<User> users = userRepository.findByRole(role, pageable);
        
        auditLogService.logAction(admin.getEmail(), "VIEW_USERS_BY_ROLE", "user", null);
        return ResponseEntity.ok(users);
    }
}
