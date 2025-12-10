# 📱 Mobile UI Role-Based Permissions Guide

## ✅ **Implementation Status**

### **Completed:**
1. ✅ **Permission Utility Functions** (`utils/permissions.ts`)
2. ✅ **BudgetsScreen** - Hide create button for EMPLOYEE/MANAGER
3. ✅ **CreateTeamScreen** - Block EMPLOYEE from creating teams
4. ✅ **Backend** - All role-based filtering active

### **Automatic (No UI Changes Needed):**
- ✅ **ExpensesScreen** - Backend automatically filters expenses by role
- ✅ **Expense visibility** - EMPLOYEE sees own, ADMIN sees all (server-side)

---

## 🎯 **What Was Implemented**

### **1. Permission Utility Module**
**File:** `mobile/src/utils/permissions.ts`

**Functions:**
- `canCreateBudget()` - Check if user can create budgets
- `canCreateTeam()` - Check if user can create teams
- `canViewAllExpenses()` - Check if user can view all company expenses
- `canApproveExpenses()` - Check if user can approve expenses
- `canManageCompanyMembers()` - Check if user can manage members
- `getRoleDisplayName()` - Get user-friendly role name
- `getRoleBadgeColor()` - Get role badge color
- `PERMISSION_HINTS` - User-friendly permission messages

**Usage:**
```typescript
import { canCreateBudget, getPermissionContext } from '../utils/permissions';

const canUserCreateBudget = canCreateBudget(
  getPermissionContext(userRole, companyRole)
);
```

---

### **2. BudgetsScreen Updates**
**File:** `mobile/src/screens/BudgetsScreen.tsx`

**Changes:**
1. Added role state management (userRole, companyRole)
2. Load roles from AsyncStorage and activeCompany
3. Check `canCreateBudget()` permission
4. Conditionally render FAB (Floating Action Button)
5. Show permission hint for users without access

**UI Behavior:**
- **EMPLOYEE/MANAGER:** ❌ No "+ Create Budget" button
- **ADMIN/SUPER_ADMIN:** ✅ Shows "+ Create Budget" button
- **Permission Hint:** Shows "Only Admins can create budgets" for EMPLOYEE/MANAGER

**Code:**
```typescript
// Check permission
const canUserCreateBudget = canCreateBudget(
  getPermissionContext(userRole as any, companyRole as any)
);

// Conditional FAB
{canUserCreateBudget && (
  <TouchableOpacity style={styles.fab} onPress={...}>
    <MaterialIcons name="add" size={22} color="#fff" />
  </TouchableOpacity>
)}

// Permission hint
{!canUserCreateBudget && isCompanyMode && (
  <View style={styles.permissionHint}>
    <MaterialIcons name="info-outline" size={18} color="#6B7280" />
    <Text style={styles.permissionHintText}>
      {PERMISSION_HINTS.CREATE_BUDGET}
    </Text>
  </View>
)}
```

---

### **3. CreateTeamScreen Updates**
**File:** `mobile/src/screens/CreateTeamScreen.tsx`

**Changes:**
1. Added role state management
2. Check permissions on mount
3. Show alert and navigate back if EMPLOYEE tries to access
4. Only load users after permission check passes

**UI Behavior:**
- **EMPLOYEE:** ❌ Alert shown: "Only Managers and Admins can create teams"
- **MANAGER/ADMIN/SUPER_ADMIN:** ✅ Can create teams normally

**Code:**
```typescript
// Check permission on mount
useEffect(() => {
  const checkPermissions = async () => {
    const hasPermission = canCreateTeam(
      getPermissionContext(storedRole as any, companyRole as any)
    );
    
    if (!hasPermission && isCompanyMode) {
      Alert.alert(
        'Permission Denied',
        PERMISSION_HINTS.CREATE_TEAM,
        [{ text: 'Go Back', onPress: () => navigation.goBack() }],
        { cancelable: false }
      );
    }
    
    setPermissionChecked(true);
  };
  
  checkPermissions();
}, [activeCompany, isCompanyMode]);
```

---

### **4. ExpensesScreen (Automatic)**
**File:** `mobile/src/screens/ExpensesScreen.tsx`

**No UI Changes Needed!**

**Why:**
- Backend `ExpenseService.list()` already filters by role
- EMPLOYEE automatically sees only their own expenses
- ADMIN automatically sees all company expenses
- No client-side filtering needed

