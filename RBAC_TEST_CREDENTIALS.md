# 🔐 RBAC Test Credentials

**Generated:** November 27, 2025, 5:16 PM IST  
**Password for ALL users:** `Password123!`

---

## 👤 **Test User Accounts**

### **1. SUPER_ADMIN**
```
Email:    superadmin@expense.app
Password: Password123!
Role:     SUPER_ADMIN (Level 3)
Phone:    +1-555-0001
```

**Capabilities:**
- ✅ Full system access
- ✅ Assign any role to any user
- ✅ Delete users
- ✅ View all audit logs
- ✅ Manage all companies
- ✅ Access all features

**What You'll See:**
- All navigation tabs including Admin tab
- Admin Dashboard with full controls
- User Management with role assignment
- Audit Logs viewer
- All company data

---

### **2. ADMIN**
```
Email:    admin@expense.app
Password: Password123!
Role:     ADMIN (Level 2)
Phone:    +1-555-0002
```

**Capabilities:**
- ✅ Manage users (view, update, disable/enable)
- ✅ View all company data
- ✅ Approve/reject expenses
- ✅ Access admin dashboard
- ❌ Cannot assign roles (SUPER_ADMIN only)
- ❌ Cannot delete users (SUPER_ADMIN only)
- ❌ Cannot view audit logs (SUPER_ADMIN only)

**What You'll See:**
- All navigation tabs including Admin tab
- Admin Dashboard (limited controls)
- User Management (no role assignment)
- All company data

---

### **3. MANAGER (Per Company)**

**Manager credentials are created for EACH existing company:**

```
Company 1 Manager:
Email:    manager1@expense.app
Password: Password123!
Role:     MANAGER (Level 1)
Phone:    +1-555-0001

Company 2 Manager:
Email:    manager2@expense.app
Password: Password123!
Role:     MANAGER (Level 1)
Phone:    +1-555-0002

Company 3 Manager:
Email:    manager3@expense.app
Password: Password123!
Role:     MANAGER (Level 1)
Phone:    +1-555-0003

... (continues for each company)
```

**Capabilities:**
- ✅ Approve/reject expenses
- ✅ View team data
- ✅ Access reimbursement claims
- ✅ Manage team members
- ❌ Cannot access admin features
- ❌ Cannot manage users globally
- ❌ Cannot assign roles

**What You'll See:**
- Standard tabs + Claims tab (in company mode)
- No Admin tab
- Team expenses and data
- Approval workflows

---

### **4. EMPLOYEE**
```
Email:    employee@expense.app
Password: Password123!
Role:     EMPLOYEE (Level 0)
Phone:    +1-555-9999
```

**Capabilities:**
- ✅ Submit expenses
- ✅ Upload bills
- ✅ View own data
- ✅ Request reimbursement
- ❌ Cannot approve expenses
- ❌ Cannot view team data
- ❌ Cannot access admin features

**What You'll See:**
- Basic tabs only (Dashboard, Expenses, Budgets, FX, Groups, Bills, Profile)
- No Claims tab
- No Admin tab
- Own expenses only

---

## 🔄 **What Changed for Existing Users**

### **Company Owners:**
- **Old Role:** EMPLOYEE or USER
- **New Role:** ADMIN
- **Why:** Company owners should have administrative privileges

All existing company owners have been automatically upgraded to ADMIN role.

---

## 📊 **Role Distribution**

After seeding:
```
SUPER_ADMIN: 1 user
ADMIN:       1 user + all company owners
MANAGER:     1 per company (added as company member)
EMPLOYEE:    1 user
```

---

## 🚀 **How to Use**

### **Step 1: Run Migration**
```bash
# The migration will run automatically on next backend start
# Or run manually:
docker-compose restart backend

# Check logs:
docker-compose logs -f backend
```

### **Step 2: Login**
```
1. Open mobile app
2. Use any of the credentials above
3. Password is always: Password123!
4. See role-specific UI
```

### **Step 3: Test Features**

