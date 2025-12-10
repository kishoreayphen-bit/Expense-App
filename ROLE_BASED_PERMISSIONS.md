# 🔐 Role-Based Permissions Implementation

## Overview
Comprehensive role-based access control (RBAC) for expenses, budgets, and teams in the expense management app.

---

## 📋 **Permission Matrix**

### **Expense Permissions**

| Action | EMPLOYEE | MANAGER | ADMIN | SUPER_ADMIN |
|--------|----------|---------|-------|-------------|
| **Add expenses** | ✅ Own | ✅ Own | ✅ Own | ✅ Any |
| **View expenses** | ✅ Own only | ✅ Own only | ✅ All in company | ✅ All companies |
| **Edit expenses** | ✅ Own (until approved) | ✅ Own (until approved) | ✅ Any in company | ✅ Any |
| **Delete expenses** | ✅ Own (until approved) | ✅ Own (until approved) | ✅ Any in company | ✅ Any |
| **Upload bills** | ✅ | ✅ | ✅ | ✅ |
| **Approve expenses** | ❌ | ✅ Team expenses | ✅ All in company | ✅ Any |

### **Budget Permissions**

| Action | EMPLOYEE | MANAGER | ADMIN | SUPER_ADMIN |
|--------|----------|---------|-------|-------------|
| **Create budgets** | ❌ | ❌ | ✅ Company budgets | ✅ Any budget |
| **View budgets** | ✅ Own | ✅ Team budgets (read-only) | ✅ All in company | ✅ All companies |
| **Edit budgets** | ❌ | ❌ | ✅ Company budgets | ✅ Any budget |
| **Delete budgets** | ❌ | ❌ | ✅ Company budgets | ✅ Any budget |
| **Set budget limits** | ❌ | ❌ | ✅ | ✅ |

### **Team/Group Permissions**

| Action | EMPLOYEE | MANAGER | ADMIN | SUPER_ADMIN |
|--------|----------|---------|-------|-------------|
| **Create teams** | ❌ | ✅ | ✅ | ✅ |
| **View teams** | ✅ Member of | ✅ Member of | ✅ All in company | ✅ All companies |
| **Edit teams** | ❌ | ✅ Own teams | ✅ All in company | ✅ Any |
| **Delete teams** | ❌ | ✅ Own teams | ✅ All in company | ✅ Any |
| **Add members** | ❌ | ✅ Own teams | ✅ All in company | ✅ Any |
| **Remove members** | ❌ | ✅ Own teams | ✅ All in company | ✅ Any |

### **Company Permissions**

| Action | EMPLOYEE | MANAGER | ADMIN | SUPER_ADMIN |
|--------|----------|---------|-------|-------------|
| **View companies** | ✅ Member of | ✅ Member of | ✅ Member of | ✅ All companies |
| **Create companies** | ✅ | ✅ | ✅ | ✅ |
| **Update companies** | ❌ | ❌ | ❌ | ❌ |
| **Delete companies** | ❌ | ❌ | ❌ | ❌ |
| **Manage members** | ❌ | ❌ | ✅ | ✅ |

---

## 🎯 **Role Definitions**

### 👤 **EMPLOYEE**
**Description:** Basic user who submits expenses for their own work.

**Can Do:**
- ✅ Add personal expenses
- ✅ Upload bills/receipts
- ✅ View own expenses only
- ✅ Edit/delete own expenses (until approved)
- ✅ View own reports
- ✅ Join teams (when invited)

**Cannot Do:**
- ❌ View other employees' expenses
- ❌ Create or manage budgets
- ❌ Create teams
- ❌ Approve expenses
- ❌ Manage company settings

**Use Case:** Regular employees submitting travel, meal, or office supply expenses.

---

### 👔 **MANAGER**
**Description:** Team lead who manages team expenses and approvals.

**Can Do:**
- ✅ All EMPLOYEE permissions
- ✅ Create teams
- ✅ Approve/reject team expenses
- ✅ View team expenses
- ✅ Track team budgets (read-only)
- ✅ Manage team members

**Cannot Do:**
- ❌ Create budgets
- ❌ Delete budgets
- ❌ View expenses outside their team
- ❌ Manage company-wide settings

**Use Case:** Department managers, team leads, project managers.

---

### 🛠️ **ADMIN**
**Description:** Company administrator with full company management access.

**Can Do:**
- ✅ All MANAGER permissions
- ✅ **Create budgets** for the company
- ✅ **Edit budgets**
- ✅ **Delete budgets**
- ✅ Set budget limits and alerts
- ✅ **View ALL expenses** in their company
- ✅ Approve any expense in company
- ✅ Manage all teams in company
- ✅ Invite/remove company members
- ✅ Assign roles