**Backend Logic:**
```java
// ExpenseService.java
if (user.getRole() == Role.SUPER_ADMIN) {
    // SUPER_ADMIN sees all expenses
    scoped = expenseRepository.findAllByCompanyAndDate(companyId, from, to);
} else if (isCompanyAdmin) {
    // ADMIN sees all expenses in company
    scoped = expenseRepository.findAllByCompanyAndDate(companyId, from, to);
} else {
    // EMPLOYEE/MANAGER see only their own
    scoped = expenseRepository.findCompanyByUserAndDate(user, companyId, from, to);
}
```

**Result:**
- EMPLOYEE opens ExpensesScreen → Sees only their expenses
- ADMIN opens ExpensesScreen → Sees all company expenses
- No additional UI tabs or filters needed

---

## 📊 **Permission Matrix**

| Screen | Feature | EMPLOYEE | MANAGER | ADMIN | SUPER_ADMIN |
|--------|---------|----------|---------|-------|-------------|
| **BudgetsScreen** | Create Budget Button | ❌ Hidden | ❌ Hidden | ✅ Visible | ✅ Visible |
| **BudgetsScreen** | Permission Hint | ✅ Shown | ✅ Shown | ❌ Hidden | ❌ Hidden |
| **CreateTeamScreen** | Access Screen | ❌ Blocked | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **CreateTeamScreen** | Alert on Access | ✅ Shown | ❌ None | ❌ None | ❌ None |
| **ExpensesScreen** | View Expenses | ✅ Own only | ✅ Own only | ✅ All in company | ✅ All |
| **ExpensesScreen** | Create Expense | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🔧 **How Roles Are Loaded**

### **System Role (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE)**
**Source:** JWT token → AsyncStorage

```typescript
// Stored during login (AuthContext.tsx)
const roleAuthority = tokenData.authorities.find((auth: any) => 
  typeof auth === 'string' && auth.startsWith('ROLE_')
);
if (roleAuthority) {
  const role = roleAuthority.replace('ROLE_', '');
  await AsyncStorage.setItem('userRole', role);
}

// Retrieved in screens
const storedRole = await AsyncStorage.getItem('userRole');
setUserRole(storedRole);
```

### **Company Role (OWNER, ADMIN, MANAGER, EMPLOYEE)**
**Source:** Active company object

```typescript
// Retrieved from CompanyContext
const { activeCompany } = useCompany();

// Company role is in activeCompany.userRole
if (activeCompany && (activeCompany as any).userRole) {
  setCompanyRole((activeCompany as any).userRole);
}
```

**Note:** Company role is the user's role **within that specific company**, while system role is their global role in the app.

---

## 🎨 **UI Components**

### **Permission Hint Banner**
**Style:**
```typescript
permissionHint: {
  position: 'absolute',
  bottom: 24,
  left: 16,
  right: 16,
  backgroundColor: '#F3F4F6',
  borderRadius: 12,
  padding: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  borderWidth: 1,
  borderColor: '#E5E7EB',
},
permissionHintText: {
  flex: 1,
  fontSize: 13,
  color: '#6B7280',
  fontWeight: '500',
},
```

