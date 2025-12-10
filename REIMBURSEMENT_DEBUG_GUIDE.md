# 🔍 Reimbursement Debug Guide

## 🎯 **Problem**
Superadmin creates reimbursable expense in company mode, but it doesn't appear in admin's Claims tab.

---

## 🧪 **Debug Steps**

### **Step 1: Run Debug Test Script**

This script will check:
- ✅ If superadmin has reimbursable expenses
- ✅ If expenses have `companyId` set
- ✅ If admin can see pending reimbursements
- ✅ Permission checks

```powershell
cd d:\Expenses
.\test-reimbursement-debug.ps1
```

**What to look for:**
- Does superadmin have reimbursable expenses? (Should be YES)
- Do those expenses have `companyId` set? (Should be YES)
- Do those expenses have `reimbursementStatus: PENDING`? (Should be YES)
- Can admin see them? (Currently NO - this is the bug)

---

### **Step 2: Check Backend Logs**

The backend now has detailed logging. Check what's happening:

```powershell
docker logs expense_backend --tail 100 | Select-String "ReimbursementService"
```

**Look for these log messages:**

**When requesting reimbursement:**
```
[ReimbursementService] Requesting reimbursement - User: superadmin@expense.app, ExpenseId: 123
[ReimbursementService] Expense details - ID: 123, User: superadmin@expense.app, CompanyId: 1, IsReimbursable: true, CurrentStatus: null
[ReimbursementService] Reimbursement request saved - ExpenseId: 123, Status: PENDING, CompanyId: 1
[ReimbursementService] Notified admins for companyId: 1
```

**When admin lists pending:**
```
[ReimbursementService] Listing pending reimbursements for manager: admin@expense.app, companyId: 1
[ReimbursementService] Found 1 pending reimbursement(s)
  - Expense ID: 123, User: superadmin@expense.app, Amount: 50.0 USD, Status: PENDING, CompanyId: 1
```

**⚠️ If you see:**
```
[ReimbursementService] Expense has no companyId - skipping admin notification
```
**This means the expense was created without a companyId!**

---

### **Step 3: Check Database Directly**

Run the SQL queries to see what's in the database:

```powershell
# Connect to PostgreSQL
docker exec -it expense_postgres psql -U postgres -d expensedb

# Then paste the queries from check-reimbursement-data.sql
```

**Or run all at once:**
```powershell
Get-Content d:\Expenses\check-reimbursement-data.sql | docker exec -i expense_postgres psql -U postgres -d expensedb
```

**What to check:**

1. **Do reimbursable expenses have company_id?**
   ```sql
   SELECT id, merchant, amount, company_id, is_reimbursable, reimbursement_status
   FROM expenses
   WHERE is_reimbursable = true;
   ```
   - If `company_id` is NULL → **This is the problem!**

2. **Is admin a member of the company?**
   ```sql
   SELECT u.email, cm.role, c.name
   FROM company_members cm
   JOIN users u ON cm.user_id = u.id
   JOIN companies c ON cm.company_id = c.id
   WHERE u.email = 'admin@expense.app';
   ```
   - If no rows → Admin is not a member!
   - If role is not ADMIN/MANAGER → Admin doesn't have permission!

---

## 🐛 **Possible Root Causes**

### **Cause 1: Expense Created Without CompanyId**

**Symptom:**
- Expense exists
- `is_reimbursable = true`
- But `company_id = NULL`

**Why this happens:**
- User was in personal mode when creating expense
- OR company context was lost during creation
- OR mobile app didn't send companyId

**Fix:**
- Check mobile app expense creation
- Ensure `companyId` is sent in POST request
- Verify backend saves companyId

---

### **Cause 2: Admin Not Member of Company**

**Symptom:**
- Error: "Not a member of this company"
- Permission check fails

**Why this happens:**
- Admin was never added to company
- Admin was removed from company

**Fix:**
```sql
-- Add admin to company (replace IDs)
INSERT INTO company_members (company_id, user_id, role, joined_at)
VALUES (1, (SELECT id FROM users WHERE email = 'admin@expense.app'), 'ADMIN', NOW());
```

