# 🔍 Claims Tab Not Showing - Troubleshooting Guide

## ❌ **Issue**
Claims tab is not visible for EMPLOYEE and MANAGER users.

---

## 🎯 **Expected Behavior**

### **Claims Tab Should Show When:**
- ✅ User role is **MANAGER** or **ADMIN** or **SUPER_ADMIN**
- ✅ User is in **Company Mode** (not Personal Mode)

### **Claims Tab Should NOT Show When:**
- ❌ User role is **EMPLOYEE** or **USER**
- ❌ User is in **Personal Mode**

---

## 🔍 **Debug Steps**

### **Step 1: Check Console Logs**

After adding debug logging, you should see this in the console:

```javascript
[MainTabs] Claims Tab Debug: {
  role: 'MANAGER',              // Your current role
  isCompanyMode: true,          // Must be true
  activeCompanyId: 1,           // Must be a number
  isAtLeastManager: true,       // Must be true
  shouldShowClaims: true        // Must be true to show tab
}
```

### **Step 2: Verify Your Login**

```bash
# Check which account you're using
1. Go to Profile tab
2. Look for "Email" - should show your login email
3. Look for "Your Role" in Company section
4. Should show: MANAGER or ADMIN (NOT EMPLOYEE)
```

### **Step 3: Verify Company Mode**

```bash
# Check if you're in company mode
1. Look at the top of the screen
2. Should see a badge/button showing company name
3. If it says "Personal" or shows your name → You're in PERSONAL mode
4. Tap it and select a company → Switch to COMPANY mode
```

### **Step 4: Test with Different Accounts**

```bash
# Test 1: Login as MANAGER
Email: manager1@expense.app
Password: Password123!
→ Switch to company mode
→ Should see Claims tab

# Test 2: Login as ADMIN
Email: admin@expense.app
Password: Password123!
→ Switch to company mode
→ Should see Claims tab

# Test 3: Login as EMPLOYEE
Email: employee@expense.app
Password: Password123!
→ Switch to company mode
→ Should NOT see Claims tab (expected)
```

---

## 🐛 **Common Issues & Fixes**

### **Issue 1: Role Not Loaded Correctly**

**Symptom:**
```javascript
[MainTabs] Claims Tab Debug: {
  role: null,  // ❌ Role is null
  ...
}
```

**Cause:** Role not saved in AsyncStorage during login

**Fix:**
```bash
1. Logout completely
2. Close and restart the app
3. Login again
4. Check console logs again
```

**Code to check:** `AuthContext.tsx` should save role during login:
```typescript
await AsyncStorage.setItem('userRole', user.role);
```

---

### **Issue 2: Not in Company Mode**

**Symptom:**
```javascript
[MainTabs] Claims Tab Debug: {
  role: 'MANAGER',
  isCompanyMode: false,  // ❌ Not in company mode
  activeCompanyId: null,
  ...
}
```

**Cause:** User is in Personal Mode

**Fix:**
```bash
1. Look for mode badge at top of screen
2. Tap it
3. Select a company from the list
4. Should switch to company mode
5. Claims tab should appear
```

---

### **Issue 3: EMPLOYEE Role Cannot See Claims**

**Symptom:**
```javascript
[MainTabs] Claims Tab Debug: {
  role: 'EMPLOYEE',  // ❌ Employee role
  isCompanyMode: true,
  isAtLeastManager: false,  // ❌ Not manager or above
  shouldShowClaims: false
}
```

**Cause:** This is **EXPECTED BEHAVIOR** - Employees cannot see Claims tab

**Solution:**
```bash
# Employees cannot approve claims, only submit them
# To see claims, you need to login as MANAGER or ADMIN

# Option 1: Login as MANAGER
Email: manager1@expense.app
Password: Password123!

# Option 2: Login as ADMIN
Email: admin@expense.app
Password: Password123!
```

---

### **Issue 4: Wrong Database Credentials**

**Symptom:** Login works but role is wrong

**Cause:** Using old demo credentials instead of seeded credentials

**Fix:**
```bash
# OLD credentials (may not have correct roles):
admin@demo.local / Admin@123
manager@demo.local / Manager@123
employee@demo.local / Employee@123

# NEW seeded credentials (correct roles):
admin@expense.app / Password123!
manager1@expense.app / Password123!
employee@expense.app / Password123!

# Use the NEW credentials!
```

---

### **Issue 5: Company Member Role Not Set**

**Symptom:**
```javascript
[MainTabs] Claims Tab Debug: {
  role: 'EMPLOYEE',  // Global role
  isCompanyMode: true,
  // But user should be MANAGER in this company
}
```

**Cause:** User's global role is EMPLOYEE but they should have MANAGER role in the company

**Fix:** Check `company_members` table:
```sql
-- Check user's role in company
SELECT 
  u.email,
  u.role as global_role,
  cm.role as company_role,
  c.name as company_name
FROM users u
JOIN company_members cm ON cm.user_id = u.id
JOIN companies c ON c.id = cm.company_id
WHERE u.email = 'manager1@expense.app';

-- Should show:
-- email: manager1@expense.app
-- global_role: MANAGER
-- company_role: ADMIN or MANAGER
-- company_name: (company name)
```

**Note:** The Claims tab visibility uses **global role** (`userRole`), not company role. If the user's global role is EMPLOYEE, they won't see Claims tab even if they're ADMIN in a company.

---

## 🔧 **Technical Details**

### **Claims Tab Visibility Logic**

**File:** `mobile/src/navigation/MainTabs.tsx` (Line 149-161)

