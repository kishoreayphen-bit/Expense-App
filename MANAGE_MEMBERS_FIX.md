# ✅ ManageMembers Permission Fix

## ❌ **Issue**
When ADMIN user taps "Manage Members (Invite)" button, they get an alert:
```
Permission Denied
Only Admins can manage company members
```

---

## 🔍 **Root Cause**

The `ManageMembersScreen` was checking permissions before loading the user's company role:

```typescript
// OLD CODE - companyRole was null
const compRole = activeCompany && (activeCompany as any).userRole 
  ? (activeCompany as any).userRole 
  : null;

// Permission check failed because companyRole was null
canManageCompanyMembers(getPermissionContext(storedRole, null)) // Returns false
```

**Problem:** The `activeCompany` context doesn't always have the `userRole` field populated, so `companyRole` was `null`, causing the permission check to fail.

---

## ✅ **Solution**

Load the user's company role from the API before checking permissions:

```typescript
// NEW CODE - Load from API
if (activeCompanyId) {
  const companies = await CompanyMemberService.getMyCompanies();
  const currentCompany = companies.find(c => c.id === activeCompanyId);
  if (currentCompany) {
    compRole = currentCompany.userRole; // e.g., 'ADMIN'
    setCompanyRole(compRole);
  }
}

// Permission check now works correctly
canManageCompanyMembers(getPermissionContext(storedRole, 'ADMIN')) // Returns true
```

---

## 🔧 **Changes Made**

**File:** `mobile/src/screens/ManageMembersScreen.tsx`

### **Before:**
```typescript
// Get company role from activeCompany context (unreliable)
const compRole = activeCompany && (activeCompany as any).userRole 
  ? (activeCompany as any).userRole 
  : null;
setCompanyRole(compRole);
```

### **After:**
```typescript
// Load user's role in the active company from API (reliable)
let compRole = null;
if (activeCompanyId) {
  const companies = await CompanyMemberService.getMyCompanies();
  const currentCompany = companies.find(c => c.id === activeCompanyId);
  if (currentCompany) {
    compRole = currentCompany.userRole;
    setCompanyRole(compRole);
  }
}
```

### **Added:**
- Error handling with try-catch
- Console logging for debugging
- Proper dependency array (`[activeCompanyId]` instead of `[activeCompany]`)

---

## 📋 **Permission Logic**

From `utils/permissions.ts`:

```typescript
export const canManageCompanyMembers = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  if (userRole === 'SUPER_ADMIN') {
    return true; // SUPER_ADMIN can always manage
  }
  
  return companyRole === 'ADMIN'; // Must be ADMIN in the company
};
```

**Requirements:**
- ✅ `userRole === 'SUPER_ADMIN'` OR
- ✅ `companyRole === 'ADMIN'`

---

## 🧪 **Testing**

### **Test 1: ADMIN Access (Should Work)**
```bash
1. Login as admin@demo.local / Admin@123
2. Switch to company mode
3. Go to Profile tab
4. Scroll to Company section
5. Tap "Manage Members (Invite)" button (blue)
6. Check console logs:
   - storedRole: 'SUPER_ADMIN'
   - compRole: 'ADMIN'
   - canManage: true
7. Should navigate to ManageMembersScreen
8. Should see member list
9. Should see person-add icon in header
10. Tap person-add icon
11. Should open invite modal
12. Enter email and select role
13. Tap "Invite"
14. Should send invitation successfully
```

### **Test 2: MANAGER Access (Should Fail)**
```bash
1. Login as manager@demo.local / Manager@123
2. Switch to company mode
3. Go to Profile tab
4. Should NOT see "Manage Members (Invite)" button
   (Button only shows for ADMIN, see ProfileScreen.tsx line 431)
```

### **Test 3: EMPLOYEE Access (Should Fail)**
```bash
1. Login as employee@demo.local / Employee@123
2. Switch to company mode
3. Go to Profile tab
4. Should NOT see "Manage Members (Invite)" button
   (Button only shows for ADMIN)
```

---

## 🔍 **Debug Console Logs**

When you tap the button, check the console:

```javascript
[ManageMembers] Permission check: {
  storedRole: 'SUPER_ADMIN',
  compRole: 'ADMIN',
  activeCompanyId: 1,
  canManage: true
}
```

**If permission fails:**
```javascript
[ManageMembers] Permission check: {
  storedRole: 'SUPER_ADMIN',
  compRole: null, // ❌ This is the problem
  activeCompanyId: 1,
  canManage: false
}
```

---

## ✅ **What's Fixed**

1. ✅ **Reliable Role Loading:** Loads company role from API instead of context
2. ✅ **Error Handling:** Catches API errors and shows user-friendly message
3. ✅ **Debug Logging:** Shows permission check details in console
4. ✅ **Proper Dependencies:** useEffect depends on `activeCompanyId` instead of `activeCompany`

---

## 🎯 **Expected Behavior**

### **For ADMIN Users:**
1. See "Manage Members (Invite)" button in Profile
2. Tap button → Navigate to ManageMembersScreen
3. See list of company members
4. See person-add icon in header
5. Tap icon → Open invite modal
6. Enter email and role → Send invitation
7. No permission errors!

### **For Non-ADMIN Users:**
1. Don't see "Manage Members (Invite)" button
2. Can't access ManageMembersScreen
3. If they somehow navigate there, get permission denied alert

---

## 📝 **Related Files**

- **ManageMembersScreen.tsx** - Fixed permission check
- **ProfileScreen.tsx** - Shows button for ADMIN only (line 431)
- **permissions.ts** - Permission logic (line 111-119)
- **CompanyMemberService.ts** - API to get user's companies

---

## 🚀 **Summary**

**Problem:** Permission check failed because `companyRole` was `null`  
**Solution:** Load `companyRole` from API before checking permissions  
**Result:** ADMIN users can now access ManageMembersScreen and invite members  

**Test it:** Login as `admin@demo.local` / `Admin@123`, go to Profile, tap "Manage Members (Invite)", and it should work! 🎉

---

**Last Updated:** December 1, 2025  
**Status:** ✅ **FIXED - READY TO TEST**
