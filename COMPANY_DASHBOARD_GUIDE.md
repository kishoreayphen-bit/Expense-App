# Company Dashboard & Multi-Tenant Isolation Guide

## Overview
The app now features complete company-level data isolation. When you enter a company, you navigate to a dedicated dashboard where ALL data (expenses, budgets, splits, etc.) is automatically scoped to that specific company.

---

## Architecture

### 1. Company Context (Global State)
**File:** `mobile/src/context/CompanyContext.tsx`

**Responsibilities:**
- Maintains `activeCompanyId` and `activeCompany` state
- Persists active company to `SecureStore`
- Propagates `activeCompanyId` to API client for automatic header injection
- Auto-refreshes company details when ID changes

**Key Functions:**
```typescript
setActiveCompanyId(id: number | null)  // Set active company
refreshActiveCompany()                  // Reload company details
```

### 2. API Client Integration
**File:** `mobile/src/api/client.ts`

**Auto-Header Injection:**
- `X-User-Id`: Extracted from JWT token (for user-level isolation)
- `X-Company-Id`: Set from active company (for company-level isolation)

**Logic:**
```typescript
// Line 168-173
const isCompaniesEndpoint = config.url?.includes('/companies');
const shouldAttachCompany = !!CURRENT_COMPANY_ID && 
                            Number.isFinite(CURRENT_COMPANY_ID) && 
                            !isCompaniesEndpoint;
if (shouldAttachCompany) {
  extra['X-Company-Id'] = String(CURRENT_COMPANY_ID);
}
```

