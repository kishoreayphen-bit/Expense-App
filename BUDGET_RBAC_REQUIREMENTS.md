# Budget & RBAC Requirements - Comprehensive Analysis

## 📋 Requirements Summary

### 1. Expense Visibility Rules

#### Current State
- All expenses visible to all company members

#### Required State
**Employee Expenses:**
- ✅ Visible to: Employee (owner), Manager, Admin
- ❌ Not visible to: Other employees

**Manager Expenses:**
- ✅ Visible to: Manager (owner), Admin
- ❌ Not visible to: Employees, Other managers

**Admin Expenses:**
- ✅ Visible to: Admin (owner), Other admins
- ❌ Not visible to: Employees, Managers

### 2. Reimbursement Approval Rules

#### Current State
- Managers can approve reimbursements

#### Required State
**Approval Authority:**
- ✅ Company Admin: Can approve ALL reimbursements
- ✅ Manager: Can approve employee reimbursements only
- ❌ Employee: Cannot approve any reimbursements

**Approval Flow:**
- Employee submits → Manager/Admin approves
- Manager submits → Admin approves
- Admin submits → Other admin approves

### 3. Budget Management System

#### A. Overall Company Budget (NEW)
**Who can set:**
- ✅ Company Admin
- ✅ Manager

**Visibility:**
- ✅ Admin
- ✅ Manager
- ❌ Employee

**Features:**
- Set total budget for company (not category-wise)
- Period: Monthly, Yearly, or Custom date range
- Acts as ceiling for all category budgets
- Real-time tracking of spent vs budget

#### B. Category Budgets (EXISTING - Enhanced)
**Who can set:**
- ✅ Company Admin
- ✅ Manager

**Rules:**
- Must be within overall company budget
- Sum of all category budgets ≤ Overall budget
- When category budget exceeds overall budget:
  - Show warning dialog
  - Option 1: "Extend Overall Budget"
  - Option 2: "Reduce Category Budget"
  - Option 3: "Cancel"

**Visibility:**
- ✅ Admin: All budgets
- ✅ Manager: All budgets
- ❌ Employee: No budget visibility

#### C. Team Budgets (NEW)
**Team Structure:**
- Admin/Manager creates team
- Assigns Team Lead during creation
- Team Lead role: Special permission level

**Team Lead Capabilities:**
- ✅ View team budget
- ✅ Manage team budget (within limits)
- ✅ View team expenses
- ✅ Track team spending
- ❌ Cannot exceed assigned budget without approval

**Who can set team budgets:**
- ✅ Company Admin
- ✅ Manager
- ❌ Team Lead (can only manage, not set)

**Visibility:**
- ✅ Admin: All team budgets
- ✅ Manager: All team budgets
- ✅ Team Lead: Own team budget only
- ❌ Employee: No team budget visibility

---

## 🏗️ Implementation Plan

### Phase 1: Expense Visibility & RBAC

#### 1.1 Database Schema Changes
```sql
-- Add role-based visibility to expenses
ALTER TABLE expenses ADD COLUMN visibility_level VARCHAR(20) DEFAULT 'STANDARD';
-- Values: STANDARD, MANAGER_ONLY, ADMIN_ONLY

-- Track who can view each expense
CREATE TABLE expense_viewers (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES expenses(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    can_view BOOLEAN DEFAULT true,
    can_approve BOOLEAN DEFAULT false,
    UNIQUE(expense_id, user_id)
);
```

#### 1.2 Backend Changes
**Files to modify:**
- `ExpenseService.java` - Add visibility filtering
- `ExpenseRepository.java` - Add queries for role-based filtering
- `ReimbursementService.java` - Update approval logic
- `CompanyMemberRepository.java` - Add role hierarchy queries

**New methods:**
```java
// ExpenseService.java
List<Expense> listVisibleExpenses(User viewer, Long companyId);
boolean canViewExpense(User viewer, Expense expense);
boolean canApproveReimbursement(User approver, Expense expense);

// New visibility rules
- Employee sees: Own expenses only
- Manager sees: Own expenses + employee expenses in company
- Admin sees: All company expenses
```

#### 1.3 Frontend Changes
**Files to modify:**
- `ExpensesScreen.tsx` - Filter based on user role
- `ExpenseDetailScreen.tsx` - Show/hide approve button based on role
- `ReimbursementScreen.tsx` - Filter reimbursements by role

---

### Phase 2: Overall Company Budget

#### 2.1 Database Schema
```sql
-- New table for overall company budgets
CREATE TABLE company_budgets (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    period_type VARCHAR(20) NOT NULL, -- MONTHLY, YEARLY, CUSTOM
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    alert_threshold_percent INT DEFAULT 80,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, period_start, period_end)
);

-- Index for fast lookups
CREATE INDEX idx_company_budgets_company_period 
ON company_budgets(company_id, period_start, period_end);
```

