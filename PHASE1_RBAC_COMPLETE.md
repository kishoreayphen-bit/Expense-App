# Phase 1: Expense Visibility & RBAC - COMPLETED ✅

## 📋 Implementation Summary

Successfully implemented role-based access control (RBAC) for expense visibility and reimbursement approvals.

---

## ✅ Completed Features

### 1. Expense Visibility Rules

**Employee:**
- ✅ Can view only their own expenses
- ❌ Cannot view other employees' expenses
- ❌ Cannot view manager expenses
- ❌ Cannot view admin expenses

**Manager:**
- ✅ Can view own expenses
- ✅ Can view all employee expenses in company
- ❌ Cannot view other managers' expenses
- ❌ Cannot view admin expenses

**Admin:**
- ✅ Can view ALL expenses in their company
- ✅ Full visibility across all roles

**Super Admin:**
- ✅ Can view ALL expenses in ANY company
- ✅ Global visibility

### 2. Reimbursement Approval Rules

**Employee:**
- ✅ Can submit reimbursement requests
- ❌ Cannot approve any reimbursements

**Manager:**
- ✅ Can approve EMPLOYEE reimbursements only
- ❌ Cannot approve manager reimbursements
- ❌ Cannot approve admin reimbursements
- ✅ Clear error message when attempting to approve non-employee expenses

**Admin:**
- ✅ Can approve ALL reimbursements in company
- ✅ Can approve employee, manager, and other admin reimbursements

**Super Admin:**
- ✅ Can approve ALL reimbursements globally

---

## 🗄️ Database Changes

### New Table: `expense_viewers`
```sql
CREATE TABLE expense_viewers (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_approve BOOLEAN DEFAULT false,
    granted_by BIGINT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_viewers_expense FOREIGN KEY (expense_id) 
        REFERENCES expenses(id) ON DELETE CASCADE,
    CONSTRAINT fk_expense_viewers_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_expense_viewer UNIQUE(expense_id, user_id)
);
```

**Purpose:** Track granular view and approval permissions for expenses

**Indexes:**
- `idx_expense_viewers_expense` - Fast lookup by expense
- `idx_expense_viewers_user` - Fast lookup by user
- `idx_expense_viewers_can_view` - Filter viewable expenses
- `idx_expense_viewers_can_approve` - Filter approvable expenses

---

## 🔧 Backend Changes

### 1. New Entities

**ExpenseViewer.java**
- Tracks who can view/approve specific expenses
- Fields: expenseId, userId, canView, canApprove, grantedBy, grantedAt

### 2. Repository Updates

**ExpenseViewerRepository.java** (NEW)
- `findByExpenseIdAndUserId()` - Check specific permission
- `findViewableByUser()` - Get all viewable expenses for user
- `findApprovableByUser()` - Get all approvable expenses for user
- `existsByExpenseIdAndUserIdAndCanViewTrue()` - Quick permission check
- `existsByExpenseIdAndUserIdAndCanApproveTrue()` - Quick approval check

**ExpenseRepository.java** (UPDATED)
- `findManagerVisibleExpenses()` - Manager sees own + employee expenses
- `findEmployeeOwnExpenses()` - Employee sees only own expenses
- `findAllByCompanyAndDate()` - Admin sees all company expenses (existing)

### 3. Service Updates

**ExpenseService.java**
- Updated `list()` method with role-based filtering:
  - Super Admin → All expenses in any company
  - Admin → All expenses in their company
  - Manager → Own + employee expenses
  - Employee → Own expenses only
  
- Added helper methods:
  - `canViewExpense(User viewer, Expense expense)` - Check view permission
  - `canApproveReimbursement(User approver, Expense expense)` - Check approval permission

**ReimbursementService.java**
- Updated `approveReimbursement()` with role validation
- Updated `rejectReimbursement()` with role validation
- Updated `markAsPaid()` with role validation
- Added overloaded `verifyCanApproveReimbursement()`:
  - Version 1: Check general permission (for listing)
  - Version 2: Check specific expense approval (for approve/reject)
  
**Approval Logic:**
```java
// Admin/Owner → Can approve ALL
if (ADMIN || OWNER) return true;

// Manager → Can approve EMPLOYEE expenses only
if (MANAGER) {
    if (expenseOwner.role == EMPLOYEE) return true;
    else throw "Managers can only approve employee reimbursements";
}

// Employee → Cannot approve
throw "Only OWNER, ADMIN or MANAGER can approve";
```

---

## 📊 Role Permission Matrix

| Action | Employee | Manager | Admin | Super Admin |
|--------|----------|---------|-------|-------------|
| **View own expenses** | ✅ | ✅ | ✅ | ✅ |
| **View employee expenses** | ❌ | ✅ | ✅ | ✅ |
| **View manager expenses** | ❌ | ❌ | ✅ | ✅ |
| **View admin expenses** | ❌ | ❌ | ✅ | ✅ |
| **Submit reimbursement** | ✅ | ✅ | ✅ | ✅ |
| **Approve employee claims** | ❌ | ✅ | ✅ | ✅ |
| **Approve manager claims** | ❌ | ❌ | ✅ | ✅ |
| **Approve admin claims** | ❌ | ❌ | ✅ | ✅ |

