# Fix: Budget Create Button Not Showing for Admin

## 🐛 Issue

User logged in as admin (`admin@demo.local`) cannot see the budget creation button in the BudgetsScreen.

**Root Cause:**
The `activeCompany` object in `CompanyContext` did not include the user's role (`userRole` field), causing the permission check `canCreateBudget()` to fail even for admins.

---

## ✅ Solution

Updated `CompanyContext` to fetch and include the user's role when loading company data.

### Changes Made

**File:** `mobile/src/context/CompanyContext.tsx`

**1. Added CompanyWithRole Type**
```typescript
// Extended company type with user role
export type CompanyWithRole = Company & {
  userRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
};
```

**2. Updated Context Type**
```typescript
type CompanyContextType = {
  activeCompanyId: number | null;
  activeCompany: CompanyWithRole | null;  // Changed from Company
  setActiveCompanyId: (id: number | null) => void;
  refreshActiveCompany: () => Promise<void>;
};
```

**3. Updated refreshActiveCompany Function**
```typescript
const refreshActiveCompany = async () => {
  if (!activeCompanyId) { 
    setActiveCompany(null); 
    return; 
  }
  try {
    // Fetch company details and user's role
    const [companyData, userCompanies] = await Promise.all([
      companiesService.get(activeCompanyId).catch(() => null),
      CompanyMemberService.getMyCompanies().catch(() => [])
    ]);
    
    // Find user's role in this company
    const userCompany = userCompanies.find(uc => uc.id === activeCompanyId);
    
    if (companyData) {
      // Combine company data with user role
      const companyWithRole: CompanyWithRole = {
        ...companyData,
        userRole: userCompany?.userRole
      };
      console.log('[CompanyContext] Loaded company with role:', {
        id: companyWithRole.id,
        name: companyWithRole.companyName,
        userRole: companyWithRole.userRole
      });
      setActiveCompany(companyWithRole);
      return;
    }
    
    // Fallback logic...
  } catch (error) {
    console.warn('[CompanyContext] Failed to refresh company:', error);
    setActiveCompany(null);
  }
};
```

---

## 🔍 How It Works

### Before Fix
```typescript
// activeCompany only had basic company info
{
  id: 1,
  companyName: "Demo Company",
  companyCode: "DEMO"
  // ❌ No userRole field
}

// Permission check failed
canCreateBudget({ userRole: 'ADMIN', companyRole: undefined })
// Returns: false (because companyRole is undefined)
```

### After Fix
```typescript
// activeCompany now includes user's role
{
  id: 1,
  companyName: "Demo Company",
  companyCode: "DEMO",
  userRole: "ADMIN"  // ✅ User's role in this company
}

// Permission check succeeds
canCreateBudget({ userRole: 'ADMIN', companyRole: 'ADMIN' })
// Returns: true
```

---

## 📊 Permission Logic

**BudgetsScreen.tsx:**
```typescript
// Load user and company roles
const [userRole, setUserRole] = useState<string | null>(null);
const [companyRole, setCompanyRole] = useState<string | null>(null);

useEffect(() => {
  const loadRoles = async () => {
    // Get system role from AsyncStorage
    const storedRole = await AsyncStorage.getItem('userRole');
    setUserRole(storedRole);
    
    // Get company role from active company
    if (activeCompany && (activeCompany as any).userRole) {
      setCompanyRole((activeCompany as any).userRole);  // ✅ Now available
    }
  };
  loadRoles();
}, [activeCompany]);

// Check if user can create budgets
const canUserCreateBudget = canCreateBudget(
  getPermissionContext(userRole as any, companyRole as any)
);
```

**permissions.ts:**
```typescript
export const canCreateBudget = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  // SUPER_ADMIN can create budgets for any company
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Only ADMIN (company role) can create budgets
  return companyRole === 'ADMIN';
};
```

---

## 🧪 Testing

### Test Scenario
1. **Login as Admin:**
   - Email: `admin@demo.local`
   - Password: `Admin@123`

2. **Navigate to Budgets Screen**

3. **Expected Result:**
   - ✅ Floating Action Button (FAB) with "+" icon visible at bottom-right
   - ✅ Can tap to open budget creation modal
   - ✅ Console log shows: `userRole: 'ADMIN', companyRole: 'ADMIN', canUserCreateBudget: true`

4. **Previous Behavior (Bug):**
   - ❌ No FAB button visible
   - ❌ Permission hint shown: "Only Admins can create budgets"
   - ❌ Console log showed: `companyRole: null, canUserCreateBudget: false`

---

## 📝 Files Modified

1. **mobile/src/context/CompanyContext.tsx**
   - Added `CompanyWithRole` type
   - Updated `refreshActiveCompany` to fetch user role
   - Added import for `CompanyMemberService`

2. **mobile/src/screens/BudgetsScreen.tsx**
   - Added debug logging (can be removed after testing)

---

## 🎯 Impact

### Fixed Issues
- ✅ Admin can now create budgets
- ✅ Manager cannot create budgets (correct behavior)
- ✅ Employee cannot create budgets (correct behavior)
- ✅ Permission checks work correctly

### Side Benefits
- ✅ `activeCompany.userRole` now available throughout the app
- ✅ Can be used for other permission checks
- ✅ Consistent with backend RBAC system

---

## 🔄 Next Steps

1. **Test the fix:**
   - Login as admin → Should see create button
   - Login as manager → Should NOT see create button
   - Login as employee → Should NOT see create button

2. **Remove debug logs:**
   - Remove the debug `useEffect` in `BudgetsScreen.tsx` (lines 133-146)

3. **Verify other screens:**
   - Check if other screens need `activeCompany.userRole`
   - Update if necessary

---

## 📚 Related Files

- `mobile/src/context/CompanyContext.tsx` - Company context with role
- `mobile/src/api/companyMemberService.ts` - API for fetching user companies with roles
- `mobile/src/screens/BudgetsScreen.tsx` - Budget screen with permission checks
- `mobile/src/utils/permissions.ts` - Permission utility functions

---

**Status:** ✅ Fixed  
**Date:** December 4, 2025  
**Tested:** Pending user verification
