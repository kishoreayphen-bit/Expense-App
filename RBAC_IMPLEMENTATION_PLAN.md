# 🎯 Role-Based Access Control (RBAC) Implementation Plan

**Date:** November 27, 2025, 3:48 PM IST  
**Objective:** Implement comprehensive RBAC system with 4 roles: EMPLOYEE, MANAGER, ADMIN, SUPER_ADMIN

---

## 📊 Current State Analysis

### **Existing Roles:**
- ✅ `USER` (in `users` table)
- ✅ `MANAGER` (in `users` table)
- ✅ `ADMIN` (in `users` table)
- ✅ `OWNER`, `ADMIN`, `MANAGER`, `EMPLOYEE` (in `company_members` table)

### **Existing Features:**
1. ✅ **Authentication & Authorization** - JWT-based
2. ✅ **Company Management** - Create, join, invite
3. ✅ **Expense Management** - Submit, approve, reject
4. ✅ **Reimbursement System** - Request, approve, track
5. ✅ **Bill Management** - Upload, search, validate
6. ✅ **Budget System** - Create, track, alerts
7. ✅ **Group/Team Management** - Create, chat, split expenses
8. ✅ **Notifications** - Push, in-app
9. ✅ **Reports** - Expense summaries
10. ✅ **Approval Workflows** - Multi-level approvals
11. ✅ **ACL System** - Access control lists

### **Missing Features:**
1. ❌ **Separate Roles Table** - Currently enum-based
2. ❌ **SUPER_ADMIN Role** - Not defined
3. ❌ **Role-based UI Navigation** - All users see same screens
4. ❌ **Admin Dashboard** - Manage users, roles, policies
5. ❌ **Super Admin Dashboard** - System-wide control
6. ❌ **Employee Management Screen** - Add/Edit/Disable
7. ❌ **Role Assignment Screen** - Change user roles
8. ❌ **Policy Configuration Screen** - Expense limits, categories
9. ❌ **Audit Logs Screen** - View all activities
10. ❌ **System Settings Screen** - App configuration

---

## 🎯 Implementation Strategy

### **Phase 1: Database & Backend (Priority 1)**
1. Create `roles` table
2. Add `SUPER_ADMIN` role
3. Create role management APIs
4. Implement permission checks
5. Add audit logging

### **Phase 2: Role-Based APIs (Priority 2)**
1. Employee APIs (existing + enhancements)
2. Manager APIs (approval, team reports)
3. Admin APIs (user management, policies)
4. Super Admin APIs (system control)

### **Phase 3: Frontend Screens (Priority 3)**
1. Role-based navigation
2. Employee screens
3. Manager screens
4. Admin screens
5. Super Admin screens

### **Phase 4: Testing & Refinement (Priority 4)**
1. Test each role workflow
2. Verify permissions
3. Test edge cases
4. Performance optimization

---

## 📋 Detailed Implementation Plan

## **PHASE 1: Database & Backend**

### **Step 1.1: Create Roles Table**

**File:** `backend/src/main/resources/db/migration/V47__create_roles_table.sql`

```sql
-- Create roles table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INT NOT NULL DEFAULT 0, -- Hierarchy: 0=EMPLOYEE, 1=MANAGER, 2=ADMIN, 3=SUPER_ADMIN
    is_system_role BOOLEAN NOT NULL DEFAULT false, -- System roles can't be deleted
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, level, is_system_role) VALUES
('EMPLOYEE', 'Employee', 'Can submit expenses, view own data', 0, true),
('MANAGER', 'Manager', 'Can approve expenses, view team data', 1, true),
('ADMIN', 'Admin', 'Can manage users, configure policies', 2, true),
('SUPER_ADMIN', 'Super Admin', 'Full system access, manage admins', 3, true);

-- Create role_permissions table
CREATE TABLE role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- expense, user, company, etc.
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource_type);

-- Add role_id to users table (keep existing role column for backward compatibility)
ALTER TABLE users ADD COLUMN role_id BIGINT REFERENCES roles(id);

-- Migrate existing roles to new table
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE') WHERE role = 'USER';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'MANAGER') WHERE role = 'MANAGER';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role = 'ADMIN';

-- Add role_id to company_members table
ALTER TABLE company_members ADD COLUMN role_id BIGINT REFERENCES roles(id);

-- Migrate company roles
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE') WHERE role = 'EMPLOYEE';
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'MANAGER') WHERE role = 'MANAGER';
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role = 'ADMIN';
UPDATE company_members SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role = 'OWNER'; -- Map OWNER to ADMIN for now
```

---

