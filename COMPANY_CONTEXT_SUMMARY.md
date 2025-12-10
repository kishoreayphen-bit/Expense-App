# Company-Specific Context Implementation

## Overview
All screens throughout the app now operate within the context of the active company. When a user selects a company, all subsequent screens show data filtered to that specific company.

---

## Implementation Details

### 1. Company Indicator Component
**File:** `mobile/src/components/CompanyIndicator.tsx`

A reusable visual indicator that displays at the top of every screen when a company is active.

**Features:**
- Shows active company name
- Green-themed badge with company icon
- "Switch Company" button to navigate back to Companies tab
- Auto-hides when no company is selected
- Consistent styling across all screens

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ 🏢  ACTIVE COMPANY                  ⇄  │
│     Ayphen Technologies                 │
└─────────────────────────────────────────┘
```

### 2. Automatic Data Filtering

**Backend Integration:**
The API client (`mobile/src/api/client.ts`) automatically adds `X-Company-Id` header to ALL requests when a company is active.

**Header Logic:**
```typescript
// Lines 168-173 in client.ts
const isCompaniesEndpoint = config.url?.includes('/companies');
const shouldAttachCompany = !!CURRENT_COMPANY_ID && 
                            Number.isFinite(CURRENT_COMPANY_ID) && 
                            !isCompaniesEndpoint;
if (shouldAttachCompany) {
  extra['X-Company-Id'] = String(CURRENT_COMPANY_ID);
}
```

**What This Means:**
✅ **Expenses** → Filtered by company automatically
✅ **Budgets** → Filtered by company automatically
✅ **Splits** → Filtered by company automatically
✅ **Groups** → Filtered by company automatically
✅ **All other resources** → Filtered by company automatically

---

## Screens Updated with Company Indicator

### ✅ Expenses Screen
**File:** `mobile/src/screens/ExpensesScreen.tsx`
- Shows company indicator at top
- All expenses filtered by active company
- Create/Edit operations save to active company

### ✅ Budgets Screen
**File:** `mobile/src/screens/BudgetsScreen.tsx`
- Shows company indicator at top
- All budgets filtered by active company
- Budget analytics scoped to company
- Create budget saves to active company

### ✅ Splits Screen
**File:** `mobile/src/screens/SplitScreen.tsx`
- Shows company indicator at top
- Split calculations within company context
- Groups created belong to active company

### ✅ Add Expense Screen
**File:** `mobile/src/screens/AddExpenseScreen.tsx`
- Shows company indicator at top
- New expenses automatically tagged with company_id
- Receipt uploads associated with company

### ✅ Company Dashboard
**File:** `mobile/src/screens/CompanyDashboardScreen.tsx`
- Company header with details
- Stats cards (expenses, budgets, spent, splits)
- Quick actions for company-specific operations
- Navigation to company-scoped screens

---

## User Experience Flow

### Scenario 1: Working with Single Company
```
1. Login
2. Navigate to Companies tab
3. Tap "Ayphen Technologies"
   ↓
4. Company Dashboard loads
   [Green indicator: "ACTIVE COMPANY - Ayphen Technologies"]
5. Tap "Add Expense"
   ↓
6. Add Expense screen
   [Green indicator: "ACTIVE COMPANY - Ayphen Technologies"]
7. Fill form and save
   → Expense saved with company_id = 1
8. Navigate to Expenses tab
   [Green indicator: "ACTIVE COMPANY - Ayphen Technologies"]
   → Only shows expenses from Ayphen Technologies
```

### Scenario 2: Switching Between Companies
```
1. Currently in: Ayphen Technologies (Company 1)
2. Navigate to Budgets
   [Indicator shows: Ayphen Technologies]
   → Sees 5 budgets for Company 1
3. Tap "Switch Company" (⇄ button)
   ↓
4. Companies tab loads
5. Tap "Zoho" (Company 2)
   ↓
6. Dashboard updates to Zoho
7. Navigate to Budgets
   [Indicator shows: Zoho]
   → Sees 3 budgets for Company 2
   → Company 1 budgets NOT visible
```

### Scenario 3: Creating Resources in Company Context
```
Active Company: Ayphen Technologies (ID: 1)

Action: Create Budget
  ↓
Request Headers:
  X-User-Id: admin@example.com
  X-Company-Id: 1
  ↓
Backend: BudgetService.create()
  → Sets budget.company_id = 1
  ↓
Database: INSERT INTO budgets (company_id, ...)
  VALUES (1, ...)
  ↓
