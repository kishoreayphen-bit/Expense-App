# 🔍 Claims Tab Debug Steps - Complete Guide

## 📋 **Current Situation**
- ✅ You can login as `manager1@expense.app` with password `password`
- ✅ You're in Company Mode
- ❌ Claims tab is NOT showing

---

## 🎯 **Step-by-Step Debug Process**

### **Step 1: Logout and Clear App**

```bash
1. Go to Profile tab
2. Tap "Logout"
3. Close the app completely
4. Reopen the app
```

---

### **Step 2: Login and Watch Console**

```bash
1. Login with:
   Email: manager1@expense.app
   Password: password

2. Watch the console for these logs:
```

**Expected Console Output:**

```javascript
// 1. Auth Login Debug
[Auth] ===== LOGIN DEBUG =====
[Auth] Token data: { ... }
[Auth] Authorities: ["ROLE_MANAGER", ...]
[Auth] Found role authority: ROLE_MANAGER
[Auth] ✅ User role saved to AsyncStorage: MANAGER
[Auth] ✅ Verified saved role: MANAGER
[Auth] ========================

// 2. Role Context Loading
[RoleContext] Loading role from AsyncStorage...
[RoleContext] Stored role: MANAGER
[RoleContext] ✅ Role set to: MANAGER

// 3. MainTabs Claims Debug
[MainTabs] Claims Tab Debug: {
  role: 'MANAGER',
  isCompanyMode: true,
  activeCompanyId: 1,
  isAtLeastManager: true,
  shouldShowClaims: true
}
```

---

### **Step 3: Switch to Company Mode**

```bash
1. After login, tap the mode badge at top
2. Select a company
3. Watch console for MainTabs debug log
4. Check if Claims tab appears
```

---

## 🐛 **Possible Issues & Solutions**

### **Issue 1: Role Not Saved During Login**

**Console shows:**
```javascript
[Auth] ⚠️ No ROLE_ authority found in token
// OR
[Auth] ⚠️ No authorities array in token
```

**Cause:** Backend token doesn't include role in authorities

**Solution:** Check backend JWT token generation
```bash
# Check what the backend returns
curl -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager1@expense.app","password":"password"}' \
  | jq .
```

---

### **Issue 2: Role Not Loading in RoleContext**

**Console shows:**
```javascript
[RoleContext] ⚠️ No role found in AsyncStorage
```

**Cause:** Role wasn't saved during login, or AsyncStorage cleared

**Solution:**
```bash
1. Logout completely
2. Close and restart app
3. Login again
4. Check if role is saved this time
```

---

### **Issue 3: Role is Loaded but Claims Tab Still Not Showing**

**Console shows:**
```javascript
[RoleContext] ✅ Role set to: MANAGER
[MainTabs] Claims Tab Debug: {
  role: 'MANAGER',
  isCompanyMode: false,  // ❌ This is the problem
  activeCompanyId: null,
  isAtLeastManager: true,
  shouldShowClaims: false
}
```

**Cause:** Not in company mode

**Solution:**
```bash
1. Tap mode badge at top
2. Select a company
3. Claims tab should appear
```

---

### **Issue 4: Role is Wrong**

**Console shows:**
```javascript
[RoleContext] ✅ Role set to: EMPLOYEE  // ❌ Should be MANAGER
```

**Cause:** Database has wrong role for this user

**Solution:** Check and fix database
```sql
-- Check current role
SELECT email, role FROM users WHERE email = 'manager1@expense.app';

-- If wrong, update it
UPDATE users SET role = 'MANAGER' WHERE email = 'manager1@expense.app';
```

---

## 🔍 **What to Share with Me**

After you login and switch to company mode, please share:

### **1. Auth Login Debug:**
```javascript
[Auth] ===== LOGIN DEBUG =====
[Auth] Token data: { ... }  // Copy this
[Auth] Authorities: [...]    // Copy this
[Auth] Found role authority: ?
[Auth] ✅ User role saved to AsyncStorage: ?
[Auth] ✅ Verified saved role: ?
```

### **2. Role Context Loading:**
```javascript
[RoleContext] Loading role from AsyncStorage...
[RoleContext] Stored role: ?
[RoleContext] ✅ Role set to: ?
```

### **3. MainTabs Claims Debug:**
```javascript
[MainTabs] Claims Tab Debug: {
  role: ?,
  isCompanyMode: ?,
  activeCompanyId: ?,
  isAtLeastManager: ?,
  shouldShowClaims: ?
}
```

### **4. Bottom Navigation Tabs:**
List all the tabs you see in the bottom navigation.

---

## 🎯 **Expected vs Actual**

### **Expected (MANAGER in Company Mode):**
```
Bottom Tabs: Expenses | Budgets | FX | Splits | Groups | Bills | Claims | Profile
                                                                    ↑
                                                              Should be here!
```

### **If Claims is Missing:**
One of these is wrong:
- ❌ Role is not MANAGER (check console)
- ❌ Not in company mode (check badge at top)
- ❌ Role not loaded in RoleContext (check console)

---

## 🧪 **Quick Test**

Run this in your app's console (if you can access it):
```javascript
// Check AsyncStorage
AsyncStorage.getItem('userRole').then(role => {
  console.log('Stored role:', role);
});

// Check RoleContext
// (This requires accessing the context, which may not be possible from console)
```

---

## 📝 **Action Items**

Please do the following and share the results:

1. **Logout and close app**
2. **Reopen and login** with `manager1@expense.app / password`
3. **Copy ALL console logs** that start with:
   - `[Auth]`
   - `[RoleContext]`
   - `[MainTabs]`
4. **Switch to company mode** (tap badge, select company)
5. **Check bottom navigation** - list all tabs you see
6. **Share everything with me**

---

## 🎯 **Most Likely Causes**

Based on your situation, the most likely issues are:

1. **Role not being saved during login** (check Auth logs)
2. **Role not being loaded by RoleContext** (check RoleContext logs)
3. **Company mode not active** (check MainTabs logs)

The debug logs will tell us exactly which one it is! 🔍

---

**Let's get those console logs and we'll fix this!** 🚀
