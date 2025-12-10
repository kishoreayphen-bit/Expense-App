# Phase 2: Overall Company Budget - COMPLETED ✅

## 📋 Implementation Summary

Successfully implemented overall/total company budget management system with validation against category budgets.

---

## ✅ Completed Features

### 1. Overall Company Budget

**Purpose:**
- Set total budget ceiling for company (not category-specific)
- Acts as upper limit for all category budgets
- Visible only to Admin and Manager (not Employee)

**Supported Period Types:**
- ✅ **MONTHLY** - Budget for a specific month
- ✅ **YEARLY** - Budget for entire year
- ✅ **QUARTERLY** - Budget for 3-month quarter
- ✅ **CUSTOM** - Budget for any date range

**Key Features:**
- ✅ Auto-calculate spent amount from expenses
- ✅ Alert thresholds (default 80%, customizable)
- ✅ Budget extension capability
- ✅ Validation against category budgets
- ✅ Only one active budget per company per period

### 2. Budget Validation

**Category Budget Validation:**
- ✅ Sum of category budgets cannot exceed overall budget
- ✅ Clear error message when validation fails
- ✅ Shows exact amounts: overall, proposed total, difference
- ✅ Option to extend overall budget when exceeded

**Error Response:**
```json
{
  "code": "BUDGET_EXCEEDED",
  "message": "Sum of category budgets (15000) exceeds overall budget (10000)",
  "overallBudget": 10000,
  "proposedTotal": 15000,
  "difference": 5000
}
```

### 3. Budget Alerts

**Alert Types:**
- ✅ **WARNING** - 80% threshold reached
- ✅ **CRITICAL** - 90% threshold reached  
- ✅ **EXCEEDED** - 100% budget spent

**Alert Recipients:**
- ✅ Company Owner
- ✅ Company Admin
- ✅ Company Manager
- ❌ Employees (not notified)

**Alert Tracking:**
- ✅ Prevents duplicate alerts
- ✅ Tracks when alerts were sent
- ✅ Records threshold percentage and amounts

---

## 🗄️ Database Changes

### New Table: `company_budgets`
```sql
CREATE TABLE company_budgets (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    alert_threshold_percent INT DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_company_budget_period UNIQUE(company_id, period_start, period_end, is_active)
);
```

**Constraints:**
- `chk_period_type` - Must be MONTHLY, YEARLY, QUARTERLY, or CUSTOM
- `chk_total_amount` - Must be positive
- `chk_spent_amount` - Must be non-negative
- `chk_alert_threshold` - Must be 1-100%
- `uk_company_budget_period` - One active budget per period

**Indexes:**
- `idx_company_budgets_company` - Fast lookup by company
- `idx_company_budgets_period` - Fast lookup by date range
- `idx_company_budgets_active` - Filter active budgets
- `idx_company_budgets_company_period` - Combined lookup

### New Table: `company_budget_alerts`
```sql
CREATE TABLE company_budget_alerts (
    id BIGSERIAL PRIMARY KEY,
    company_budget_id BIGINT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold_percent INT NOT NULL,
    spent_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track sent alerts to avoid duplicates

---

## 🔧 Backend Changes

### 1. New Entities

**CompanyBudget.java**
- Fields: companyId, periodType, periodStart, periodEnd, totalAmount, spentAmount, currency, alertThresholdPercent, isActive
- Helper methods:
  - `getSpentPercentage()` - Calculate % of budget spent
  - `getRemainingAmount()` - Calculate remaining budget
  - `isExceeded()` - Check if 100% spent
  - `isAlertThresholdReached()` - Check if alert needed

**BudgetExceededException.java** (NEW)
- Custom exception for budget validation failures
- Fields: overallBudget, proposedTotal, difference
- Used in API error responses

### 2. Repository

**CompanyBudgetRepository.java**
- `findByCompanyId()` - Get all budgets for company
- `findByCompanyIdAndIsActiveTrue()` - Get active budgets only
- `findActiveByCompanyAndDate()` - Get budget for specific date
- `findByCompanyAndDateRange()` - Get budgets in date range
- `findBudgetsOverThreshold()` - Find budgets needing alerts
- `existsByCompanyIdAndPeriodStartAndPeriodEndAndIsActiveTrue()` - Check for duplicates

### 3. Service

**CompanyBudgetService.java**
- `createCompanyBudget()` - Create new overall budget
  - Validates user permission (Admin/Manager)
  - Checks for existing active budget
  - Validates against category budgets
  - Auto-calculates spent amount
  
- `updateCompanyBudget()` - Update existing budget
  - Re-validates on amount change
  - Updates timestamp
  
- `getCurrentBudget()` - Get active budget for today
- `getBudgetForPeriod()` - Get budget for specific period
- `listCompanyBudgets()` - List all budgets (Admin/Manager only)
- `extendBudget()` - Increase budget amount
- `recalculateSpentAmount()` - Refresh from expenses
- `validateCategoryBudgetsWithinOverall()` - Core validation logic

**Permission Checks:**
- `verifyCanManageBudget()` - Admin/Manager/Owner only
- `verifyCanViewBudget()` - Admin/Manager/Owner only (not Employee)

### 4. Controller

**CompanyBudgetController.java**
- `POST /api/v1/company-budgets` - Create budget
- `PUT /api/v1/company-budgets/{id}` - Update budget
- `GET /api/v1/company-budgets/current` - Get current budget
- `GET /api/v1/company-budgets` - List budgets
- `POST /api/v1/company-budgets/{id}/extend` - Extend budget
- `POST /api/v1/company-budgets/{id}/recalculate` - Recalculate spent
- `DELETE /api/v1/company-budgets/{id}` - Deactivate budget

**All endpoints require:** `@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'SUPER_ADMIN')")`