```typescript
{/* Claims tab - Only visible in company mode for manager/admin */}
{isCompanyMode && isAtLeast('MANAGER') && (
  <Tab.Screen 
    name="Claims" 
    component={ClaimsScreenW}
    options={{
      headerShown: false,
      tabBarIcon: ({ color, size }) => (
        <MaterialIcons name="assignment" size={size} color={color} />
      ),
    }}
  />
)}
```

**Conditions:**
1. `isCompanyMode` → `!!activeCompanyId` → Must have active company
2. `isAtLeast('MANAGER')` → `ROLE_LEVELS[role] >= ROLE_LEVELS['MANAGER']` → Role level must be ≥ 1

**Role Levels:**
```typescript
EMPLOYEE: 0     // ❌ Cannot see Claims
USER: 0         // ❌ Cannot see Claims
MANAGER: 1      // ✅ Can see Claims
ADMIN: 2        // ✅ Can see Claims
SUPER_ADMIN: 3  // ✅ Can see Claims
```

---

### **Role Loading Flow**

**1. Login (AuthContext.tsx):**
```typescript
// Save role to AsyncStorage
await AsyncStorage.setItem('userRole', user.role);
```

**2. Role Provider (RoleContext.tsx):**
```typescript
// Load role on app start
const storedRole = await AsyncStorage.getItem('userRole');
setRoleState(storedRole as Role);
```

**3. MainTabs (MainTabs.tsx):**
```typescript
// Use role to determine tab visibility
const { role, isAtLeast } = useRole();
const showClaims = isCompanyMode && isAtLeast('MANAGER');
```

---

## 🧪 **Testing Checklist**

### **Test 1: MANAGER Login**
```bash
✅ Login: manager1@expense.app / Password123!
✅ Check console: role should be 'MANAGER'
✅ Switch to company mode
✅ Check console: isCompanyMode should be true
✅ Check console: shouldShowClaims should be true
✅ Look at bottom tabs: Claims tab should be visible
✅ Tap Claims tab: Should open ClaimsScreen
```

### **Test 2: ADMIN Login**
```bash
✅ Login: admin@expense.app / Password123!
✅ Check console: role should be 'ADMIN'
✅ Switch to company mode
✅ Check console: isCompanyMode should be true
✅ Check console: shouldShowClaims should be true
✅ Look at bottom tabs: Claims tab should be visible
✅ Tap Claims tab: Should open ClaimsScreen
```

### **Test 3: EMPLOYEE Login (Should NOT Show)**
```bash
✅ Login: employee@expense.app / Password123!
✅ Check console: role should be 'EMPLOYEE'
✅ Switch to company mode
✅ Check console: isCompanyMode should be true
✅ Check console: shouldShowClaims should be FALSE
✅ Look at bottom tabs: Claims tab should NOT be visible
✅ This is EXPECTED - Employees cannot see Claims
```

### **Test 4: Personal Mode (Should NOT Show)**
```bash
✅ Login: manager1@expense.app / Password123!
✅ Check console: role should be 'MANAGER'
✅ Stay in personal mode (don't switch to company)
✅ Check console: isCompanyMode should be false
✅ Check console: shouldShowClaims should be FALSE
✅ Look at bottom tabs: Claims tab should NOT be visible
✅ This is EXPECTED - Claims only in company mode
```

---

## 📋 **Quick Diagnosis**

### **Run This in Console:**

Check the debug output:
```javascript
[MainTabs] Claims Tab Debug: {
  role: ?,                    // What does it say?
  isCompanyMode: ?,           // true or false?
  activeCompanyId: ?,         // number or null?
  isAtLeastManager: ?,        // true or false?
  shouldShowClaims: ?         // true or false?
}
```

### **Diagnosis Table:**

| role | isCompanyMode | isAtLeastManager | shouldShowClaims | Result |
|------|---------------|------------------|------------------|--------|
| MANAGER | true | true | true | ✅ Shows Claims |
| ADMIN | true | true | true | ✅ Shows Claims |
| SUPER_ADMIN | true | true | true | ✅ Shows Claims |
| EMPLOYEE | true | false | false | ❌ No Claims |
| MANAGER | false | true | false | ❌ No Claims (personal mode) |
| null | true | false | false | ❌ No Claims (role not loaded) |

---

## ✅ **Solution Summary**

### **If Claims Tab is Not Showing:**

1. **Check your role:**
   - Go to Profile → Look for "Your Role"
   - Must be MANAGER, ADMIN, or SUPER_ADMIN
   - If EMPLOYEE → Login as MANAGER instead

2. **Check company mode:**
   - Look at top of screen
   - Should show company name
   - If shows "Personal" → Tap it and select company

3. **Check console logs:**
   - Look for `[MainTabs] Claims Tab Debug`
   - All values should be correct
   - If role is null → Logout and login again

4. **Use correct credentials:**
   - MANAGER: `manager1@expense.app` / `Password123!`
   - ADMIN: `admin@expense.app` / `Password123!`
   - NOT the old demo credentials

5. **Restart app if needed:**
   - Close app completely
   - Reopen and login again
   - Check console logs

---

## 🎯 **Expected Result**

After following these steps, you should see:

```
Bottom Navigation Tabs (MANAGER in Company Mode):
┌─────────┬─────────┬─────┬────────┬────────┬───────┬────────┬─────────┐
│Expenses │ Budgets │ FX  │ Splits │ Groups │ Bills │ Claims │ Profile │
│    📊   │    💰   │ 💱  │   ✂️   │   👥   │  📄  │   💰   │   👤   │
└─────────┴─────────┴─────┴────────┴────────┴───────┴────────┴─────────┘
                                                         ↑
                                                   THIS TAB!
```

---

**Last Updated:** December 2, 2025  
**Status:** 🔍 **DEBUGGING IN PROGRESS**