#### 2.2 Backend Implementation
**New files:**
- `CompanyBudget.java` - Entity
- `CompanyBudgetRepository.java` - Repository
- `CompanyBudgetService.java` - Business logic
- `CompanyBudgetController.java` - REST API

**Endpoints:**
```
POST   /api/v1/company-budgets          - Create overall budget
PUT    /api/v1/company-budgets/{id}     - Update overall budget
DELETE /api/v1/company-budgets/{id}     - Delete overall budget
GET    /api/v1/company-budgets          - List budgets (Admin/Manager only)
GET    /api/v1/company-budgets/current  - Get current period budget
POST   /api/v1/company-budgets/{id}/extend - Extend budget amount
```

**Business Rules:**
```java
// CompanyBudgetService.java
- Only ADMIN and MANAGER can create/update
- Validate: Sum of category budgets ≤ Overall budget
- Auto-calculate spent amount from expenses
- Send alerts at 80%, 90%, 100%
- Block category budget creation if exceeds overall
```

#### 2.3 Frontend Implementation
**New screen:**
- `CompanyBudgetScreen.tsx` - Manage overall budget

**Features:**
- Create overall budget form
- Period selector (Monthly/Yearly/Custom)
- Amount input with validation
- Progress bar showing spent vs budget
- Alert indicators
- Category budget breakdown
- Extend budget dialog

---

### Phase 3: Team Lead Role & Team Budgets

#### 3.1 Database Schema
```sql
-- Add team_lead_id to groups table
ALTER TABLE groups ADD COLUMN team_lead_id BIGINT REFERENCES users(id);
ALTER TABLE groups ADD COLUMN budget_amount DECIMAL(15,2);
ALTER TABLE groups ADD COLUMN budget_period_start DATE;
ALTER TABLE groups ADD COLUMN budget_period_end DATE;

-- Track team budget usage
CREATE TABLE team_budget_tracking (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groups(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, period_start, period_end)
);
```

#### 3.2 Backend Changes
**Files to modify:**
- `Group.java` - Add teamLeadId, budgetAmount fields
- `GroupService.java` - Add team lead assignment logic
- `BudgetService.java` - Add team budget validation

**New methods:**
```java
// GroupService.java
void assignTeamLead(Long groupId, Long userId, User assignedBy);
boolean isTeamLead(Long userId, Long groupId);
List<Group> getTeamsLedBy(Long userId);

// BudgetService.java
void setTeamBudget(Long groupId, BigDecimal amount, User setBy);
BigDecimal getTeamSpending(Long groupId, LocalDate start, LocalDate end);
boolean canTeamLeadManageBudget(Long userId, Long groupId);
```

#### 3.3 Frontend Changes
**Files to modify:**
- `CreateTeamScreen.tsx` - Add team lead selector
- `GroupDetailScreen.tsx` - Show team lead badge
- `BudgetsScreen.tsx` - Add team budget section

**New screen:**
- `TeamBudgetScreen.tsx` - Team lead budget management

---

### Phase 4: Budget Validation & Alerts

#### 4.1 Backend Logic
**CompanyBudgetService.java:**
```java
public void validateCategoryBudgetAgainstOverall(
    Long companyId, 
    String category, 
    BigDecimal categoryAmount,
    LocalDate periodStart,
    LocalDate periodEnd
) {
    // Get overall budget for period
    CompanyBudget overall = getOverallBudget(companyId, periodStart, periodEnd);
    
    // Get sum of all other category budgets
    BigDecimal otherCategoryTotal = budgetRepository
        .sumCategoryBudgets(companyId, periodStart, periodEnd, category);
    
    // Check if new category budget would exceed overall
    BigDecimal totalWithNew = otherCategoryTotal.add(categoryAmount);
    
    if (totalWithNew.compareTo(overall.getTotalAmount()) > 0) {
        throw new BudgetExceededException(
            "Category budgets total would exceed overall budget",
            overall.getTotalAmount(),
            totalWithNew
        );
    }
}
```

#### 4.2 Frontend Validation
**BudgetsScreen.tsx:**
```typescript
const handleSaveCategoryBudget = async () => {
    try {
        await api.post('/api/v1/budgets', budgetData);
        showSuccess('Budget saved');
    } catch (error) {
        if (error.response?.data?.code === 'BUDGET_EXCEEDED') {
            // Show extend budget dialog
            setShowExtendDialog(true);
            setExceedInfo({
                overall: error.response.data.overallBudget,
                proposed: error.response.data.proposedTotal,
                difference: error.response.data.difference
            });
        }
    }
};
```

---

## 📊 Role Permission Matrix