### **Step 1.2: Update Role Enum**

**File:** `backend/src/main/java/com/expenseapp/user/Role.java`

```java
package com.expenseapp.user;

public enum Role {
    EMPLOYEE,    // Level 0 - Can submit expenses
    MANAGER,     // Level 1 - Can approve expenses
    ADMIN,       // Level 2 - Can manage users
    SUPER_ADMIN  // Level 3 - Full system access
}
```

---

### **Step 1.3: Create Role Entity**

**File:** `backend/src/main/java/com/expenseapp/role/RoleEntity.java`

```java
package com.expenseapp.role;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "roles")
public class RoleEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String name;
    
    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private Integer level = 0;
    
    @Column(name = "is_system_role", nullable = false)
    private boolean systemRole = false;
    
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
    
    // Getters and setters
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }
    public boolean isSystemRole() { return systemRole; }
    public void setSystemRole(boolean systemRole) { this.systemRole = systemRole; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
```

---

### **Step 1.4: Create Role Repository**

**File:** `backend/src/main/java/com/expenseapp/role/RoleRepository.java`

```java
package com.expenseapp.role;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByName(String name);
    List<RoleEntity> findAllByOrderByLevelAsc();
    List<RoleEntity> findByLevelGreaterThanEqual(Integer level);
    List<RoleEntity> findByLevelLessThanEqual(Integer level);
}
```

---

### **Step 1.5: Create Role Service**

**File:** `backend/src/main/java/com/expenseapp/role/RoleService.java`

```java
package com.expenseapp.role;

import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {
    
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    
    @Transactional(readOnly = true)
    public List<RoleEntity> getAllRoles() {
        return roleRepository.findAllByOrderByLevelAsc();
    }
    
    @Transactional(readOnly = true)
    public RoleEntity getRoleByName(String name) {
        return roleRepository.findByName(name)
            .orElseThrow(() -> new IllegalArgumentException("Role not found: " + name));
    }
    
    @Transactional
    public void assignRole(String adminEmail, Long userId, String roleName) {
        User admin = userRepository.findByEmail(adminEmail)
            .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        // Only SUPER_ADMIN can assign roles
        if (!admin.getRole().name().equals("SUPER_ADMIN")) {
            throw new IllegalArgumentException("Only SUPER_ADMIN can assign roles");
        }
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        RoleEntity role = getRoleByName(roleName);
        
        // Update user role
        user.setRole(com.expenseapp.user.Role.valueOf(roleName));
        userRepository.save(user);
    }
    
    @Transactional(readOnly = true)
    public boolean hasPermission(User user, String permission) {
        // Check if user has specific permission based on role
        String roleName = user.getRole().name();
        
        switch (roleName) {
            case "SUPER_ADMIN":
                return true; // Super admin has all permissions
            case "ADMIN":
                return !permission.startsWith("SUPER_"); // Admin has all except super admin permissions
            case "MANAGER":
                return permission.startsWith("EXPENSE_") || 
                       permission.startsWith("TEAM_") ||
                       permission.equals("VIEW_REPORTS");
            case "EMPLOYEE":
                return permission.startsWith("OWN_EXPENSE_") ||
                       permission.equals("VIEW_OWN_DATA");
            default:
                return false;
        }
    }
}
```

---

## **PHASE 2: Role-Based APIs**

### **Step 2.1: Create Role Controller**

**File:** `backend/src/main/java/com/expenseapp/role/RoleController.java`

```java
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
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<RoleEntity>> getAllRoles() {
        return ResponseEntity.ok(roleService.getAllRoles());
    }
    
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
}
```

---

### **Step 2.2: Create User Management Controller**

**File:** `backend/src/main/java/com/expenseapp/admin/UserManagementController.java`

```java
package com.expenseapp.admin;

import com.expenseapp.security.CurrentUser;
import com.expenseapp.user.User;
import com.expenseapp.user.UserRepository;
import com.expenseapp.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class UserManagementController {
    
    private final UserRepository userRepository;
    
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<User>> getAllUsers(@CurrentUser User admin, Pageable pageable) {
        return ResponseEntity.ok(userRepository.findAll(pageable));
    }
    
    @PatchMapping("/{userId}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> updateUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Role newRole = Role.valueOf(request.get("role"));
        user.setRole(newRole);
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of(
            "message", "User role updated",
            "userId", userId.toString(),
            "role", newRole.name()
        ));
    }
    
    @PatchMapping("/{userId}/disable")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> disableUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Implement disable logic (add enabled field to User entity)
        
        return ResponseEntity.ok(Map.of(
            "message", "User disabled successfully",
            "userId", userId.toString()
        ));
    }
}
```