---

## 🔍 Query Examples

### Manager Viewing Expenses
```sql
-- Manager sees own expenses + employee expenses
SELECT DISTINCT e.* FROM expenses e
WHERE e.company_id = :companyId
  AND e.occurred_on BETWEEN :from AND :to
  AND (e.user_id = :managerId 
       OR e.user_id IN (
           SELECT cm.user_id FROM company_members cm
           WHERE cm.company_id = :companyId
           AND cm.role = 'EMPLOYEE'
       ))
ORDER BY e.occurred_on DESC, e.id DESC
```

### Employee Viewing Expenses
```sql
-- Employee sees only own expenses
SELECT e FROM Expense e
WHERE e.user.id = :userId
  AND e.companyId = :companyId
  AND e.occurredOn BETWEEN :from AND :to
ORDER BY e.occurredOn DESC, e.id DESC
```

---

## 🧪 Testing Scenarios

### Scenario 1: Employee Views Expenses
**Setup:**
- User: employee@company.com (EMPLOYEE role)
- Company: Acme Corp (ID: 1)

**Expected:**
- ✅ Sees own expenses only
- ❌ Does not see other employees' expenses
- ❌ Does not see manager expenses

### Scenario 2: Manager Views Expenses
**Setup:**
- User: manager@company.com (MANAGER role)
- Company: Acme Corp (ID: 1)
- Employees: employee1@company.com, employee2@company.com

**Expected:**
- ✅ Sees own expenses
- ✅ Sees employee1's expenses
- ✅ Sees employee2's expenses
- ❌ Does not see other managers' expenses
- ❌ Does not see admin expenses

### Scenario 3: Manager Approves Reimbursement
**Setup:**
- Manager: manager@company.com
- Employee expense: ID 100 (owner: employee@company.com)
- Manager expense: ID 101 (owner: othermanager@company.com)

**Expected:**
- ✅ Can approve expense ID 100 (employee expense)
- ❌ Cannot approve expense ID 101 (manager expense)
- Error: "Managers can only approve employee reimbursements. This expense belongs to a MANAGER"

### Scenario 4: Admin Approves All
**Setup:**
- Admin: admin@company.com
- Expenses: Employee (ID 100), Manager (ID 101), Admin (ID 102)

**Expected:**
- ✅ Can approve expense ID 100
- ✅ Can approve expense ID 101
- ✅ Can approve expense ID 102
- ✅ Full approval authority

---

## 🚀 Deployment Status

**Database Migration:** ✅ V60__expense_visibility_rbac.sql
- Applied on startup
- Creates `expense_viewers` table
- Adds indexes for performance

**Backend:** ✅ Deployed
- Docker container rebuilt
- Application started successfully
- All queries validated

**API Endpoints:** ✅ Updated
- `GET /api/v1/expenses` - Now role-filtered
- `POST /api/v1/reimbursements/{id}/approve` - Role-validated
- `POST /api/v1/reimbursements/{id}/reject` - Role-validated
- `POST /api/v1/reimbursements/{id}/mark-paid` - Role-validated

---

## 📝 Files Modified

### Backend
1. `V60__expense_visibility_rbac.sql` - NEW migration
2. `ExpenseViewer.java` - NEW entity
3. `ExpenseViewerRepository.java` - NEW repository
4. `ExpenseRepository.java` - Added role-based queries
5. `ExpenseService.java` - Updated list() + helper methods
6. `ReimbursementService.java` - Updated approval validation

### Total Changes
- **New files:** 3
- **Modified files:** 3
- **Lines added:** ~250
- **Lines modified:** ~50

---

## ✨ Key Benefits

1. **Security:** Proper role-based access control enforced at database level
2. **Privacy:** Employees cannot see each other's expenses
3. **Hierarchy:** Clear approval chain (Employee → Manager → Admin)
4. **Flexibility:** Granular permissions via `expense_viewers` table
5. **Performance:** Optimized queries with proper indexes
6. **Clarity:** Clear error messages for permission violations

---

## 🔜 Next Steps

### Phase 2: Overall Company Budget
- [ ] Create `company_budgets` table
- [ ] Implement CompanyBudgetService
- [ ] Add budget validation logic
- [ ] Create frontend budget screen

### Phase 3: Team Lead Role & Team Budgets
- [ ] Add `team_lead_id` to groups table
- [ ] Implement team budget tracking
- [ ] Create team budget management UI

### Phase 4: Frontend Integration
- [ ] Update ExpensesScreen with role awareness
- [ ] Add approval buttons based on permissions
- [ ] Show/hide expenses based on role
- [ ] Display permission errors

---

## 📚 Documentation

**Requirements:** `BUDGET_RBAC_REQUIREMENTS.md`
**API Docs:** Updated inline in controllers
**Database Schema:** Updated in migration files

---

**Status:** ✅ PHASE 1 COMPLETE  
**Date:** December 4, 2025  
**Backend:** Deployed and Running  
**Frontend:** Pending (Phase 4)  
**Next Phase:** Overall Company Budget Implementation
