# Phase 3: Team Lead Role & Team Budgets - COMPLETED ✅

## 📋 Implementation Summary

Successfully implemented team lead role assignment and team budget management with validation against company overall budgets.

---

## ✅ Completed Features

### 1. Team Lead Role

**Assignment:**
- ✅ Admin/Manager can assign team lead to any team
- ✅ Team lead must be a member of the team
- ✅ Notification sent to team lead upon assignment
- ✅ Only one team lead per team

**Permissions:**
- ✅ Team lead can view team budget
- ✅ Team lead can manage team budget (update alert threshold)
- ✅ Team lead can view team expenses
- ❌ Team lead cannot change budget amount (Admin/Manager only)

**Who Can Assign:**
- ✅ Company Admin
- ✅ Company Manager
- ✅ Group Owner (for personal groups)
- ✅ Super Admin

### 2. Team Budget Management

**Budget Creation:**
- ✅ Admin/Manager sets budget for team
- ✅ Budget validated against company overall budget
- ✅ Auto-calculate spent amount from team expenses
- ✅ Alert thresholds (default 80%, customizable)
- ✅ Only one active budget per team per period

**Budget Updates:**
- ✅ Admin/Manager can update budget amount
- ✅ Team lead can update alert threshold only
- ✅ Re-validation when amount changes
- ✅ Sync with group's budget fields

**Budget Tracking:**
- ✅ Track budget allocations over time
- ✅ Historical budget records
- ✅ Spent amount auto-calculated
- ✅ Remaining budget calculated

### 3. Budget Validation

**Against Company Budget:**
- ✅ Sum of team budgets cannot exceed company budget
- ✅ Clear error message with remaining amount
- ✅ Validation on create and update
- ✅ Shows exact amounts when validation fails

**Error Example:**
```
"Team budgets total (45000) would exceed company budget (50000). Remaining: 5000"
```

### 4. Budget Alerts

**Alert Types:**
- ✅ **WARNING** - 80% threshold reached
- ✅ **CRITICAL** - 90% threshold reached
- ✅ **EXCEEDED** - 100% budget spent

**Alert Recipients:**
- ✅ Team Lead (primary recipient)
- ✅ Company Admin (copy)
- ✅ Company Manager (copy)
- ❌ Team members (not notified)

---

## 🗄️ Database Changes

### Updated Table: `groups`
```sql
ALTER TABLE groups ADD COLUMN team_lead_id BIGINT;
ALTER TABLE groups ADD COLUMN budget_amount DECIMAL(15,2);
ALTER TABLE groups ADD COLUMN budget_period_start DATE;
ALTER TABLE groups ADD COLUMN budget_period_end DATE;
ALTER TABLE groups ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE groups ADD CONSTRAINT fk_groups_team_lead 
    FOREIGN KEY (team_lead_id) REFERENCES users(id) ON DELETE SET NULL;
```

**New Fields:**
- `team_lead_id` - User assigned as team lead
- `budget_amount` - Current budget allocated to team
- `budget_period_start` - Start date of current budget
- `budget_period_end` - End date of current budget
- `budget_currency` - Currency for budget

### New Table: `team_budget_tracking`
```sql
CREATE TABLE team_budget_tracking (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    alert_threshold_percent INT DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_team_budget_period UNIQUE(group_id, period_start, period_end, is_active)
);
```

**Purpose:** Track team budget allocations and spending over time

**Constraints:**
- `chk_team_allocated_amount` - Must be positive
- `chk_team_spent_amount` - Must be non-negative
- `chk_team_alert_threshold` - Must be 1-100%
- `uk_team_budget_period` - One active budget per team per period