**Appearance:**
- Light gray background (#F3F4F6)
- Info icon (info-outline)
- Clear message text
- Positioned at bottom of screen
- Rounded corners (12px)

---

## 🧪 **Testing Scenarios**

### **Test 1: EMPLOYEE Budget Creation**
1. Login as EMPLOYEE
2. Navigate to Budgets screen
3. ✅ Should NOT see "+ Create Budget" FAB
4. ✅ Should see permission hint at bottom
5. Try to create budget via API
6. ❌ Should get 403 error from backend

### **Test 2: ADMIN Budget Creation**
1. Login as ADMIN
2. Navigate to Budgets screen
3. ✅ Should see "+ Create Budget" FAB
4. ✅ Should NOT see permission hint
5. Tap FAB
6. ✅ Should open budget creation modal

### **Test 3: EMPLOYEE Team Creation**
1. Login as EMPLOYEE
2. Navigate to Teams/Groups
3. Tap "Create Team" (if button exists)
4. ✅ Should show alert: "Permission Denied"
5. ✅ Alert message: "Only Managers and Admins can create teams"
6. Tap "Go Back"
7. ✅ Should return to previous screen

### **Test 4: MANAGER Team Creation**
1. Login as MANAGER
2. Navigate to Teams/Groups
3. Tap "Create Team"
4. ✅ Should open team creation screen
5. ✅ Should load company members
6. ✅ Can create team successfully

### **Test 5: EMPLOYEE Expense Visibility**
1. Login as EMPLOYEE
2. Add 3 expenses
3. Navigate to Expenses screen
4. ✅ Should see only own 3 expenses
5. ❌ Should NOT see other employees' expenses

### **Test 6: ADMIN Expense Visibility**
1. Login as ADMIN
2. Navigate to Expenses screen
3. ✅ Should see ALL expenses in company
4. ✅ Should see expenses from all employees
5. ✅ Can view/edit/delete any expense

---

## 📝 **Permission Messages**

**Defined in:** `utils/permissions.ts`

```typescript
export const PERMISSION_HINTS = {
  CREATE_BUDGET: 'Only Admins can create budgets',
  CREATE_TEAM: 'Only Managers and Admins can create teams',
  VIEW_ALL_EXPENSES: 'Only Admins can view all company expenses',
  APPROVE_EXPENSES: 'Only Managers and Admins can approve expenses',
  MANAGE_MEMBERS: 'Only Admins can manage company members',
};
```

**Usage:**
- Clear, concise messages
- User-friendly language
- Explains who has permission
- No technical jargon

---

## 🚀 **Future Enhancements (Optional)**

### **1. Role Badge Display**
Show user's role in profile or header:
```typescript
import { getRoleDisplayName, getRoleBadgeColor } from '../utils/permissions';

<View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(companyRole) }]}>
  <Text style={styles.roleBadgeText}>{getRoleDisplayName(companyRole)}</Text>
</View>
```

### **2. Expense Approval UI**
For MANAGER and ADMIN to approve expenses:
```typescript
{canApproveExpenses(getPermissionContext(userRole, companyRole)) && (
  <TouchableOpacity onPress={approveExpense}>
    <Text>Approve</Text>
  </TouchableOpacity>
)}
```

### **3. "All Expenses" Tab for ADMIN**
Optional tab to explicitly show all vs own expenses:
```typescript
{canViewAllExpenses(getPermissionContext(userRole, companyRole)) && (
  <Tab label="All Expenses" />
)}
<Tab label="My Expenses" />
```

### **4. Member Management Screen**
For ADMIN to manage company members:
```typescript
{canManageCompanyMembers(getPermissionContext(userRole, companyRole)) && (
  <TouchableOpacity onPress={() => navigation.navigate('ManageMembers')}>
    <Text>Manage Members</Text>
  </TouchableOpacity>
)}
```

---

## 📚 **Related Documentation**

- **Backend Permissions:** `ROLE_BASED_PERMISSIONS.md`
- **Permission Utility:** `mobile/src/utils/permissions.ts`
- **Test Credentials:** `RBAC_TEST_CREDENTIALS.md`

---

## ✅ **Summary**

### **What Works Now:**

1. ✅ **Budget Creation**
   - EMPLOYEE/MANAGER: Cannot create budgets (button hidden)
   - ADMIN/SUPER_ADMIN: Can create budgets (button visible)
   - Clear permission hint shown to restricted users

2. ✅ **Team Creation**
   - EMPLOYEE: Blocked from accessing team creation screen
   - MANAGER/ADMIN/SUPER_ADMIN: Can create teams normally
   - Alert shown with clear message

3. ✅ **Expense Visibility**
   - EMPLOYEE: Sees only their own expenses (automatic)
   - MANAGER: Sees only their own expenses (automatic)
   - ADMIN: Sees all company expenses (automatic)
   - SUPER_ADMIN: Sees all expenses everywhere (automatic)

4. ✅ **Permission Utilities**
   - Centralized permission checking
   - Reusable across all screens
   - Clear, maintainable code

### **Key Benefits:**

- **Security:** Permissions enforced at both UI and backend levels
- **UX:** Clear feedback when users lack permissions
- **Maintainability:** Centralized permission logic
- **Consistency:** Same permission rules across all screens

---

**Status:** ✅ **COMPLETE - Ready for Testing**

**Last Updated:** December 1, 2025  
**Version:** 1.0