**Cannot Do:**
- ❌ Access other companies
- ❌ Update/delete companies
- ❌ Manage system-wide settings

**Use Case:** Finance managers, HR admins, company administrators.

---

### 👑 **SUPER_ADMIN**
**Description:** System owner with full access across all companies.

**Can Do:**
- ✅ **Everything** across all companies
- ✅ View all companies
- ✅ Create budgets for any company
- ✅ Update/delete any budget
- ✅ View/edit/delete any expense
- ✅ Override any action
- ✅ Manage users system-wide
- ✅ Suspend/activate users
- ✅ Reset passwords

**Cannot Do:**
- ❌ Update companies (companies are permanent)
- ❌ Delete companies (companies are permanent)

**Use Case:** App owner, system administrator, support team.

---

## 🔧 **Backend Implementation**

### **1. Expense Visibility (`ExpenseService.java`)**

```java
// EMPLOYEE sees only their own expenses
if (normalizedCompanyId != null) {
    if (user.getRole() == Role.SUPER_ADMIN) {
        // SUPER_ADMIN sees ALL expenses in any company
        scoped = expenseRepository.findAllByCompanyAndDate(companyId, from, to);
    } else {
        // Check if user is ADMIN in this company
        boolean isCompanyAdmin = checkCompanyRole(user, companyId, "ADMIN");
        
        if (isCompanyAdmin) {
            // ADMIN sees ALL expenses in their company
            scoped = expenseRepository.findAllByCompanyAndDate(companyId, from, to);
        } else {
            // EMPLOYEE and MANAGER see only their own
            scoped = expenseRepository.findCompanyByUserAndDate(user, companyId, from, to);
        }
    }
}
```

**Key Points:**
- EMPLOYEE: Sees only expenses they created
- MANAGER: Sees only expenses they created (team approval is separate)
- ADMIN: Sees ALL expenses in their company
- SUPER_ADMIN: Sees ALL expenses in any company

---

### **2. Budget Permissions (`BudgetPermissionService.java`)**

```java
public boolean canCreateBudgets(User user, Long companyId) {
    // SUPER_ADMIN can create budgets for any company
    if (user.getRole() == Role.SUPER_ADMIN) {
        return true;
    }
    
    if (companyId == null) {
        // Personal budgets - only SUPER_ADMIN
        return user.getRole() == Role.SUPER_ADMIN;
    }
    
    // Check company role
    CompanyMember member = getMember(user, companyId);
    String companyRole = member.getRole();
    
    // Only ADMIN (company role) can create budgets
    // MANAGER and EMPLOYEE CANNOT
    return "ADMIN".equals(companyRole);
}
```

**Key Points:**
- EMPLOYEE: ❌ Cannot create budgets
- MANAGER: ❌ Cannot create budgets (can only view)
- ADMIN: ✅ Can create budgets for their company
- SUPER_ADMIN: ✅ Can create budgets for any company

---

### **3. Team Creation (`GroupService.java`)**

```java
public GroupView create(String ownerEmail, GroupCreateRequest req, Long companyId) {
    User owner = userRepository.findByEmail(ownerEmail).orElseThrow();
    
    // Permission check for company teams
    if (companyId != null && companyId > 0) {
        if (owner.getRole() != Role.SUPER_ADMIN) {
            CompanyMember member = getMember(owner, companyId);
            String companyRole = member.getRole();
            
            // Only ADMIN and MANAGER can create teams
            if (!"ADMIN".equals(companyRole) && !"MANAGER".equals(companyRole)) {
                throw new IllegalArgumentException(
                    "Only ADMIN and MANAGER can create teams. Your role: " + companyRole
                );
            }
        }
    }
    // Create team...
}
```

**Key Points:**
- EMPLOYEE: ❌ Cannot create teams
- MANAGER: ✅ Can create teams
- ADMIN: ✅ Can create teams
- SUPER_ADMIN: ✅ Can create teams in any company

---

## 📱 **Mobile UI Updates (Recommended)**

### **Hide/Show Features Based on Role**

```typescript
// Example: BudgetsScreen.tsx
const canCreateBudget = () => {
  if (userRole === 'SUPER_ADMIN') return true;
  if (companyRole === 'ADMIN') return true;
  return false; // EMPLOYEE and MANAGER cannot
};

return (
  <View>
    {canCreateBudget() && (
      <TouchableOpacity onPress={navigateToCreateBudget}>
        <Text>+ Create Budget</Text>
      </TouchableOpacity>
    )}
  </View>
);
```

### **Conditional Rendering Examples:**