| Feature | Employee | Team Lead | Manager | Admin |
|---------|----------|-----------|---------|-------|
| **Expenses** |
| View own expenses | ✅ | ✅ | ✅ | ✅ |
| View employee expenses | ❌ | ✅ (team only) | ✅ | ✅ |
| View manager expenses | ❌ | ❌ | ✅ (own) | ✅ |
| View admin expenses | ❌ | ❌ | ❌ | ✅ |
| **Reimbursements** |
| Submit claim | ✅ | ✅ | ✅ | ✅ |
| Approve employee claims | ❌ | ❌ | ✅ | ✅ |
| Approve manager claims | ❌ | ❌ | ❌ | ✅ |
| **Budgets** |
| View overall budget | ❌ | ❌ | ✅ | ✅ |
| Set overall budget | ❌ | ❌ | ✅ | ✅ |
| View category budgets | ❌ | ❌ | ✅ | ✅ |
| Set category budgets | ❌ | ❌ | ✅ | ✅ |
| View team budget | ❌ | ✅ (own team) | ✅ | ✅ |
| Set team budget | ❌ | ❌ | ✅ | ✅ |
| Manage team budget | ❌ | ✅ (own team) | ✅ | ✅ |
| **Teams** |
| Create team | ❌ | ❌ | ✅ | ✅ |
| Assign team lead | ❌ | ❌ | ✅ | ✅ |
| View team expenses | ❌ | ✅ (own team) | ✅ | ✅ |

---

## 🔄 Migration Strategy

### Step 1: Database Migrations
```sql
-- V60__expense_visibility.sql
-- V61__company_budgets.sql
-- V62__team_leads_and_budgets.sql
```

### Step 2: Backend Implementation Order
1. ✅ Expense visibility filtering
2. ✅ Reimbursement approval rules
3. ✅ Overall company budget
4. ✅ Team lead role
5. ✅ Team budgets
6. ✅ Budget validation logic

### Step 3: Frontend Implementation Order
1. ✅ Expense list filtering
2. ✅ Reimbursement approval UI
3. ✅ Company budget screen
4. ✅ Team lead assignment
5. ✅ Team budget management
6. ✅ Budget exceed dialogs

---

## 🎯 Success Criteria

### Expense Visibility
- [x] Employee sees only own expenses
- [x] Manager sees employee + own expenses
- [x] Admin sees all company expenses
- [x] Proper 403 errors for unauthorized access

### Reimbursement Approval
- [x] Manager can approve employee claims
- [x] Admin can approve all claims
- [x] Employee cannot approve any claims
- [x] Approval flow enforced in backend

### Overall Budget
- [x] Admin/Manager can set overall budget
- [x] Visible only to Admin/Manager
- [x] Category budgets validated against overall
- [x] Extend budget option when exceeded

### Team Budgets
- [x] Team lead assigned during team creation
- [x] Team lead can view/manage team budget
- [x] Team budget within overall company budget
- [x] Team spending tracked separately

---

## 📝 API Endpoints Summary

### Expense Visibility
```
GET /api/v1/expenses?role-filter=true
GET /api/v1/expenses/{id}/can-view
GET /api/v1/expenses/{id}/can-approve
```

### Company Budgets
```
POST   /api/v1/company-budgets
GET    /api/v1/company-budgets/current
PUT    /api/v1/company-budgets/{id}
POST   /api/v1/company-budgets/{id}/extend
DELETE /api/v1/company-budgets/{id}
```

### Team Management
```
POST   /api/v1/groups/{id}/assign-lead
GET    /api/v1/groups/{id}/budget
PUT    /api/v1/groups/{id}/budget
GET    /api/v1/groups/led-by-me
```

### Budget Validation
```
POST   /api/v1/budgets/validate
GET    /api/v1/budgets/summary?companyId={id}
```

---

## 🚀 Implementation Timeline

### Week 1: Expense Visibility & RBAC
- Database schema for visibility
- Backend filtering logic
- Frontend expense list filtering
- Reimbursement approval rules

### Week 2: Overall Company Budget
- Database schema for company budgets
- Backend CRUD operations
- Frontend company budget screen
- Validation logic

### Week 3: Team Lead & Team Budgets
- Database schema for team leads
- Team lead assignment logic
- Team budget management
- Frontend team budget screens

### Week 4: Integration & Testing
- Budget validation integration
- Extend budget dialogs
- End-to-end testing
- Documentation

---

## ⚠️ Important Notes

1. **Backward Compatibility:**
   - Existing budgets remain as category budgets
   - No data migration needed for expenses
   - Default visibility level for old expenses

2. **Performance Considerations:**
   - Index on expense visibility fields
   - Cache role permissions
   - Optimize budget calculation queries

3. **Security:**
   - All endpoints protected with @PreAuthorize
   - Role checks in service layer
   - Audit logging for budget changes

4. **User Experience:**
   - Clear error messages when budget exceeded
   - Visual indicators for budget status
   - Helpful dialogs for budget extension

---

## 📚 Related Documents

- User Stories: `ExpenseApp_UserStories.md`
- Database Schema: `docs/database-schema.md`
- API Documentation: `docs/api-endpoints.md`
- Role Permissions: `docs/rbac-matrix.md`

---

**Status:** Requirements Documented  
**Next Step:** Begin Phase 1 Implementation  
**Estimated Effort:** 4 weeks (full-time)
