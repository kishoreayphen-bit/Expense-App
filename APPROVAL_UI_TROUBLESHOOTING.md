# 🔧 Approval UI Troubleshooting & Fixes

## ✅ **Issues Fixed**

### **Issue 1: Approval UI Not Showing for Admin**
**Problem:** You're logged in as admin@demo.local but approval buttons aren't showing.

**Root Cause:** The condition was too strict - it required expenses to have NO approval status at all.

**Fix Applied:**
Changed the condition in `ExpenseDetailScreen.tsx` line 866:
```typescript
// OLD (too strict):
{canUserApprove && isCompanyMode && !expense.approvalStatus && (

// NEW (allows pending):
{canUserApprove && isCompanyMode && (!expense.approvalStatus || expense.approvalStatus === 'PENDING') && (
```

**Result:** Approval buttons now show for:
- Expenses with no approval status
- Expenses with PENDING status
- Only for ADMIN/MANAGER in company mode

---

### **Issue 2: ManageMembersScreen Navigation Missing**
**Problem:** ManageMembersScreen exists but wasn't added to navigation.

**Fix Applied:**
1. ✅ Added import to `mobile/src/navigation/index.tsx`
2. ✅ Added Stack.Screen for ManageMembers
3. ✅ Added ManageMembers type to `mobile/src/navigation/types.ts`

**Result:** ManageMembersScreen is now accessible via navigation!

---

## 🧪 **How to Test Approval UI**

### **Step 1: Check Debug Logs**
I added debug logging to help you see what's happening. Open your app and check the console:

```javascript
[ExpenseDetail] Approval Debug: {
  canUserApprove: true/false,
  isCompanyMode: true/false,
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
  userRole: 'SUPER_ADMIN' | 'ADMIN' | etc,
  companyRole: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | null,
  showButtons: true/false
}
```