**1. Budget Creation Button**
```typescript
// Show only for ADMIN and SUPER_ADMIN
{(userRole === 'SUPER_ADMIN' || companyRole === 'ADMIN') && (
  <CreateBudgetButton />
)}
```

**2. Team Creation Button**
```typescript
// Show for MANAGER, ADMIN, and SUPER_ADMIN
{(userRole === 'SUPER_ADMIN' || 
  companyRole === 'ADMIN' || 
  companyRole === 'MANAGER') && (
  <CreateTeamButton />
)}
```

**3. Expense List Filtering**
```typescript
// ADMIN sees "All Expenses" tab
{companyRole === 'ADMIN' && (
  <Tab label="All Expenses" />
)}
// EMPLOYEE sees only "My Expenses"
<Tab label="My Expenses" />
```

---

## 🧪 **Testing Scenarios**

### **Test 1: EMPLOYEE Expense Visibility**
1. Login as EMPLOYEE
2. Navigate to company expenses
3. ✅ Should see only their own expenses
4. ❌ Should NOT see other employees' expenses

### **Test 2: ADMIN Expense Visibility**
1. Login as ADMIN
2. Navigate to company expenses
3. ✅ Should see ALL expenses in the company
4. ✅ Should see expenses from all employees

### **Test 3: Budget Creation**
1. Login as EMPLOYEE
2. Try to create a budget
3. ❌ Should get error: "You do not have permission to create budgets"

4. Login as ADMIN
5. Try to create a budget
6. ✅ Should succeed

### **Test 4: Team Creation**
1. Login as EMPLOYEE
2. Try to create a team
3. ❌ Should get error: "Only ADMIN and MANAGER can create teams"

4. Login as MANAGER
5. Try to create a team
6. ✅ Should succeed

---

## 📊 **Database Queries**

### **Get All Expenses for ADMIN**
```sql
SELECT e.* FROM expenses e
WHERE e.company_id = :companyId
  AND e.occurred_on BETWEEN :from AND :to
ORDER BY e.occurred_on DESC;
```

### **Get Own Expenses for EMPLOYEE**
```sql
SELECT e.* FROM expenses e
WHERE e.user_id = :userId
  AND e.company_id = :companyId
  AND e.occurred_on BETWEEN :from AND :to
ORDER BY e.occurred_on DESC;
```

---

## 🚀 **Deployment Checklist**

- [x] Update `BudgetPermissionService` - only ADMIN can create budgets
- [x] Update `ExpenseService` - role-based visibility
- [x] Update `GroupService` - ADMIN/MANAGER can create teams
- [x] Add `findAllByCompanyAndDate` query to `ExpenseRepository`
- [x] Inject `CompanyMemberRepository` into `ExpenseService`
- [x] Inject `CompanyMemberRepository` into `GroupService`
- [ ] Update mobile UI to hide/show features
- [ ] Rebuild backend Docker containers
- [ ] Test all permission scenarios

---

## 📝 **Summary of Changes**

### **Backend Changes:**

**Files Modified:**
1. ✅ `BudgetPermissionService.java` - Budget creation restricted to ADMIN only
2. ✅ `ExpenseService.java` - Role-based expense visibility
3. ✅ `ExpenseRepository.java` - Added `findAllByCompanyAndDate` query
4. ✅ `GroupService.java` - Team creation restricted to ADMIN/MANAGER
5. ✅ `CompanyService.java` - Fixed role enum comparisons

**Permission Changes:**
- **Budgets:** Only ADMIN and SUPER_ADMIN can create/manage
- **Expenses:** EMPLOYEE sees own, ADMIN sees all in company
- **Teams:** Only MANAGER, ADMIN, and SUPER_ADMIN can create

### **Mobile Changes (Recommended):**
- Hide budget creation for EMPLOYEE and MANAGER
- Hide team creation for EMPLOYEE
- Show "All Expenses" tab only for ADMIN
- Add role-based conditional rendering

---

## 🎯 **Key Takeaways**

1. **EMPLOYEE** - Can only add and view their own expenses
2. **MANAGER** - Can create teams and approve expenses, but cannot create budgets
3. **ADMIN** - Full company access including budget management
4. **SUPER_ADMIN** - Full system access across all companies

**Budget Creation:** ADMIN and SUPER_ADMIN only  
**Team Creation:** MANAGER, ADMIN, and SUPER_ADMIN  
**Expense Visibility:** EMPLOYEE (own), ADMIN (all in company), SUPER_ADMIN (all)

---

**Status:** ✅ **IMPLEMENTED - Ready for Testing**

**Last Updated:** December 1, 2025  
**Version:** 1.0
