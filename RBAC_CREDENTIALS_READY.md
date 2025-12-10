# ✅ RBAC Test Credentials - READY TO USE!

**Generated:** November 27, 2025, 5:33 PM IST  
**Status:** ✅ Migration V48 Successfully Applied  
**Password for ALL users:** `Password123!`

---

## 🎉 **Database Seeding Complete!**

All RBAC test users have been successfully created in the database. You can now login with these credentials.

---

## 👤 **Test User Credentials**

### **1. SUPER_ADMIN** ⭐
```
Email:    superadmin@expense.app
Password: Password123!
Role:     SUPER_ADMIN (Level 3)
Phone:    +1-555-0001
```

**Full System Access:**
- ✅ Assign any role to any user
- ✅ Delete users
- ✅ View all audit logs
- ✅ Manage all companies
- ✅ Access all features
- ✅ Admin tab visible in navigation

---

### **2. ADMIN (New User)** 🔧
```
Email:    admin@expense.app
Password: Password123!
Role:     ADMIN (Level 2)
Phone:    +1-555-0002
```

**Administrative Access:**
- ✅ View and manage users
- ✅ Update user details
- ✅ Disable/enable users
- ✅ Access admin dashboard
- ✅ Admin tab visible in navigation
- ❌ Cannot assign roles (SUPER_ADMIN only)
- ❌ Cannot delete users (SUPER_ADMIN only)

---

### **3. ADMIN (Existing Company Owner)** 🏢
```
Email:    admin@demo.local
Password: (your existing password)
Role:     ADMIN (Level 2) - UPGRADED
Phone:    (existing)
```

**Note:** All existing company owners have been automatically upgraded to ADMIN role.

---

### **4. MANAGERS (Per Company)** 👔

**Manager 1:**
```
Email:    manager1@expense.app
Password: Password123!
Role:     MANAGER (Level 1)
Phone:    +1-555-1001
Company:  First company in database
```

**Manager 2:**
```
Email:    manager2@expense.app
Password: Password123!
Role:     MANAGER (Level 1)
Phone:    +1-555-1002
Company:  Second company in database
```

**Manager 3:**
```
Email:    manager3@expense.app
Password: Password123!
Role:     MANAGER (Level 1)
Phone:    +1-555-1003
Company:  Third company in database
```

**... (One manager created for each existing company)**

**Manager Capabilities:**
- ✅ Approve/reject expenses
- ✅ View team data
- ✅ Access Claims tab (in company mode)
- ✅ Manage team members
- ❌ No Admin tab
- ❌ Cannot manage users globally

---

### **5. EMPLOYEE** 👤
```
Email:    employee@expense.app
Password: Password123!
Role:     EMPLOYEE (Level 0)
Phone:    +1-555-9999
```

**Basic Access:**
- ✅ Submit expenses
- ✅ Upload bills
- ✅ View own data
- ✅ Request reimbursement
- ❌ No Claims tab
- ❌ No Admin tab
- ❌ Cannot approve expenses

---

## 🧪 **Quick Test**

### **Test SUPER_ADMIN:**
```bash
# Login via mobile app
Email: superadmin@expense.app
Password: Password123!

# What you'll see:
✓ All navigation tabs including Admin tab
✓ Admin Dashboard with full controls
✓ User Management with role assignment
✓ Can change any user's role
```

### **Test ADMIN:**
```bash
# Login via mobile app
Email: admin@expense.app
Password: Password123!

# What you'll see:
✓ All navigation tabs including Admin tab
✓ Admin Dashboard (limited controls)
✓ User Management (no role assignment button)
✓ Can update user details
```

### **Test MANAGER:**
```bash
# Login via mobile app
Email: manager1@expense.app
Password: Password123!

# What you'll see:
✓ Standard tabs + Claims tab (in company mode)
✗ No Admin tab
✓ Can approve/reject expenses
✓ Can view team data
```

### **Test EMPLOYEE:**
```bash
# Login via mobile app
Email: employee@expense.app
Password: Password123!

# What you'll see:
✓ Basic tabs only (Dashboard, Expenses, Budgets, FX, Groups, Bills, Profile)
✗ No Claims tab
✗ No Admin tab
✓ Can submit expenses
```

---

## 📊 **Database Summary**

### **Users Created:**
```sql
-- Query to see all RBAC users
SELECT email, role, phone, enabled 
FROM users 
WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE')
ORDER BY 
  CASE role 
    WHEN 'SUPER_ADMIN' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'EMPLOYEE' THEN 4
  END,
  id;
```

**Results:**
```
         email          |    role     |    phone    | enabled
------------------------+-------------+-------------+---------
 superadmin@expense.app | SUPER_ADMIN | +1-555-0001 | true
 admin@demo.local       | ADMIN       |             | true
 admin@expense.app      | ADMIN       | +1-555-0002 | true
 manager@demo.local     | MANAGER     |             | true
 manager1@expense.app   | MANAGER     | +1-555-1001 | true
 manager2@expense.app   | MANAGER     | +1-555-1002 | true
 manager3@expense.app   | MANAGER     | +1-555-1003 | true
 employee@expense.app   | EMPLOYEE    | +1-555-9999 | true
```

