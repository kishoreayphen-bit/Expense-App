package com.expenseapp.role;

import com.expenseapp.security.CurrentUser;
import com.expenseapp.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {
    
    private final RoleService roleService;
    
    /**
     * Get all roles (ADMIN and above)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<RoleEntity>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }
    
    /**
     * Get role by name
     */
    @GetMapping("/{name}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<RoleEntity> getRoleByName(@PathVariable String name) {
        return ResponseEntity.ok(roleService.getRoleByName(name));
    }
    
    /**
     * Get permissions for a role
     */
    @GetMapping("/{name}/permissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<RolePermission>> getRolePermissions(@PathVariable String name) {
        return ResponseEntity.ok(roleService.getRolePermissions(name));
    }
    
    /**
     * Assign role to user (SUPER_ADMIN only)
     */
    @PostMapping("/assign")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> assignRole(
            @CurrentUser User admin,
            @RequestBody Map<String, Object> request) {
        
        Long userId = Long.valueOf(request.get("userId").toString());
        String roleName = request.get("roleName").toString();
        
        roleService.assignRole(admin.getEmail(), userId, roleName);
        
        return ResponseEntity.ok(Map.of(
            "message", "Role assigned successfully",
            "userId", userId.toString(),
            "role", roleName
        ));
    }
    
    /**
     * Check if current user has permission
     */
    @PostMapping("/check-permission")
    public ResponseEntity<Map<String, Object>> checkPermission(
            @CurrentUser User user,
            @RequestBody Map<String, String> request) {
        
        String permission = request.get("permission");
        boolean hasPermission = roleService.hasPermission(user, permission);
        
        return ResponseEntity.ok(Map.of(
            "hasPermission", hasPermission,
            "permission", permission,
            "role", user.getRole().name()
        ));
    }
    
    /**
     * Check if user can perform action on resource
     */
    @PostMapping("/check-action")
    public ResponseEntity<Map<String, Object>> checkAction(
            @CurrentUser User user,
            @RequestBody Map<String, String> request) {
        
        String action = request.get("action");
        String resourceType = request.get("resourceType");
        
        boolean canPerform = roleService.canPerformAction(user, action, resourceType);
        
        return ResponseEntity.ok(Map.of(
            "canPerform", canPerform,
            "action", action,
            "resourceType", resourceType,
            "role", user.getRole().name()
        ));
    }
}