### **Step 2: Verify Conditions**
For approval buttons to show, ALL must be true:
1. ✅ `canUserApprove` = true (you're ADMIN/MANAGER)
2. ✅ `isCompanyMode` = true (you're in company mode)
3. ✅ `approvalStatus` = undefined or 'PENDING'

### **Step 3: Create Test Expense**
```bash
# 1. Login as EMPLOYEE
# 2. Switch to COMPANY MODE (important!)
# 3. Create a new expense
# 4. Logout

# 5. Login as ADMIN (admin@demo.local)
# 6. Switch to COMPANY MODE
# 7. Go to Expenses
# 8. Tap the expense
# 9. You should see "Approval Required" section!
```

---

## 🎯 **Quick Checklist**

### **Why Approval Buttons Might Not Show:**

#### ❌ **Not in Company Mode**
- **Check:** Look for company badge at top of screen
- **Fix:** Tap the mode badge and switch to company mode

#### ❌ **Expense Already Approved/Rejected**
- **Check:** Look for status badge (green APPROVED or red REJECTED)
- **Fix:** Create a new expense or find one with PENDING status

#### ❌ **Logged in as EMPLOYEE**
- **Check:** Console log shows `canUserApprove: false`
- **Fix:** Login as admin@demo.local or a MANAGER account

#### ❌ **Company Role Not Loaded**
- **Check:** Console log shows `companyRole: null`
- **Fix:** Make sure you're a member of the company and activeCompany is set

---

## 📱 **Accessing ManageMembersScreen**

### **Option 1: Navigate Programmatically**
Add a button in your Settings or Profile screen:

```typescript
import { canManageCompanyMembers, getPermissionContext } from '../utils/permissions';

// In your component:
{canManageCompanyMembers(getPermissionContext(userRole, companyRole)) && (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => navigation.navigate('ManageMembers')}
  >
    <MaterialIcons name="people" size={24} color="#3B82F6" />
    <Text style={styles.menuItemText}>Manage Members</Text>
    <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
  </TouchableOpacity>
)}
```

### **Option 2: Test Navigation Directly**
In any screen with navigation access:
```typescript
navigation.navigate('ManageMembers');
```

### **Features in ManageMembersScreen:**
- ✅ List all company members
- ✅ Invite button (person-add icon) in top-right
- ✅ Invite modal with email input and role selection
- ✅ View member roles with color badges
- ✅ Remove members
- ✅ Permission checks (ADMIN only)

---

## 🐛 **Common Issues & Solutions**

### **Issue: "canUserApprove is false"**
**Cause:** Permission check failing
**Debug:**
```typescript
// Check what's being passed to permission function
console.log('Permission Context:', {
  userRole,
  companyRole,
  context: getPermissionContext(userRole, companyRole)
});
```

**Solution:**
- Make sure userRole is loaded from AsyncStorage
- Make sure companyRole is set in activeCompany context
- Verify you're ADMIN or MANAGER

### **Issue: "isCompanyMode is false"**
**Cause:** Not in company mode
**Debug:**
```typescript
console.log('Company Context:', {
  activeCompanyId,
  activeCompany,
  isCompanyMode: !!activeCompanyId
});
```

**Solution:**
- Switch to company mode using the mode selector
- Make sure activeCompanyId is set in CompanyContext

### **Issue: "Expense has approvalStatus = 'APPROVED'"**
**Cause:** Expense already approved
**Solution:**
- Create a new expense
- Or find an expense with PENDING status
- Approved/Rejected expenses don't show approval buttons (by design)

---

## 📊 **What's Working Now**

### **ExpenseDetailScreen:**
- ✅ Approval status badge (lines 671-711)
- ✅ Approval buttons section (lines 865-897)
- ✅ Approval modal (lines 1169-1228)
- ✅ Handler function (lines 212-246)
- ✅ All styles (lines 2013-2102)
- ✅ Debug logging (lines 118-130)
- ✅ **Fixed condition** to allow PENDING expenses

### **ExpensesScreen:**
- ✅ Bulk approval button
- ✅ Bulk approval handler
- ✅ Permission checks

### **ManageMembersScreen:**
- ✅ Screen created
- ✅ Navigation added
- ✅ Types added
- ✅ Invite modal working

---

## 🚀 **Next Steps**

### **1. Test Approval Flow (5 minutes)**
```bash
1. Login as EMPLOYEE
2. Switch to company mode
3. Create expense
4. Logout
5. Login as ADMIN
6. Switch to company mode
7. Open expense
8. Check console logs
9. See approval buttons
10. Test approve/reject
```

### **2. Add Navigation to ManageMembers (2 minutes)**
Add a button in your Settings/Profile screen to navigate to ManageMembers.

### **3. Test Member Management (3 minutes)**
```bash
1. Login as ADMIN
2. Navigate to ManageMembers
3. Tap invite button (top-right)
4. Enter email and select role
5. Send invitation
```

---

## 📝 **Debug Commands**

### **Check User Role:**
```typescript
AsyncStorage.getItem('userRole').then(role => console.log('User Role:', role));
```

### **Check Company Context:**
```typescript
// In any component with useCompany
const { activeCompanyId, activeCompany } = useCompany();
console.log('Company:', { activeCompanyId, activeCompany });
```

### **Check Permission:**
```typescript
import { canApproveExpenses, getPermissionContext } from '../utils/permissions';

const canApprove = canApproveExpenses(
  getPermissionContext(userRole, companyRole)
);
console.log('Can Approve:', canApprove);
```

---

## ✅ **Summary**

**What Was Fixed:**
1. ✅ Approval button condition now allows PENDING expenses
2. ✅ Added debug logging to troubleshoot visibility
3. ✅ Added ManageMembersScreen to navigation
4. ✅ Added navigation types

**What You Need to Do:**
1. ⏳ Make sure you're in **company mode**
2. ⏳ Test with a **new expense** or **PENDING expense**
3. ⏳ Check **console logs** to see debug info
4. ⏳ Add navigation button to access ManageMembers

**Expected Result:**
- Approval buttons show for ADMIN/MANAGER in company mode
- Debug logs help you troubleshoot
- ManageMembersScreen accessible via navigation

---

**Last Updated:** December 1, 2025  
**Status:** ✅ **FIXES APPLIED - READY FOR TESTING**