---

## 🔐 **Password Information**

### **Plain Password:**
```
Password123!
```

### **BCrypt Hash:**
```
$2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC
```

### **Algorithm:**
- BCrypt with 10 rounds
- Secure for production use
- Compatible with Spring Security

---

## 🚀 **What Changed**

### **Existing Users:**
1. **Company Owners** → Upgraded to ADMIN role
2. **Existing admin@demo.local** → Now has ADMIN role
3. **Existing manager@demo.local** → Now has MANAGER role

### **New Users:**
1. **superadmin@expense.app** → SUPER_ADMIN (new)
2. **admin@expense.app** → ADMIN (new)
3. **manager1@expense.app** → MANAGER (new, added to Company 1)
4. **manager2@expense.app** → MANAGER (new, added to Company 2)
5. **manager3@expense.app** → MANAGER (new, added to Company 3)
6. **employee@expense.app** → EMPLOYEE (new, added to Company 1)

---

## 📱 **Mobile App Testing**

### **Step 1: Start Mobile App**
```bash
cd mobile
npm start
```

### **Step 2: Login as SUPER_ADMIN**
```
1. Open app
2. Enter: superadmin@expense.app
3. Password: Password123!
4. Login
```

### **Step 3: Verify Admin Tab**
```
✓ Bottom navigation should show "Admin" tab
✓ Tap Admin tab
✓ Should see Admin Dashboard
✓ Tap "Manage Users"
✓ Should see all users
✓ Select any user
✓ Should see role change option
```

### **Step 4: Test Role Assignment**
```
1. In User Management, select a user
2. Tap edit icon
3. Select new role (e.g., MANAGER)
4. Confirm
5. User's role should update
6. Check audit logs (when implemented)
```

---

## 🔍 **Verification Queries**

### **Check Company Owners (Now ADMIN):**
```sql
SELECT u.email, u.role, c.company_name
FROM users u
JOIN companies c ON c.created_by = u.id
ORDER BY c.id;
```

### **Check Managers per Company:**
```sql
SELECT 
  c.company_name,
  u.email as manager_email,
  u.role,
  cm.role as company_role
FROM companies c
JOIN company_members cm ON cm.company_id = c.id
JOIN users u ON u.id = cm.user_id
WHERE u.role = 'MANAGER'
ORDER BY c.id;
```

### **Count Users by Role:**
```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY 
  CASE role 
    WHEN 'SUPER_ADMIN' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'EMPLOYEE' THEN 4
    ELSE 5
  END;
```

---

## ⚠️ **Important Security Notes**

### **For Testing:**
- ✅ These credentials are perfect for testing
- ✅ All users are enabled and ready to use
- ✅ Password is secure (BCrypt hashed)

### **For Production:**
- ⚠️ Change all passwords immediately
- ⚠️ Use strong, unique passwords
- ⚠️ Enable 2FA for admin accounts
- ⚠️ Regularly rotate credentials
- ⚠️ Monitor audit logs
- ⚠️ Remove test accounts

---

## 📋 **Quick Reference Table**

| Email | Password | Role | Phone | Access Level |
|-------|----------|------|-------|--------------|
| superadmin@expense.app | Password123! | SUPER_ADMIN | +1-555-0001 | Full |
| admin@expense.app | Password123! | ADMIN | +1-555-0002 | High |
| admin@demo.local | (existing) | ADMIN | (existing) | High |
| manager1@expense.app | Password123! | MANAGER | +1-555-1001 | Medium |
| manager2@expense.app | Password123! | MANAGER | +1-555-1002 | Medium |
| manager3@expense.app | Password123! | MANAGER | +1-555-1003 | Medium |
| manager@demo.local | (existing) | MANAGER | (existing) | Medium |
| employee@expense.app | Password123! | EMPLOYEE | +1-555-9999 | Basic |

---

## ✅ **Migration Status**

```
✅ V48__seed_rbac_users.sql - Successfully applied
✅ All test users created
✅ Company owners upgraded to ADMIN
✅ Managers added to companies
✅ Employee added to first company
✅ All users enabled
✅ Backend started successfully
```

---

## 🎯 **Next Steps**

1. **Test Login:**
   - Open mobile app
   - Login with superadmin@expense.app
   - Password: Password123!

2. **Verify UI:**
   - Check Admin tab appears
   - Navigate to Admin Dashboard
   - Test User Management

3. **Test Permissions:**
   - Try changing user roles
   - Test with different role accounts
   - Verify access restrictions

4. **Complete Testing:**
   - Follow RBAC_TESTING_GUIDE.md
   - Test all scenarios
   - Verify audit logging

---

**🎉 All RBAC test credentials are ready to use!**

**Remember:** Password for ALL new users is `Password123!`

**Backend Status:** ✅ Running on port 18080  
**Database Status:** ✅ Migration V48 applied  
**Users Status:** ✅ All test users created  
**Ready to Test:** ✅ YES!

---

**Start testing the complete RBAC system now!** 🚀
