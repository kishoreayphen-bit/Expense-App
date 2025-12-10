# 🚀 Role-Based Access Control & Reimbursement Implementation Summary

## ✅ Backend Implementation (COMPLETED)

### 1. Database Schema Updates
**File:** `V46__reimbursement_and_budget_permissions.sql`

**Changes:**
- ✅ Added `bill_number` field to expenses table with index
- ✅ Added reimbursement fields to expenses:
  - `reimbursement_status` (PENDING, APPROVED, REJECTED, PAID)
  - `reimbursement_requested_at`, `reimbursement_approved_at`, `reimbursement_paid_at`
  - `reimbursement_approved_by` (FK to users)
  - `reimbursement_notes`
- ✅ Created `budget_permissions` table for granular budget access control
- ✅ Added `team_lead_id` to groups table (FK to users)
- ✅ Updated existing groups to have owner as team lead

### 2. Entity Updates
**Files Updated:**
- ✅ `Expense.java` - Added bill_number and reimbursement fields
- ✅ `Group.java` - Added teamLead field
- ✅ `BudgetPermission.java` - New entity for budget permissions

### 3. Repositories
**Files Created:**
- ✅ `BudgetPermissionRepository.java`

**Files Updated:**
- ✅ `ExpenseRepository.java` - Added reimbursement query methods

### 4. Services
**Files Created:**
- ✅ `ReimbursementService.java` - Complete reimbursement workflow
  - Request reimbursement
  - Approve/reject reimbursement
  - Mark as paid
  - List pending/history
  - Admin/manager verification
- ✅ `BudgetPermissionService.java` - Budget permission management
  - Check if user can create budgets
  - Grant/revoke permissions
  - Role-based default access (ADMIN, MANAGER)

**Files Updated:**
- ✅ `BudgetService.java` - Added permission checks for budget creation

### 5. Controllers
**Files Created:**
- ✅ `ReimbursementController.java` - REST endpoints for reimbursement

**API Endpoints Added:**
```
POST   /api/v1/reimbursements/request/{expenseId}
POST   /api/v1/reimbursements/approve/{expenseId}
POST   /api/v1/reimbursements/reject/{expenseId}
POST   /api/v1/reimbursements/mark-paid/{expenseId}
GET    /api/v1/reimbursements/pending?companyId={id}
GET    /api/v1/reimbursements/history?companyId={id}
```

## 📋 Frontend Implementation (TODO)

### 1. Remove Splits/Chat from Company Mode
**File:** `GroupsScreen.tsx`

**Changes Needed:**
- Hide split composer in company mode
- Hide chat functionality in company mode
- Show only team list in company mode
- Keep splits/chat in personal mode

**Approach:**
```tsx
// Conditional rendering based on isCompanyMode
{!isCompanyMode && (
  <>
    {/* Split composer */}
    {/* Chat UI */}
  </>
)}
```

### 2. Add Bill Number to Expense Creation
**File:** `AddExpenseScreen.tsx`

**Changes Needed:**
- Add `billNumber` field to expense form
- Add auto-fetch button to load bill details by bill number
- Populate fields from bill (merchant, amount, currency, date)

**API Integration:**
```tsx
const fetchBillByNumber = async (billNumber: string) => {
  const bill = await BillService.searchByBillNumber(billNumber);
  if (bill) {
    setMerchant(bill.merchant);
    setAmount(bill.amount.toString());
    setCurrency(bill.currency);
    setDate(bill.billDate);
  }
};
```

### 3. Add Date Range & Currency Filters
**File:** `ExpensesScreen.tsx`

**Changes Needed:**
- Add date range picker (start date, end date)
- Add currency dropdown filter
- Add category filter dropdown
- Apply filters to expense list

**UI Components:**
```tsx
<DateRangePicker 
  startDate={startDate}
  endDate={endDate}
  onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
/>
<CurrencyFilter 
  selected={currencyFilter}
  onChange={setCurrencyFilter}
/>
<CategoryFilter
  selected={categoryFilter}
  onChange={setCategoryFilter}
/>
```

### 4. Add Reimbursement Option to Expense Creation
**File:** `AddExpenseScreen.tsx`

**Changes Needed:**
- Add `isReimbursable` checkbox
- If checked, show "Request Reimbursement" button after saving
- Automatically request reimbursement after expense is created

**Flow:**
```tsx
const handleSave = async () => {
  const expense = await saveExpense({...formData, isReimbursable});
  if (isReimbursable && expense.companyId) {
    await ReimbursementService.requestReimbursement(expense.id);
    Alert.alert('Success', 'Expense saved and reimbursement requested!');
  }
};
```

### 5. Create Claims Dashboard for Admin/Manager
**File:** `ClaimsScreen.tsx` (NEW)

**Features:**
- Tab view: Pending / Approved / Rejected / Paid
- List of reimbursement claims
- Approve/Reject actions
- Mark as paid action
- Claim history

**Components:**
```tsx
<ClaimsList 
  claims={pendingClaims}
  onApprove={handleApprove}
  onReject={handleReject}
  onMarkPaid={handleMarkPaid}
/>
```

### 6. Budget Access Control UI
**File:** `BudgetsScreen.tsx`

**Changes Needed:**
- Check budget creation permission before showing "Add Budget" button
- Show permission error if user can't create budgets
- Add permission management UI for admins

**Permission Check:**
```tsx
const canCreateBudgets = useMemo(() => {
  if (!activeCompanyId) return true; // Personal mode
  return userRole === 'ADMIN' || userRole === 'MANAGER' || hasBudgetPermission;
}, [activeCompanyId, userRole, hasBudgetPermission]);
```