---

## 📊 API Examples

### Create Monthly Budget
```http
POST /api/v1/company-budgets?companyId=1
Authorization: Bearer {token}
Content-Type: application/json

{
  "periodType": "MONTHLY",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "totalAmount": 50000.00,
  "currency": "USD",
  "alertThresholdPercent": 80
}
```

**Response:**
```json
{
  "id": 1,
  "companyId": 1,
  "periodType": "MONTHLY",
  "periodStart": "2025-01-01",
  "periodEnd": "2025-01-31",
  "totalAmount": 50000.00,
  "spentAmount": 12500.00,
  "currency": "USD",
  "alertThresholdPercent": 80,
  "isActive": true,
  "createdBy": 5,
  "createdAt": "2025-12-04T10:30:00Z"
}
```

### Get Current Budget
```http
GET /api/v1/company-budgets/current?companyId=1
Authorization: Bearer {token}
```

### Extend Budget
```http
POST /api/v1/company-budgets/1/extend
Authorization: Bearer {token}
Content-Type: application/json

{
  "additionalAmount": 10000.00
}
```

### Budget Exceeded Error
```http
POST /api/v1/company-budgets?companyId=1
```

**Response (400 Bad Request):**
```json
{
  "code": "BUDGET_EXCEEDED",
  "message": "Sum of category budgets (55000) exceeds overall budget (50000)",
  "overallBudget": 50000,
  "proposedTotal": 55000,
  "difference": 5000
}
```

---

## 🔐 Permission Matrix

| Action | Employee | Manager | Admin | Super Admin |
|--------|----------|---------|-------|-------------|
| **View overall budget** | ❌ | ✅ | ✅ | ✅ |
| **Create overall budget** | ❌ | ✅ | ✅ | ✅ |
| **Update overall budget** | ❌ | ✅ | ✅ | ✅ |
| **Extend budget** | ❌ | ✅ | ✅ | ✅ |
| **Deactivate budget** | ❌ | ❌ | ✅ | ✅ |
| **Recalculate spent** | ❌ | ❌ | ✅ | ✅ |
| **Receive budget alerts** | ❌ | ✅ | ✅ | ✅ |

---

## 🧪 Testing Scenarios

### Scenario 1: Create Monthly Budget
**Setup:**
- User: admin@company.com (ADMIN role)
- Company: Acme Corp (ID: 1)
- Period: January 2025
- Amount: $50,000

**Steps:**
1. POST /api/v1/company-budgets?companyId=1
2. Verify budget created with ID
3. Verify spentAmount auto-calculated from existing expenses
4. Verify isActive = true

**Expected:**
- ✅ Budget created successfully
- ✅ Spent amount calculated
- ✅ No validation errors

### Scenario 2: Category Budget Exceeds Overall
**Setup:**
- Overall budget: $50,000 for January 2025
- Existing category budgets: Travel ($20,000), Food ($15,000), Office ($18,000)
- Total category budgets: $53,000

**Steps:**
1. Try to create overall budget of $50,000
2. Validation runs
3. Error returned

**Expected:**
- ❌ Budget creation fails
- ✅ Error code: BUDGET_EXCEEDED
- ✅ Shows overallBudget: 50000
- ✅ Shows proposedTotal: 53000
- ✅ Shows difference: 3000

### Scenario 3: Extend Budget
**Setup:**
- Existing budget: $50,000
- Category budgets total: $53,000
- Need to extend by: $5,000