**Test as SUPER_ADMIN:**
```
1. Login with superadmin@expense.app
2. See Admin tab in navigation
3. Tap Admin → Admin Dashboard
4. Tap "Manage Users"
5. Select any user
6. Change their role
7. Verify change works
```

**Test as ADMIN:**
```
1. Login with admin@expense.app
2. See Admin tab in navigation
3. Tap Admin → Admin Dashboard
4. Tap "Manage Users"
5. Try to change role → Should be blocked
6. Update user details → Should work
```

**Test as MANAGER:**
```
1. Login with manager1@expense.app
2. Switch to company mode
3. See Claims tab (no Admin tab)
4. Access Claims screen
5. Approve/reject expenses
```

**Test as EMPLOYEE:**
```
1. Login with employee@expense.app
2. See basic tabs only
3. No Claims tab, no Admin tab
4. Submit expense → Should work
5. Upload bill → Should work
```

---

## 🔐 **Security Notes**

### **Password Hash:**
```
Plain Password: Password123!
BCrypt Hash:    $2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC
Algorithm:      BCrypt
Strength:       10 rounds
```

### **Important:**
- ⚠️ These are TEST credentials only
- ⚠️ Change passwords in production
- ⚠️ Use strong, unique passwords
- ⚠️ Enable 2FA for admin accounts
- ⚠️ Regularly rotate credentials

---

## 📝 **Verification Queries**

### **Check User Roles:**
```sql
SELECT id, name, email, role, phone 
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

### **Check Company Owners (Now ADMIN):**
```sql
SELECT u.id, u.name, u.email, u.role, c.name as company_name
FROM users u
JOIN companies c ON c.owner_id = u.id
ORDER BY c.id;
```

### **Check Managers per Company:**
```sql
SELECT 
  c.id as company_id,
  c.name as company_name,
  u.id as manager_id,
  u.name as manager_name,
  u.email as manager_email,
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

## 🧪 **Quick Test Script**

### **Test All Credentials:**
```bash
# Test SUPER_ADMIN
curl -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@expense.app","password":"Password123!"}'

# Test ADMIN
curl -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@expense.app","password":"Password123!"}'

# Test MANAGER
curl -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager1@expense.app","password":"Password123!"}'

# Test EMPLOYEE
curl -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@expense.app","password":"Password123!"}'
```

---

## 📋 **Summary Table**

| Role | Email | Password | Phone | Access Level |
|------|-------|----------|-------|--------------|
| SUPER_ADMIN | superadmin@expense.app | Password123! | +1-555-0001 | Full |
| ADMIN | admin@expense.app | Password123! | +1-555-0002 | High |
| MANAGER 1 | manager1@expense.app | Password123! | +1-555-0001 | Medium |
| MANAGER 2 | manager2@expense.app | Password123! | +1-555-0002 | Medium |
| MANAGER 3 | manager3@expense.app | Password123! | +1-555-0003 | Medium |
| ... | manager{N}@expense.app | Password123! | +1-555-{N} | Medium |
| EMPLOYEE | employee@expense.app | Password123! | +1-555-9999 | Basic |

---

## 🎯 **Next Steps**

1. **Restart Backend:**
   ```bash
   docker-compose restart backend
   ```

2. **Verify Migration:**
   ```bash
   docker-compose logs backend | grep "V48__seed_rbac_users"
   ```

3. **Check Database:**
   ```bash
   docker exec expense_postgres psql -U expense_user -d expenses -c "SELECT email, role FROM users WHERE role != 'USER';"
   ```

4. **Test Login:**
   - Open mobile app
   - Login with superadmin@expense.app
   - Password: Password123!
   - Verify Admin tab appears

5. **Test Role Assignment:**
   - Go to Admin Dashboard
   - Manage Users
   - Change a user's role
   - Verify it works

---

**🎉 All test credentials are ready to use!**

**Remember:** 
- Password for ALL users: `Password123!`
- Manager emails: `manager1@expense.app`, `manager2@expense.app`, etc.
- One manager created per existing company
- All company owners upgraded to ADMIN role

**Ready to test the complete RBAC system!** 🚀