### 7. Team Lead Budget Management
**File:** `BudgetsScreen.tsx` & `GroupsScreen.tsx`

**Changes Needed:**
- Only show team budgets to team lead
- Allow team lead to create/edit team budgets
- Other team members can only view their own expenses

**Team Lead Check:**
```tsx
const isTeamLead = useMemo(() => {
  return selectedGroup?.teamLead?.id === currentUserId;
}, [selectedGroup, currentUserId]);
```

### 8. Add Tab Slider to Bottom Navigation
**File:** `MainTabs.tsx`

**Changes Needed:**
- Wrap tab bar in ScrollView
- Enable horizontal scrolling
- Show all tab names fully

**Implementation:**
```tsx
<Tab.Navigator
  tabBar={props => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <BottomTabBar {...props} />
    </ScrollView>
  )}
>
```

### 9. Team Creation Restrictions
**File:** `CreateTeamScreen.tsx` or `GroupsScreen.tsx`

**Changes Needed:**
- Hide "Create Team" button for employees in company mode
- Only show for ADMIN and MANAGER roles
- Show permission message if employee tries to create

**Role Check:**
```tsx
const canCreateTeam = useMemo(() => {
  if (!activeCompanyId) return true; // Personal mode
  return userRole === 'ADMIN' || userRole === 'MANAGER';
}, [activeCompanyId, userRole]);
```

## 🎯 Access Control Rules

### Budget Creation
| Role | Can Create Budgets | Notes |
|------|-------------------|-------|
| ADMIN | ✅ Default | Can create and grant permissions |
| MANAGER | ✅ Default | Can create for teams they manage |
| EMPLOYEE | ❌ Default | Needs explicit permission from admin |

### Reimbursement Approval
| Role | Can Approve | Can Request |
|------|------------|-------------|
| ADMIN | ✅ | ✅ |
| MANAGER | ✅ | ✅ |
| EMPLOYEE | ❌ | ✅ |

### Team Management
| Role | Create Teams | Manage Budgets | View Budgets |
|------|-------------|----------------|--------------|
| ADMIN | ✅ | All teams | All teams |
| MANAGER | ✅ | Teams they lead | All teams |
| TEAM_LEAD | ❌ | Their team only | Their team only |
| EMPLOYEE | ❌ | None | None |

## 📊 User Flows

### Reimbursement Flow
1. **Employee** creates expense with `isReimbursable = true`
2. **Employee** clicks "Request Reimbursement"
3. **System** creates reimbursement request (status = PENDING)
4. **System** notifies ADMIN/MANAGER
5. **Admin/Manager** reviews claim
6. **Admin/Manager** approves/rejects with notes
7. **System** notifies employee of decision
8. **Admin/Manager** marks as paid (if approved)
9. **System** updates status to PAID

### Budget Creation Flow
1. **User** attempts to create budget
2. **System** checks permission:
   - Personal mode → Allow
   - Company mode + ADMIN/MANAGER → Allow
   - Company mode + EMPLOYEE → Check budget_permissions table
3. If allowed, show budget creation form
4. If not allowed, show permission error

### Team Budget Flow
1. **Team Lead** creates budget for their team
2. **Team Members** add expenses to the team
3. **Team Lead** monitors budget progress
4. **Only Team Lead** can view/edit team budgets
5. **Other members** cannot see team budget details

## 🔧 Testing Checklist

### Backend Tests
- [ ] Reimbursement request creates properly
- [ ] Admin can approve/reject
- [ ] Manager can approve/reject
- [ ] Employee cannot approve/reject
- [ ] Budget permission checks work
- [ ] ADMIN/MANAGER have default budget access
- [ ] EMPLOYEE needs explicit permission
- [ ] Team lead can manage team budgets

### Frontend Tests
- [ ] Splits/chat hidden in company mode
- [ ] Bill number auto-fetch works
- [ ] Date range filter works
- [ ] Currency filter works
- [ ] Category filter works
- [ ] Reimbursement request flow works
- [ ] Claims dashboard shows properly for admin/manager
- [ ] Tab slider scrolls horizontally
- [ ] Budget creation respects permissions
- [ ] Team creation restricted to admin/manager

## 🚨 Important Notes

1. **DO NOT BREAK EXISTING FUNCTIONALITY**
   - All existing features must continue to work
   - Personal mode remains unchanged
   - Group/split functionality preserved in personal mode

2. **Company Mode Restrictions**
   - No splits (company-wide expense tracking only)
   - No chat (use team coordination tools instead)
   - Teams only (no personal groups in company mode)

3. **Default Values**
   - Existing groups: `team_lead_id` = `owner_id`
   - ADMIN/MANAGER: Automatic budget permission
   - EMPLOYEE: Requires explicit permission grant

4. **Notifications**
   - Reimbursement request → Notify all ADMIN/MANAGER
   - Reimbursement approved → Notify employee
   - Reimbursement rejected → Notify employee with reason
   - Budget limit crossed → Notify team lead / admin

## 📦 Next Steps

1. ✅ Backend implementation (DONE)
2. ⏳ Frontend UI updates (IN PROGRESS)
3. ⏳ Mobile API service updates
4. ⏳ Testing and validation
5. ⏳ Docker rebuild and deployment

## 🔄 Docker Rebuild Command

After all backend changes:
```bash
cd d:\Expenses
docker-compose down
docker-compose up -d --build backend
docker logs -f expense_backend
```

Wait for backend to start successfully, then test all endpoints.

---

**Last Updated:** Implementation in progress
**Status:** Backend ✅ | Frontend ⏳ | Testing ⏳