**Steps:**
1. POST /api/v1/company-budgets/1/extend
2. Body: { "additionalAmount": 5000 }
3. Verify new total

**Expected:**
- ✅ Budget extended to $55,000
- ✅ Category budgets now within limit
- ✅ updatedAt timestamp refreshed

### Scenario 4: Budget Alert
**Setup:**
- Budget: $10,000
- Alert threshold: 80%
- Current spent: $8,100 (81%)

**Steps:**
1. POST /api/v1/company-budgets/1/recalculate
2. Service calculates 81% spent
3. Alert triggered

**Expected:**
- ✅ Alert sent to Admin and Manager
- ✅ Alert type: WARNING
- ✅ Message shows percentage and amounts
- ✅ Alert logged in company_budget_alerts

### Scenario 5: Employee Cannot View
**Setup:**
- User: employee@company.com (EMPLOYEE role)
- Company: Acme Corp (ID: 1)

**Steps:**
1. GET /api/v1/company-budgets?companyId=1
2. Permission check fails

**Expected:**
- ❌ Request fails
- ✅ Error: "Only OWNER, ADMIN or MANAGER can view company budgets"
- ✅ HTTP 400 Bad Request

---

## 🚀 Deployment Status

**Database Migration:** ✅ V61__company_budgets.sql
- Applied on startup
- Creates `company_budgets` table
- Creates `company_budget_alerts` table
- Adds all indexes and constraints

**Backend:** ✅ Deployed
- Docker container rebuilt
- Application started successfully
- All endpoints available

**API Endpoints:** ✅ Active
- POST /api/v1/company-budgets
- PUT /api/v1/company-budgets/{id}
- GET /api/v1/company-budgets/current
- GET /api/v1/company-budgets
- POST /api/v1/company-budgets/{id}/extend
- POST /api/v1/company-budgets/{id}/recalculate
- DELETE /api/v1/company-budgets/{id}

---

## 📝 Files Created/Modified

### New Files
1. `V61__company_budgets.sql` - Database migration
2. `CompanyBudget.java` - Entity
3. `CompanyBudgetRepository.java` - Repository
4. `CompanyBudgetService.java` - Business logic
5. `CompanyBudgetController.java` - REST API
6. `BudgetExceededException.java` - Custom exception

### Total Changes
- **New files:** 6
- **Lines added:** ~600
- **Database tables:** 2

---

## ✨ Key Benefits

1. **Budget Control:** Clear ceiling for company spending
2. **Validation:** Prevents category budgets from exceeding overall
3. **Visibility:** Admin/Manager can track company-wide spending
4. **Privacy:** Employees cannot see overall budget
5. **Flexibility:** Support for monthly, yearly, quarterly, custom periods
6. **Alerts:** Proactive notifications at configurable thresholds
7. **Extension:** Easy budget increase when needed
8. **Audit:** Track who created/modified budgets and when

---

## 🔜 Next Steps

### Phase 3: Team Lead Role & Team Budgets
- [ ] Add `team_lead_id` to groups table
- [ ] Implement team lead assignment
- [ ] Create team budget tracking
- [ ] Team lead can manage team budget
- [ ] Team budget within overall company budget

### Frontend Integration
- [ ] Create CompanyBudgetScreen.tsx
- [ ] Budget creation form
- [ ] Budget extend dialog
- [ ] Budget alerts display
- [ ] Progress bars for spent vs total
- [ ] Category budget breakdown view

---

## 📚 Integration Points

**With Existing Budgets:**
- Category budgets validated against overall budget
- Overall budget acts as ceiling
- Category budgets sum cannot exceed overall

**With Expenses:**
- Spent amount auto-calculated from expenses
- Real-time tracking of company spending
- Recalculate on demand

**With Notifications:**
- Alerts sent to Admin/Manager
- Multiple alert levels (80%, 90%, 100%)
- Alert tracking to prevent duplicates

---

## 🎯 Success Criteria

- [x] Admin/Manager can create overall budget
- [x] Category budgets validated against overall
- [x] Clear error when validation fails
- [x] Budget extension capability
- [x] Employees cannot view overall budget
- [x] Alerts sent at threshold
- [x] Spent amount auto-calculated
- [x] Support multiple period types
- [x] Only one active budget per period
- [x] Proper permission checks

---

**Status:** ✅ PHASE 2 COMPLETE  
**Date:** December 4, 2025  
**Backend:** Deployed and Running  
**Frontend:** Pending  
**Next Phase:** Team Lead Role & Team Budgets