---

### **Cause 3: Admin Has Wrong Role**

**Symptom:**
- Error: "Only OWNER, ADMIN or MANAGER can approve reimbursements"

**Why this happens:**
- Admin has role 'EMPLOYEE' or 'USER'

**Fix:**
```sql
-- Update admin's role
UPDATE company_members
SET role = 'ADMIN'
WHERE company_id = 1
  AND user_id = (SELECT id FROM users WHERE email = 'admin@expense.app');
```

---

### **Cause 4: Reimbursement Status Not Set**

**Symptom:**
- Expense exists
- `is_reimbursable = true`
- But `reimbursement_status = NULL`

**Why this happens:**
- User didn't click "Request Reimbursement" button
- Request failed silently

**Fix:**
- Click "Request Reimbursement" button in mobile app
- Check backend logs for errors

---

## 🔧 **Quick Fixes**

### **Fix 1: Manually Set CompanyId**

If expenses are missing companyId:

```sql
-- Find expenses without companyId
SELECT id, merchant, amount, is_reimbursable
FROM expenses
WHERE is_reimbursable = true AND company_id IS NULL;

-- Set companyId (replace 1 with your company ID)
UPDATE expenses
SET company_id = 1
WHERE is_reimbursable = true AND company_id IS NULL;
```

---

### **Fix 2: Manually Request Reimbursement**

If status is not set:

```sql
-- Set reimbursement status to PENDING
UPDATE expenses
SET reimbursement_status = 'PENDING',
    reimbursement_requested_at = NOW()
WHERE id = 123; -- Replace with expense ID
```

---

### **Fix 3: Add Admin to Company**

If admin is not a member:

```sql
-- Add admin as ADMIN role
INSERT INTO company_members (company_id, user_id, role, joined_at)
VALUES (
    1, -- Company ID
    (SELECT id FROM users WHERE email = 'admin@expense.app'),
    'ADMIN',
    NOW()
);
```

---

## 📊 **Expected vs Actual**

### **Expected Behavior:**

1. Superadmin creates expense in company mode
   - ✅ `company_id = 1`
   - ✅ `is_reimbursable = true`

2. Superadmin clicks "Request Reimbursement"
   - ✅ `reimbursement_status = 'PENDING'`
   - ✅ `reimbursement_requested_at = NOW()`

3. Admin logs in, goes to Claims tab
   - ✅ Sees expense in Pending tab
   - ✅ Can approve/reject

### **Actual Behavior (Bug):**

1. Superadmin creates expense
   - ❌ `company_id = NULL` (or not set correctly)
   - ✅ `is_reimbursable = true`

2. Superadmin clicks "Request Reimbursement"
   - ✅ `reimbursement_status = 'PENDING'`
   - ⚠️ But no companyId!

3. Admin logs in, goes to Claims tab
   - ❌ Sees nothing (query filters by companyId)

---

## 🎯 **Action Plan**

### **Step 1: Identify Root Cause**
```powershell
# Run debug script
.\test-reimbursement-debug.ps1

# Check logs
docker logs expense_backend --tail 100 | Select-String "ReimbursementService"

# Check database
Get-Content check-reimbursement-data.sql | docker exec -i expense_postgres psql -U postgres -d expensedb
```

### **Step 2: Apply Fix**
Based on what you find:
- Missing companyId → Check expense creation in mobile app
- Admin not member → Add admin to company
- Wrong role → Update admin's role
- Status not set → Click "Request Reimbursement" button

### **Step 3: Test Again**
```powershell
# Create new test expense
# Request reimbursement
# Check if it appears in admin's Claims tab
```

---

## 📝 **Report Findings**

After running the debug steps, please share:

1. **Output of test script:**
   ```
   .\test-reimbursement-debug.ps1
   ```

2. **Backend logs:**
   ```
   docker logs expense_backend --tail 100 | Select-String "ReimbursementService"
   ```

3. **Database query results:**
   - Do expenses have company_id?
   - Is admin a member?
   - What's the admin's role?

This will help identify the exact cause and apply the right fix! 🎯