### New Table: `team_budget_alerts`
```sql
CREATE TABLE team_budget_alerts (
    id BIGSERIAL PRIMARY KEY,
    team_budget_id BIGINT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold_percent INT NOT NULL,
    spent_amount DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track sent alerts to avoid duplicates

---

## 🔧 Backend Changes

### 1. Updated Entities

**Group.java** (UPDATED)
- Added `teamLead` field (User reference)
- Added `budgetAmount` field
- Added `budgetPeriodStart` field
- Added `budgetPeriodEnd` field
- Added `budgetCurrency` field
- Added getters/setters for all new fields

**TeamBudget.java** (NEW)
- Fields: groupId, periodStart, periodEnd, allocatedAmount, spentAmount, currency, alertThresholdPercent, isActive
- Helper methods:
  - `getSpentPercentage()` - Calculate % of budget spent
  - `getRemainingAmount()` - Calculate remaining budget
  - `isExceeded()` - Check if 100% spent
  - `isAlertThresholdReached()` - Check if alert needed

### 2. Repositories

**TeamBudgetRepository.java** (NEW)
- `findByGroupId()` - Get all budgets for team
- `findByGroupIdAndIsActiveTrue()` - Get active budgets only
- `findActiveByGroupAndDate()` - Get budget for specific date
- `findByGroupAndDateRange()` - Get budgets in date range
- `findBudgetsOverThreshold()` - Find budgets needing alerts
- `findActiveByCompanyId()` - Get all active team budgets for company
- `existsByGroupIdAndPeriodStartAndPeriodEndAndIsActiveTrue()` - Check for duplicates

### 3. Services

**GroupService.java** (UPDATED)
- `assignTeamLead()` - Assign team lead to group
  - Validates user permission (Admin/Manager)
  - Verifies team lead is group member
  - Sends notification to team lead
  
- `removeTeamLead()` - Remove team lead from group
- `isTeamLead()` - Check if user is team lead
- `getGroupsLedBy()` - Get all groups where user is team lead
- `verifyCanManageTeam()` - Permission check helper

**TeamBudgetService.java** (NEW)
- `setTeamBudget()` - Create new team budget
  - Validates user permission (Admin/Manager)
  - Checks for existing active budget
  - Validates against company budget
  - Auto-calculates spent amount
  - Updates group's budget fields
  - Notifies team lead
  
- `updateTeamBudget()` - Update existing budget
  - Team lead can update alert threshold only
  - Admin/Manager can update amount
  - Re-validates on amount change
  
- `getCurrentBudget()` - Get active budget for today
- `listTeamBudgets()` - List all budgets (Team Lead/Admin/Manager)
- `recalculateSpentAmount()` - Refresh from expenses
- `validateAgainstCompanyBudget()` - Core validation logic
- `verifyCanManageBudget()` - Admin/Manager permission check
- `verifyCanViewBudget()` - Team Lead/Admin/Manager permission check

### 4. Controller

**TeamManagementController.java** (NEW)
- `POST /api/v1/teams/{groupId}/assign-lead` - Assign team lead
- `DELETE /api/v1/teams/{groupId}/team-lead` - Remove team lead
- `GET /api/v1/teams/led-by-me` - Get groups where user is team lead
- `POST /api/v1/teams/{groupId}/budget` - Set team budget
- `PUT /api/v1/teams/budgets/{budgetId}` - Update team budget
- `GET /api/v1/teams/{groupId}/budget/current` - Get current budget
- `GET /api/v1/teams/{groupId}/budgets` - List team budgets
- `POST /api/v1/teams/budgets/{budgetId}/recalculate` - Recalculate spent

---

## 📊 API Examples

### Assign Team Lead
```http
POST /api/v1/teams/5/assign-lead
Authorization: Bearer {token}
Content-Type: application/json

{
  "teamLeadUserId": 12
}
```

**Response:**
```json
{
  "id": 5,
  "name": "Engineering Team",
  "type": "TEAM",
  "companyId": 1,
  "teamLead": {
    "id": 12,
    "name": "John Doe",
    "email": "john@company.com"
  }
}
```

### Set Team Budget
```http
POST /api/v1/teams/5/budget
Authorization: Bearer {token}
Content-Type: application/json

