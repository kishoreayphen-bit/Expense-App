# 🧪 RBAC System - Complete Testing Guide

**Date:** November 27, 2025, 4:15 PM IST  
**Status:** Ready for Testing

---

## 🎯 **What to Test**

### **1. Role Assignment & Persistence**
### **2. Permission Checks**
### **3. UI Rendering Based on Role**
### **4. Admin Dashboard**
### **5. User Management**
### **6. Navigation Filtering**

---

## 📋 **Test Scenarios**

### **Scenario 1: EMPLOYEE Role**

**Setup:**
1. Login as a regular user
2. User should have EMPLOYEE role by default

**Expected Behavior:**
- ✅ Can see: Dashboard, Expenses, Budgets, FX, Groups, Bills, Profile
- ❌ Cannot see: Claims tab, Admin tab
- ✅ Can submit expenses
- ✅ Can upload bills
- ✅ Can view own data
- ❌ Cannot approve expenses
- ❌ Cannot access admin features

**Test Steps:**
```
1. Login with employee credentials
2. Check bottom tabs - should NOT see "Claims" or "Admin"
3. Try to add expense - should work
4. Try to upload bill - should work
5. Check if role persists after app restart
```

---

### **Scenario 2: MANAGER Role**

**Setup:**
1. Assign MANAGER role to user via API or Super Admin
2. Login as manager

**Expected Behavior:**
- ✅ Can see: All EMPLOYEE tabs + Claims tab (in company mode)
- ❌ Cannot see: Admin tab
- ✅ Can approve/reject expenses
- ✅ Can view team data
- ✅ Can access reimbursement claims
- ❌ Cannot manage users
- ❌ Cannot assign roles

**Test Steps:**
```
1. Login as manager
2. Switch to company mode
3. Check bottom tabs - should see "Claims" but NOT "Admin"
4. Go to Claims screen
5. Try to approve/reject expenses - should work
6. Try to access Admin Dashboard - should be blocked
```

---

### **Scenario 3: ADMIN Role**

**Setup:**
1. Assign ADMIN role to user
2. Login as admin

**Expected Behavior:**
- ✅ Can see: All MANAGER tabs + Admin tab
- ✅ Can access Admin Dashboard
- ✅ Can view all users
- ✅ Can update user details
- ✅ Can disable/enable users
- ❌ Cannot assign roles (SUPER_ADMIN only)
- ❌ Cannot delete users (SUPER_ADMIN only)

**Test Steps:**
```
1. Login as admin
2. Check bottom tabs - should see "Admin" tab
3. Tap Admin tab - should open Admin Dashboard
4. View user statistics
5. Go to User Management
6. Search for users - should work
7. Try to change user role - should be blocked
8. Try to update user name - should work
```

---

### **Scenario 4: SUPER_ADMIN Role**

**Setup:**
1. Assign SUPER_ADMIN role to user
2. Login as super admin

**Expected Behavior:**
- ✅ Can see: All tabs including Admin
- ✅ Full access to Admin Dashboard
- ✅ Can assign any role to any user
- ✅ Can delete users
- ✅ Can view audit logs
- ✅ Can access all system features

**Test Steps:**
```
1. Login as super admin
2. Check bottom tabs - should see "Admin" tab
3. Go to Admin Dashboard
4. Click "Manage Users"
5. Select a user
6. Change their role - should work
7. Try all role options (EMPLOYEE, MANAGER, ADMIN, SUPER_ADMIN)
8. Verify role change is reflected
9. Check audit logs (when implemented)
```

---

## 🔧 **How to Assign Roles**

### **Method 1: Via API (Postman/cURL)**

```bash
# Login first to get token
POST http://localhost:18080/api/v1/auth/login
{
  "email": "admin@demo.local",
  "password": "password"
}

# Assign role (SUPER_ADMIN only)
POST http://localhost:18080/api/v1/roles/assign
Authorization: Bearer {your_token}
{
  "userId": 5,
  "roleName": "MANAGER"
}
```

### **Method 2: Via Database**

```sql
-- Connect to database
docker exec expense_postgres psql -U expense_user -d expenses

-- View current users and roles
SELECT id, email, role FROM users;

-- Update user role
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';

-- Verify
SELECT id, email, role FROM users WHERE email = 'user@example.com';
```

### **Method 3: Via Mobile App (SUPER_ADMIN only)**

```
1. Login as SUPER_ADMIN
2. Go to Admin tab
3. Tap "Manage Users"
4. Find user
5. Tap edit icon
6. Select new role
7. Confirm
```

---

## 🎨 **UI Testing Checklist**

### **Bottom Navigation Tabs:**
- [ ] EMPLOYEE sees: Dashboard, Expenses, Budgets, FX, Groups, Bills, Profile
- [ ] MANAGER sees: + Claims (in company mode)
- [ ] ADMIN sees: + Admin tab
- [ ] SUPER_ADMIN sees: All tabs

### **Admin Dashboard:**
- [ ] Stats cards show correct numbers
- [ ] Quick actions are clickable
- [ ] Recent users list displays
- [ ] Role badges show correct colors
- [ ] Navigation to User Management works
- [ ] Refresh works

### **User Management:**
- [ ] User list loads
- [ ] Search works
- [ ] Filter by role works
- [ ] User cards display correctly
- [ ] Role badges show
- [ ] Edit button visible for SUPER_ADMIN
- [ ] Role change works (SUPER_ADMIN only)

### **Permission Gates:**
- [ ] Components hidden when no permission
- [ ] Components shown when has permission
- [ ] Fallback content works

---

## 🔒 **Security Testing**