---

## **PHASE 3: Frontend Implementation**

### **Step 3.1: Create Role Context**

**File:** `mobile/src/context/RoleContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

interface RoleContextType {
  role: Role | null;
  setRole: (role: Role) => void;
  hasPermission: (permission: string) => boolean;
  isEmployee: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role | null>(null);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    const storedRole = await AsyncStorage.getItem('userRole');
    if (storedRole) {
      setRoleState(storedRole as Role);
    }
  };

  const setRole = async (newRole: Role) => {
    setRoleState(newRole);
    await AsyncStorage.setItem('userRole', newRole);
  };

  const hasPermission = (permission: string): boolean => {
    if (!role) return false;

    switch (role) {
      case 'SUPER_ADMIN':
        return true;
      case 'ADMIN':
        return !permission.startsWith('SUPER_');
      case 'MANAGER':
        return permission.startsWith('EXPENSE_') || 
               permission.startsWith('TEAM_') ||
               permission === 'VIEW_REPORTS';
      case 'EMPLOYEE':
        return permission.startsWith('OWN_EXPENSE_') ||
               permission === 'VIEW_OWN_DATA';
      default:
        return false;
    }
  };

  const value = {
    role,
    setRole,
    hasPermission,
    isEmployee: role === 'EMPLOYEE',
    isManager: role === 'MANAGER',
    isAdmin: role === 'ADMIN',
    isSuperAdmin: role === 'SUPER_ADMIN',
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
};
```

---

### **Step 3.2: Update Navigation Based on Role**

**File:** `mobile/src/navigation/index.tsx`

Add role-based screen filtering:

```typescript
const getScreensForRole = (role: string) => {
  const baseScreens = ['Dashboard', 'Profile', 'Notifications'];
  
  switch (role) {
    case 'SUPER_ADMIN':
      return [...baseScreens, 'SuperAdminDashboard', 'ManageAdmins', 'SystemSettings', 'AuditLogs', 'ManageUsers', 'Policies', 'Reports', 'Approvals', 'TeamExpenses', 'Expenses', 'AddExpense'];
    case 'ADMIN':
      return [...baseScreens, 'AdminDashboard', 'ManageUsers', 'Policies', 'Reports', 'Approvals', 'TeamExpenses', 'Expenses', 'AddExpense'];
    case 'MANAGER':
      return [...baseScreens, 'ManagerDashboard', 'Approvals', 'TeamExpenses', 'Reports', 'Expenses', 'AddExpense'];
    case 'EMPLOYEE':
      return [...baseScreens, 'Expenses', 'AddExpense', 'MyReimbursements'];
    default:
      return baseScreens;
  }
};
```

---

## **Implementation Timeline**

### **Week 1: Database & Core Backend**
- Day 1-2: Create roles table, migrate data
- Day 3-4: Update Role enum, create entities
- Day 5: Create role service and repository

### **Week 2: APIs & Permissions**
- Day 1-2: Role management APIs
- Day 3-4: User management APIs
- Day 5: Permission checks across existing APIs

### **Week 3: Frontend Foundation**
- Day 1-2: Role context and hooks
- Day 3-4: Update navigation
- Day 5: Update existing screens for role checks

### **Week 4: New Screens**
- Day 1-2: Admin dashboard and user management
- Day 3-4: Super admin screens
- Day 5: Testing and refinement

---

## **Testing Checklist**

### **Employee Tests:**
- ✅ Can submit expenses
- ✅ Can view own expenses
- ✅ Can upload bills
- ✅ Can view reimbursement status
- ❌ Cannot approve expenses
- ❌ Cannot view other users' data
- ❌ Cannot access admin screens

### **Manager Tests:**
- ✅ All employee capabilities
- ✅ Can approve/reject expenses
- ✅ Can view team expenses
- ✅ Can access team reports
- ❌ Cannot manage users
- ❌ Cannot access admin screens

### **Admin Tests:**
- ✅ All manager capabilities
- ✅ Can manage users (add/edit/disable)
- ✅ Can assign roles (except SUPER_ADMIN)
- ✅ Can configure policies
- ✅ Can view all expenses
- ❌ Cannot create other admins
- ❌ Cannot access super admin screens

### **Super Admin Tests:**
- ✅ All admin capabilities
- ✅ Can create/manage admins
- ✅ Can assign any role
- ✅ Can access system settings
- ✅ Can view audit logs
- ✅ Full system access

---

**This is a comprehensive plan. Should I start implementing Phase 1 (Database & Backend)?**