{
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "allocatedAmount": 15000.00,
  "currency": "USD",
  "alertThresholdPercent": 80
}
```

**Response:**
```json
{
  "id": 1,
  "groupId": 5,
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "allocatedAmount": 15000.00,
  "spentAmount": 3500.00,
  "currency": "USD",
  "alertThresholdPercent": 80,
  "isActive": true,
  "createdBy": 8,
  "createdAt": "2025-12-04T10:45:00Z"
}
```

### Update Team Budget (Team Lead)
```http
PUT /api/v1/teams/budgets/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "alertThresholdPercent": 75
}
```

**Note:** Team lead can only update alert threshold, not amount.

### Budget Validation Error
```http
POST /api/v1/teams/5/budget
```

**Response (400 Bad Request):**
```json
{
  "code": "INVALID_REQUEST",
  "message": "Team budgets total (55000) would exceed company budget (50000). Remaining: 0"
}
```

---

## 🔐 Permission Matrix

| Action | Employee | Team Lead | Manager | Admin | Super Admin |
|--------|----------|-----------|---------|-------|-------------|
| **Assign team lead** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Remove team lead** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Set team budget** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Update budget amount** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Update alert threshold** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **View team budget** | ❌ | ✅ (own team) | ✅ | ✅ | ✅ |
| **Receive budget alerts** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **View team expenses** | ❌ | ✅ (own team) | ✅ | ✅ | ✅ |

---

## 🧪 Testing Scenarios

### Scenario 1: Assign Team Lead
**Setup:**
- User: admin@company.com (ADMIN role)
- Team: Engineering Team (ID: 5)
- Team Lead: john@company.com (ID: 12, EMPLOYEE role)

**Steps:**
1. POST /api/v1/teams/5/assign-lead
2. Body: { "teamLeadUserId": 12 }
3. Verify team lead assigned
4. Verify notification sent to John

**Expected:**
- ✅ Team lead assigned successfully
- ✅ John receives notification
- ✅ John can now view team budget

### Scenario 2: Set Team Budget
**Setup:**
- User: manager@company.com (MANAGER role)
- Team: Engineering Team (ID: 5)
- Company Budget: $50,000 for January
- Existing team budgets: Sales ($20,000), Marketing ($15,000)
- Remaining: $15,000

**Steps:**
1. POST /api/v1/teams/5/budget
2. Body: { "allocatedAmount": 12000, "periodStart": "2025-01-01", "periodEnd": "2025-01-31" }
3. Verify budget created

**Expected:**
- ✅ Budget created successfully
- ✅ Spent amount auto-calculated
- ✅ Team lead notified
- ✅ Validation passed (12000 < 15000 remaining)

### Scenario 3: Team Budget Exceeds Company Budget
**Setup:**
- Company Budget: $50,000
- Existing team budgets: $45,000
- Remaining: $5,000
- Trying to set: $10,000

**Steps:**
1. POST /api/v1/teams/5/budget
2. Body: { "allocatedAmount": 10000 }
3. Validation fails

**Expected:**
- ❌ Budget creation fails
- ✅ Error: "Team budgets total (55000) would exceed company budget (50000). Remaining: 5000"
- ✅ HTTP 400 Bad Request

### Scenario 4: Team Lead Updates Alert Threshold
**Setup:**
- User: john@company.com (Team Lead)
- Team Budget: ID 1, Alert threshold: 80%

**Steps:**
1. PUT /api/v1/teams/budgets/1
2. Body: { "alertThresholdPercent": 75 }
3. Verify update

**Expected:**
- ✅ Alert threshold updated to 75%
- ✅ Team lead can update (has permission)
- ❌ Team lead cannot update amount (no permission)

### Scenario 5: Team Lead Cannot Update Amount
**Setup:**
- User: john@company.com (Team Lead)
- Team Budget: ID 1, Amount: $15,000

**Steps:**
1. PUT /api/v1/teams/budgets/1
2. Body: { "allocatedAmount": 20000 }
3. Update fails

**Expected:**
- ❌ Amount not updated
- ✅ Only alert threshold can be updated by team lead
- ✅ Amount remains $15,000

### Scenario 6: Budget Alert
**Setup:**
- Team Budget: $10,000
- Alert threshold: 80%
- Current spent: $8,100 (81%)
- Team Lead: john@company.com

**Steps:**
1. POST /api/v1/teams/budgets/1/recalculate
2. Service calculates 81% spent
3. Alert triggered

**Expected:**
- ✅ Alert sent to team lead (John)
- ✅ Alert sent to company admin/manager
- ✅ Alert type: WARNING
- ✅ Message shows percentage and amounts
- ✅ Alert logged in team_budget_alerts

---

## 🚀 Deployment Status

**Database Migration:** ✅ V62__team_leads_and_budgets.sql
- Applied on startup
- Updates `groups` table
- Creates `team_budget_tracking` table
- Creates `team_budget_alerts` table
- Adds all indexes and constraints

**Backend:** ✅ Deployed
- Docker container rebuilt
- Application started successfully
- All endpoints available

**API Endpoints:** ✅ Active
- POST /api/v1/teams/{groupId}/assign-lead
- DELETE /api/v1/teams/{groupId}/team-lead
- GET /api/v1/teams/led-by-me
- POST /api/v1/teams/{groupId}/budget
- PUT /api/v1/teams/budgets/{budgetId}
- GET /api/v1/teams/{groupId}/budget/current
- GET /api/v1/teams/{groupId}/budgets
- POST /api/v1/teams/budgets/{budgetId}/recalculate

---

## 📝 Files Created/Modified

### New Files
1. `V62__team_leads_and_budgets.sql` - Database migration
2. `TeamBudget.java` - Entity
3. `TeamBudgetRepository.java` - Repository
4. `TeamBudgetService.java` - Business logic
5. `TeamManagementController.java` - REST API

### Modified Files
1. `Group.java` - Added team lead and budget fields
2. `GroupService.java` - Added team lead assignment methods

### Total Changes
- **New files:** 5
- **Modified files:** 2
- **Lines added:** ~700
- **Database tables:** 2 new, 1 updated

---

## ✨ Key Benefits

1. **Team Autonomy:** Team leads can manage their team's budget
2. **Budget Control:** Team budgets validated against company budget
3. **Visibility:** Team leads see team spending in real-time
4. **Accountability:** Clear ownership with team lead role
5. **Flexibility:** Admin/Manager can adjust budgets as needed
6. **Alerts:** Proactive notifications to team leads
7. **Hierarchy:** Clear permission structure (Employee → Team Lead → Manager → Admin)
8. **Audit:** Track who created/modified budgets and when

---

## 🔜 Next Steps

### Frontend Integration
- [ ] Create TeamLeadAssignmentScreen.tsx
- [ ] Create TeamBudgetScreen.tsx
- [ ] Team lead badge in group list
- [ ] Team budget progress bars
- [ ] Budget alerts display
- [ ] Team lead can view team expenses
- [ ] Budget management for team leads

### Additional Features
- [ ] Team lead can approve team expenses
- [ ] Team spending reports for team leads
- [ ] Budget forecasting
- [ ] Multi-period budget comparison
- [ ] Export team budget reports

---

## 📚 Integration Points

**With Company Budgets:**
- Team budgets validated against company overall budget
- Sum of team budgets cannot exceed company budget
- Real-time validation on create/update

**With Groups:**
- Team lead assigned to group
- Budget fields synced with group
- Team expenses tracked per group

**With Expenses:**
- Spent amount auto-calculated from team expenses
- Real-time tracking of team spending
- Recalculate on demand

**With Notifications:**
- Alerts sent to team lead
- Copy to Admin/Manager
- Multiple alert levels (80%, 90%, 100%)
- Alert tracking to prevent duplicates

---

## 🎯 Success Criteria

- [x] Admin/Manager can assign team lead
- [x] Team lead receives notification
- [x] Admin/Manager can set team budget
- [x] Team budgets validated against company budget
- [x] Team lead can view team budget
- [x] Team lead can update alert threshold
- [x] Team lead cannot update budget amount
- [x] Alerts sent to team lead at threshold
- [x] Spent amount auto-calculated
- [x] Proper permission checks
- [x] Historical budget tracking

---

## 📊 Complete Budget Hierarchy

```
Company Overall Budget ($100,000)
├── Team 1 Budget ($30,000)
│   ├── Category: Travel ($10,000)
│   ├── Category: Food ($8,000)
│   └── Category: Office ($12,000)
├── Team 2 Budget ($40,000)
│   ├── Category: Travel ($15,000)
│   ├── Category: Equipment ($20,000)
│   └── Category: Training ($5,000)
└── Team 3 Budget ($25,000)
    ├── Category: Marketing ($15,000)
    └── Category: Events ($10,000)

Validation Rules:
- Sum of Team Budgets ≤ Company Budget
- Sum of Category Budgets ≤ Team Budget
- Sum of Category Budgets ≤ Company Budget
```

---

**Status:** ✅ PHASE 3 COMPLETE  
**Date:** December 4, 2025  
**Backend:** Deployed and Running  
**Frontend:** Pending  
**All 3 Phases:** BACKEND COMPLETE ✅

---

## 🎉 Summary of All 3 Phases

### Phase 1: Expense Visibility & RBAC ✅
- Role-based expense visibility
- Reimbursement approval rules
- Manager can only approve employee expenses

### Phase 2: Overall Company Budget ✅
- Total budget ceiling for company
- Category budgets validated against overall
- Budget extension capability
- Alerts at configurable thresholds

### Phase 3: Team Lead Role & Team Budgets ✅
- Team lead assignment
- Team budget management
- Team budgets validated against company budget
- Team lead can manage budget (limited permissions)

**Total Implementation:**
- 3 Database migrations
- 10+ New entities
- 15+ New services/repositories
- 20+ New API endpoints
- Complete RBAC system
- Multi-level budget hierarchy
- Comprehensive validation
- Alert system
- Audit logging

**Ready for Frontend Integration! 🚀**