### **Test Unauthorized Access:**

**1. Try to access admin endpoints without permission:**
```bash
# As EMPLOYEE, try to get all users
GET /api/v1/admin/users
# Should return 403 Forbidden
```

**2. Try to assign roles as non-SUPER_ADMIN:**
```bash
# As ADMIN, try to assign role
POST /api/v1/roles/assign
# Should return 403 Forbidden
```

**3. Try to delete users as ADMIN:**
```bash
# As ADMIN, try to delete user
DELETE /api/v1/admin/users/5
# Should return 403 Forbidden
```

### **Test Role Persistence:**
```
1. Login as user
2. Check role is set
3. Close app completely
4. Reopen app
5. Role should still be set
6. Logout
7. Role should be cleared
```

---

## 📊 **Backend API Testing**

### **Test All Endpoints:**

**Role Management:**
```bash
# Get all roles
GET /api/v1/roles

# Get role by name
GET /api/v1/roles/MANAGER

# Get role permissions
GET /api/v1/roles/MANAGER/permissions

# Check permission
POST /api/v1/roles/check-permission
{ "permission": "APPROVE_EXPENSES" }

# Check action
POST /api/v1/roles/check-action
{ "action": "DELETE", "resourceType": "user" }
```

**User Management:**
```bash
# Get all users
GET /api/v1/admin/users?page=0&size=20

# Get user by ID
GET /api/v1/admin/users/5

# Update user role
PATCH /api/v1/admin/users/5/role
{ "role": "MANAGER" }

# Update user details
PATCH /api/v1/admin/users/5
{ "name": "John Doe", "phone": "+1234567890" }

# Disable user
PATCH /api/v1/admin/users/5/disable

# Enable user
PATCH /api/v1/admin/users/5/enable

# Delete user (SUPER_ADMIN only)
DELETE /api/v1/admin/users/5

# Get users by role
GET /api/v1/admin/users/by-role/MANAGER
```

**Audit Logs:**
```bash
# Get all logs (SUPER_ADMIN only)
GET /api/v1/audit?page=0&size=50

# Get my logs
GET /api/v1/audit/my-logs

# Get logs by action
GET /api/v1/audit/by-action/ASSIGN_ROLE

# Get logs by resource
GET /api/v1/audit/by-resource/user

# Get logs by company
GET /api/v1/audit/by-company/1

# Get logs by date range
GET /api/v1/audit/by-date-range?startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z
```

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: Role not persisting**
**Solution:** 
- Check AsyncStorage is working
- Verify role is being extracted from JWT
- Check logout clears role

### **Issue 2: Admin tab not showing**
**Solution:**
- Verify user has ADMIN or SUPER_ADMIN role
- Check role context is loaded
- Restart app completely

### **Issue 3: Permission checks not working**
**Solution:**
- Verify role is set in RoleContext
- Check permission string matches exactly
- Test with console.log in hasPermission

### **Issue 4: API returns 403**
**Solution:**
- Verify JWT token is valid
- Check user has correct role
- Verify @PreAuthorize annotation on endpoint

### **Issue 5: Role change not reflected**
**Solution:**
- Logout and login again
- New JWT token will have updated role
- Or manually update AsyncStorage

---

## ✅ **Success Criteria**

### **Backend:**
- [ ] All 19 endpoints working
- [ ] Role-based authorization enforced
- [ ] Audit logging working
- [ ] No unauthorized access possible

### **Frontend:**
- [ ] Role context working
- [ ] Role persists across restarts
- [ ] Permission gates working
- [ ] Admin dashboard functional
- [ ] User management functional
- [ ] Navigation filtering working

### **Integration:**
- [ ] Login extracts role from JWT
- [ ] Role stored in AsyncStorage
- [ ] Logout clears role
- [ ] Role changes require re-login
- [ ] All permissions enforced

---

## 🚀 **Quick Test Commands**

### **Create Test Users:**
```sql
-- Create EMPLOYEE
INSERT INTO users (name, email, password, role) 
VALUES ('Employee User', 'employee@test.com', '$2a$10$...', 'EMPLOYEE');

-- Create MANAGER
INSERT INTO users (name, email, password, role) 
VALUES ('Manager User', 'manager@test.com', '$2a$10$...', 'MANAGER');

-- Create ADMIN
INSERT INTO users (name, email, password, role) 
VALUES ('Admin User', 'admin@test.com', '$2a$10$...', 'ADMIN');

-- Create SUPER_ADMIN
INSERT INTO users (name, email, password, role) 
VALUES ('Super Admin', 'superadmin@test.com', '$2a$10$...', 'SUPER_ADMIN');
```

### **Verify Roles:**
```sql
SELECT id, email, role FROM users ORDER BY role;
```

### **Check Audit Logs:**
```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

---

## 📝 **Test Report Template**

```
Date: ___________
Tester: ___________

EMPLOYEE Role:
[ ] Can see correct tabs
[ ] Cannot see admin features
[ ] Can submit expenses
[ ] Role persists

MANAGER Role:
[ ] Can see Claims tab
[ ] Can approve expenses
[ ] Cannot access admin
[ ] Role persists

ADMIN Role:
[ ] Can see Admin tab
[ ] Can access dashboard
[ ] Can manage users
[ ] Cannot assign roles
[ ] Role persists

SUPER_ADMIN Role:
[ ] Full access
[ ] Can assign roles
[ ] Can delete users
[ ] Can view audit logs
[ ] Role persists

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: [ ] PASS  [ ] FAIL
```

---

**Ready to test! Follow this guide to verify all RBAC functionality.** 🧪