Result: Budget created for Ayphen Technologies only
```

---

## Visual Indicators

### Active Company Badge
**Color Scheme:**
- Background: Light green (#F0FDF4)
- Border: Bright green (#22C55E) left border
- Icon background: Lighter green (#DCFCE7)
- Text: Dark green (#166534)

**Layout:**
```
┌────────────────────────────────────────┐
│ │  [🏢]  ACTIVE COMPANY           [⇄] │
│ │        Company Name Here             │
└────────────────────────────────────────┘
  ↑                                    ↑
  Left Border                   Switch Button
  (#22C55E)
```

### Placement
- Top of screen, below SafeAreaView
- Above main content
- Consistent margin/padding across all screens

---

## Data Isolation Guarantees

### Company-Level Isolation
When `activeCompanyId = 1`:
- GET /api/v1/expenses → Returns ONLY Company 1 expenses
- GET /api/v1/budgets → Returns ONLY Company 1 budgets
- POST /api/v1/expenses → Saves with company_id = 1
- POST /api/v1/budgets → Saves with company_id = 1

When `activeCompanyId = 2`:
- GET /api/v1/expenses → Returns ONLY Company 2 expenses
- GET /api/v1/budgets → Returns ONLY Company 2 budgets
- POST /api/v1/expenses → Saves with company_id = 2
- POST /api/v1/budgets → Saves with company_id = 2

### Cross-Company Protection
```
User in Company 1 tries to access Company 2 expense:
  ↓
GET /api/v1/expenses/999
Headers: X-Company-Id: 1
  ↓
Backend checks: expense.company_id = 2 ≠ 1
  ↓
Response: 404 Not Found
```

---

## Technical Architecture

### Context Flow
```
CompanyProvider (navigation/index.tsx)
    ↓
CompanyContext.activeCompanyId
    ↓
setActiveCompanyIdForApi(id)
    ↓
API Client (client.ts)
    ↓
Automatic X-Company-Id header
    ↓
Backend filters by company_id
```

### State Management
```typescript
// Context maintains:
{
  activeCompanyId: number | null,    // Current company ID
  activeCompany: Company | null,      // Full company object
  setActiveCompanyId: (id) => void,   // Set active company
  refreshActiveCompany: () => void    // Reload company details
}

// Persisted in SecureStore:
Key: 'active_company_id'
Value: '1' (or null)
```

---

## Developer Guide

### Adding Company Indicator to New Screen

**Step 1:** Import the component
```typescript
import CompanyIndicator from '../components/CompanyIndicator';
```

**Step 2:** Add to JSX (top of SafeAreaView)
```tsx
return (
  <SafeAreaView style={styles.container}>
    {/* Company Indicator */}
    <CompanyIndicator />
    
    {/* Rest of your screen */}
    <ScrollView>
      ...
    </ScrollView>
  </SafeAreaView>
);
```

**Step 3:** Done! 
- Header injection is automatic
- Data filtering happens server-side
- No additional code needed

### Customizing Company Indicator

**Hide switch button:**
```tsx
<CompanyIndicator showSwitch={false} />
```

**Use in modals or special layouts:**
```tsx
<CompanyIndicator showSwitch={true} />
```

---

## Testing Checklist

### ✅ Visual Verification
- [ ] Company indicator appears on Expenses screen
- [ ] Company indicator appears on Budgets screen
- [ ] Company indicator appears on Splits screen
- [ ] Company indicator appears on Add Expense screen
- [ ] Indicator shows correct company name
- [ ] Switch button navigates to Companies tab

### ✅ Data Isolation
- [ ] Create expense in Company A
- [ ] Switch to Company B
- [ ] Verify Company A expense not visible
- [ ] Create expense in Company B
- [ ] Switch to Company A
- [ ] Verify only Company A expenses visible

### ✅ Header Injection
- [ ] Check network tab: X-Company-Id header present
- [ ] Verify header value matches active company ID
- [ ] Confirm header NOT sent to /companies endpoint
- [ ] Verify header sent to all other endpoints

### ✅ State Persistence
- [ ] Select Company A
- [ ] Close app
- [ ] Reopen app
- [ ] Verify Company A still active
- [ ] Verify indicator shows Company A

---

## Benefits

### For Users
✅ **Clear context**: Always know which company they're working in
✅ **Easy switching**: One tap to change companies
✅ **Data safety**: Cannot accidentally mix company data
✅ **Professional UX**: Consistent indicator across app

### For Developers
✅ **Automatic filtering**: No manual company_id passing
✅ **Reusable component**: Drop indicator anywhere
✅ **Centralized logic**: All filtering in one place (API client)
✅ **Type-safe**: TypeScript ensures correct usage

### For Business
✅ **Multi-tenancy**: Support unlimited companies per user
✅ **Data isolation**: Complete separation between companies
✅ **Scalability**: Architecture supports growth
✅ **Compliance**: Audit trail with company_id in all records

---

## Future Enhancements

### Planned Features
1. **Company-specific themes**: Custom colors per company
2. **Company badges**: Industry icons, custom logos
3. **Quick company switcher**: Dropdown menu in indicator
4. **Recent companies**: Quick access to last 3 companies
5. **Company stats in indicator**: "5 expenses today"

### Technical Improvements
1. **Offline mode**: Cache company data locally
2. **Background sync**: Update company details automatically
3. **Company analytics**: Track usage per company
4. **Role-based access**: Different permissions per company

---

## Summary

The company-specific context implementation provides:

**🎯 Complete Data Isolation**
- Every screen shows only active company data
- Automatic filtering via headers
- Server-side enforcement

**🎨 Consistent User Experience**
- Visual indicator on all screens
- Easy company switching
- Clear context awareness

**🔒 Security & Compliance**
- Cross-company access prevention
- Audit trail with company_id
- Type-safe implementation

**🚀 Developer-Friendly**
- Reusable component
- Automatic header injection
- Minimal code changes

All screens now operate seamlessly within the selected company context, providing a professional multi-tenant experience!