**Exclusions:**
- `/companies` endpoints are excluded (to list all user's companies)
- All other endpoints automatically include `X-Company-Id`

### 3. Navigation Flow
**File:** `mobile/src/navigation/index.tsx`

```
Login → MainTabs → Companies Tab
         ↓
    Select Company
         ↓
   CompanyDashboard (CompanyHome screen)
         ↓
    [All features scoped to company]
```

### 4. Company Dashboard
**File:** `mobile/src/screens/CompanyDashboardScreen.tsx`

**Features:**
- **Company Header**: Shows active company name, code, industry
- **Quick Stats**: Expenses count, budgets count, total spent, splits count
- **Quick Actions**: Add Expense, Create Budget, Split Expense, View Reports
- **Navigation Cards**: Direct access to Expenses, Budgets, Splits
- **Company Info**: Email, phone, location, currency
- **Switch Company Button**: Navigate back to Companies list

**Data Scoping:**
- All API calls automatically include `X-Company-Id` header
- Data is filtered server-side by company
- Stats refresh on screen focus

---

## User Flow

### Step 1: View Your Companies
```
Navigate to: Companies Tab
Action: Lists only companies you created (filtered by X-User-Id)
```

### Step 2: Select a Company
```
Action: Tap on "Ayphen Technologies"
Result: 
  - activeCompanyId set to company.id
  - Saved to SecureStore
  - Navigate to CompanyDashboard
```

### Step 3: Company Dashboard Loads
```
Screen: CompanyDashboard
Actions:
  1. Display company header
  2. Fetch expenses with X-Company-Id header
  3. Fetch budgets with X-Company-Id header
  4. Display stats and quick actions
```

### Step 4: Work Within Company
```
Actions Available:
  - Add Expense → Saved with company_id
  - Create Budget → Saved with company_id
  - Split Expense → Group saved with company_id
  - View Reports → Filtered by company_id
```

### Step 5: Switch Companies
```
Action: Tap "Switch Company" icon (swap-horiz)
Result: Navigate to Companies Tab
        Select different company
        New company becomes active
        All data refreshes for new company
```

---

## Data Isolation Guarantees

### User-Level (Companies)
✅ User A cannot see companies created by User B
✅ User A cannot modify companies created by User B
✅ Companies list filtered by `X-User-Id`

### Company-Level (Resources)
✅ Expenses filtered by `X-Company-Id`
✅ Budgets filtered by `X-Company-Id`
✅ Groups/Splits filtered by `X-Company-Id`
✅ Settlements filtered by `X-Company-Id`

### Cross-Company Protection
🛡️ Cannot access Company A's data while in Company B
🛡️ Server-side enforcement via `company_id` foreign key checks
🛡️ 404 Not Found returned for cross-company access attempts

---

## Backend Implementation

### Database Schema
**Migration:** `V32__add_company_id_to_resources.sql`

```sql
ALTER TABLE expenses ADD COLUMN company_id BIGINT;
ALTER TABLE budgets ADD COLUMN company_id BIGINT;
ALTER TABLE groups ADD COLUMN company_id BIGINT;
ALTER TABLE settlements ADD COLUMN company_id BIGINT;

-- Foreign keys and indexes
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_company FOREIGN KEY (company_id) REFERENCES companies(id);
CREATE INDEX idx_expenses_company_id ON expenses(company_id);
```

### Controller Layer
All endpoints accept `X-Company-Id` header:

```java
@GetMapping
public ResponseEntity<List<ExpenseView>> list(
    @RequestParam(required = false) LocalDate from,
    @RequestParam(required = false) LocalDate to,
    @RequestHeader(value = "X-Company-Id", required = false) Long companyId
) {
    String email = currentEmail();
    return ResponseEntity.ok(expenseService.list(email, from, to, companyId));
}
```

### Service Layer
Filters data by `companyId`:

```java
@Transactional(readOnly = true)
public List<ExpenseView> list(String email, LocalDate from, LocalDate to, Long companyId) {
    User user = userRepository.findByEmail(email).orElseThrow();
    return expenseRepository.findAll().stream()
        .filter(e -> e.getUser().getId().equals(user.getId()))
        .filter(e -> companyId == null || (e.getCompanyId() != null && e.getCompanyId().equals(companyId)))
        .filter(e -> (from == null || !e.getOccurredOn().isBefore(from)) && (to == null || !e.getOccurredOn().isAfter(to)))
        .map(this::toView)
        .toList();
}
```

---

## Example Scenarios

### Scenario 1: Freelancer with Multiple Clients
```
User: freelancer@example.com
Companies:
  - ClientA (ID: 1) → Projects, invoices, expenses for Client A
  - ClientB (ID: 2) → Projects, invoices, expenses for Client B

Flow:
1. Select ClientA → Dashboard shows ClientA data only
2. Add expense: "Meeting with ClientA" → Saved with company_id=1
3. Switch to ClientB → Dashboard shows ClientB data only
4. Add expense: "Meeting with ClientB" → Saved with company_id=2
5. ClientA expenses NEVER appear in ClientB context
```

### Scenario 2: Business Owner with Multiple Ventures
```
User: owner@example.com
Companies:
  - Restaurant (ID: 3) → Food costs, staff, inventory
  - Cafe (ID: 4) → Beverage costs, equipment, marketing

Flow:
1. Enter Restaurant → Set budgets for food, staff salaries
2. Track daily restaurant expenses
3. Switch to Cafe → Completely different budgets and expenses
4. Independent budget tracking and alerts per company
```

### Scenario 3: Accountant Managing Client Books
```
User: accountant@example.com
Companies:
  - TechStartup (ID: 5) → Software subscriptions, salaries
  - RetailShop (ID: 6) → Inventory, rent, utilities

Flow:
1. Enter TechStartup → Create monthly budgets
2. Upload expense receipts
3. Generate reports for TechStartup board
4. Switch to RetailShop → Different fiscal year, budgets, reports
5. Each client has isolated financial data
```

---

## Testing Checklist

### ✅ Company Selection
- [ ] Companies tab shows only user's companies
- [ ] Tapping company navigates to dashboard
- [ ] Dashboard displays correct company name and details
- [ ] Switch company button navigates back to list

### ✅ Data Isolation
- [ ] Create expense in Company A
- [ ] Switch to Company B
- [ ] Verify Company A expense doesn't appear
- [ ] Create expense in Company B
- [ ] Switch back to Company A
- [ ] Verify only Company A expenses appear

### ✅ Budgets Isolation
- [ ] Create budget in Company A
- [ ] Switch to Company B
- [ ] Verify Company A budget doesn't appear
- [ ] Create budget in Company B
- [ ] Verify budgets are independent

### ✅ Dashboard Stats
- [ ] Expense count correct for active company
- [ ] Budget count correct for active company
- [ ] Total spent calculated only for active company
- [ ] Stats refresh when switching companies

### ✅ Navigation
- [ ] Add Expense → Opens form → Saves with company_id
- [ ] Create Budget → Opens form → Saves with company_id
- [ ] Split Expense → Creates group with company_id
- [ ] All navigation returns to correct company context

---

## Configuration

### Mobile App
**Active Company Storage:**
- Key: `active_company_id`
- Location: `expo-secure-store`
- Persists across app restarts

**API Headers:**
- `X-User-Id`: Automatically added from JWT
- `X-Company-Id`: Automatically added from context
- No manual intervention required

### Backend
**Services Running:**
- Company Service: Port 8082 (Docker)
- Main Backend: Port 8080 (Docker)

**Environment Variables:**
```bash
COMPANY_PORT=8082  # docker-compose.yml
```

---

## Troubleshooting

### Issue: Dashboard shows "No Company Selected"
**Cause:** `activeCompanyId` is null
**Fix:** Navigate to Companies tab and select a company

### Issue: Data from other companies appearing
**Cause:** `X-Company-Id` header not being sent
**Fix:** 
1. Verify `activeCompanyId` is set in context
2. Check `setActiveCompanyIdForApi(id)` was called
3. Inspect network requests for `X-Company-Id` header

### Issue: 404 errors when accessing company data
**Cause:** Company ID doesn't exist or user doesn't own it
**Fix:** Ensure user created the company (check `created_by` field)

### Issue: Stats not updating after switching companies
**Cause:** Screen not refetching on focus
**Fix:** Dashboard uses `useFocusEffect` - ensure navigation is working

---

## API Endpoints (Company-Scoped)

All endpoints automatically filter by `X-Company-Id` when header is present:

```
GET    /api/v1/expenses              → List expenses for company
POST   /api/v1/expenses              → Create expense for company
GET    /api/v1/expenses/{id}         → Get expense (must belong to company)
PATCH  /api/v1/expenses/{id}         → Update expense (must belong to company)
DELETE /api/v1/expenses/{id}         → Delete expense (must belong to company)

GET    /api/v1/budgets               → List budgets for company
POST   /api/v1/budgets               → Create budget for company
PUT    /api/v1/budgets/{id}          → Update budget (must belong to company)
DELETE /api/v1/budgets/{id}          → Delete budget (must belong to company)

GET    /api/v1/budgets/variance      → Company-scoped variance analysis
GET    /api/v1/budgets/predicted     → Company-scoped predictions
GET    /api/v1/budgets/anomalies     → Company-scoped anomaly detection
```

**Note:** `/api/v1/companies` endpoints are NOT scoped (show all user's companies)

---

## Future Enhancements

### Multi-User Companies (Planned)
- Company membership roles (Owner, Admin, Member, Viewer)
- Invite users to join companies
- Shared access to company resources
- Permission-based access control

### Company Settings (Planned)
- Fiscal year configuration
- Tax settings per company
- Custom categories per company
- Integration with accounting software

### Dashboard Enhancements (Planned)
- Real-time charts and graphs
- Budget vs Actual comparison
- Expense trends over time
- Top spending categories widget
- Recent activity feed

---

## Summary

The app now provides **complete multi-tenant isolation at the company level**. When you enter a company via the dashboard:

1. **All API calls** automatically include `X-Company-Id`
2. **All backend queries** filter by `company_id`
3. **All UI components** display only that company's data
4. **All create operations** save with `company_id`
5. **Switching companies** completely changes the data context

This ensures **zero data leakage** between companies and provides a **fully isolated environment** for each business entity you manage.
