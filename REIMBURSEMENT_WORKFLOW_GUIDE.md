# 💰 Reimbursement/Claims Workflow Guide

## ✅ **How It Works**

### **Employee Side (Submitting Reimbursement)**
1. Login as EMPLOYEE
2. Switch to **Company Mode**
3. Go to **Expenses** tab
4. Tap **"+"** button to add expense
5. Fill in expense details
6. ✅ **Check "Request Reimbursement" checkbox**
7. Tap **"Add Expense"**
8. Expense is created and reimbursement request is submitted

### **Manager/Admin Side (Approving Reimbursement)**
1. Login as MANAGER or ADMIN
2. Switch to **Company Mode**
3. Go to **Claims** tab (💰 icon in bottom navigation)
4. See all pending reimbursement requests
5. Tap on a request to view details
6. Approve or Reject with notes

---

## 🔍 **Where to Find Reimbursement Requests**

### **For MANAGER/ADMIN:**

The **Claims** tab is **ONLY visible in Company Mode** for users with MANAGER or ADMIN role.

**Navigation Path:**
```
Bottom Navigation → Claims Tab (💰 icon)
```

**Tabs in Claims Screen:**
- **Pending** - Awaiting approval
- **Approved** - Approved requests
- **Rejected** - Rejected requests
- **Paid** - Paid out requests

---

## 🎯 **Common Issues & Solutions**

### **Issue 1: "I don't see the Claims tab"**

**Possible Causes:**
1. ❌ Not in company mode
2. ❌ Not logged in as MANAGER/ADMIN
3. ❌ Claims tab is hidden for EMPLOYEE role

**Solution:**
```bash
# Check your role
1. Go to Profile tab
2. Look for "Your Role" in Company section
3. Should show: ADMIN or MANAGER

# If you're EMPLOYEE:
- You cannot see Claims tab
- You can only submit reimbursement requests
- Login as MANAGER/ADMIN to see Claims
```

### **Issue 2: "Claims tab is empty"**

**Possible Causes:**
1. ❌ No reimbursement requests submitted yet
2. ❌ Expense was created in personal mode (not company mode)
3. ❌ "Request Reimbursement" checkbox was not checked
4. ❌ Wrong company selected

**Solution:**
```bash
# Verify expense was created correctly:
1. Login as EMPLOYEE
2. Switch to company mode
3. Go to Expenses tab
4. Find the expense you created
5. Tap to open details
6. Check if "Reimbursable: Yes" is shown

# If not shown as reimbursable:
1. Delete the expense
2. Create new expense
3. Make sure to CHECK "Request Reimbursement" checkbox
4. Make sure you're in COMPANY MODE when creating
```

### **Issue 3: "Expense shows in Expenses tab but not in Claims tab"**

**Possible Cause:**
- Expense was created but reimbursement request was not submitted

**Solution:**
```bash
# Check the logs when creating expense:
1. Open expense creation screen
2. Fill details
3. Check "Request Reimbursement"
4. Tap "Add Expense"
5. Look for success message: "Expense added and reimbursement requested successfully"

# If you only see "Expense added successfully":
- Reimbursement request failed
- Check console logs for errors
```

---

## 🔧 **Technical Flow**

### **1. Employee Creates Expense**

**File:** `AddExpenseScreen.tsx`

```typescript
// Line 110: Checkbox state
const [isReimbursable, setIsReimbursable] = useState(false);

// Line 499: Include in payload
reimbursable: isReimbursable,

// Line 533-534: Create with company scope
const scopeOpts = { fromCompany: isCompanyMode, companyId: activeCompanyId };
const createdExpense = await ExpenseService.createExpense(finalData, scopeOpts);

// Line 580-583: Request reimbursement if checkbox checked
if (createdExpense && isReimbursable && isCompanyMode && activeCompanyId) {
  await ReimbursementService.requestReimbursement(createdExpense.id);
  Alert.alert('Success', 'Expense added and reimbursement requested successfully');
}
```

### **2. Expense Created in Database**

**Backend:** Expense is created with:
- `companyId` - Links to company
- `reimbursable` - Marks as reimbursement request
- `userId` - Links to employee who created it

### **3. Reimbursement Request Submitted**

**API Call:**
```typescript
POST /api/v1/reimbursements/request/{expenseId}
```

**Result:**
- Expense status updated to "PENDING"
- Appears in Claims screen for MANAGER/ADMIN

### **4. Manager/Admin Views Claims**

**File:** `ClaimsScreen.tsx`

```typescript
// Line 61: Load pending reimbursements
const data = await ReimbursementService.getPendingReimbursements(companyIdNum);

// API Call:
GET /api/v1/reimbursements/pending?companyId={companyId}
```

### **5. Manager/Admin Approves/Rejects**

**API Calls:**
```typescript
POST /api/v1/reimbursements/approve/{expenseId}
POST /api/v1/reimbursements/reject/{expenseId}
```

---

## 🧪 **Testing Steps**

### **Test 1: Submit Reimbursement as Employee**

```bash
1. Login as employee@demo.local / Employee@123
2. Tap mode badge → Select company mode
3. Go to Expenses tab
4. Tap "+" button
5. Fill expense details:
   - Merchant: "Office Supplies"
   - Amount: 100
   - Category: Select any
   - Date: Today
6. ✅ CHECK "Request Reimbursement" checkbox
7. Tap "Add Expense"
8. Should see: "Expense added and reimbursement requested successfully"
9. Logout
```

### **Test 2: View and Approve as Manager**

```bash
1. Login as manager@demo.local / Manager@123
2. Tap mode badge → Select company mode
3. Look for Claims tab (💰 icon) in bottom navigation
4. If you DON'T see it:
   - You're not in company mode OR
   - You're not MANAGER/ADMIN
5. Tap Claims tab
6. Should see "Pending" tab selected
7. Should see the expense from employee
8. Tap on the expense
9. Tap "Approve" or "Reject"
10. Enter notes (optional)
11. Confirm
12. Expense should move to "Approved" or "Rejected" tab
```

### **Test 3: Verify as Admin**

```bash
1. Login as admin@demo.local / Admin@123
2. Switch to company mode
3. Go to Claims tab
4. Should see all reimbursement requests
5. Can approve/reject any request
```

---

## 📊 **Claims Tab Visibility**

**File:** `MainTabs.tsx` (Line 149-150)

```typescript
{/* Claims tab - Only visible in company mode for manager/admin */}
{isCompanyMode && isAtLeast('MANAGER') && (
  <Tab.Screen 
    name="Claims" 
    component={ClaimsScreenW}
    // ...
  />
)}
```

**Visibility Rules:**
- ✅ **ADMIN** in company mode → Can see Claims tab
- ✅ **MANAGER** in company mode → Can see Claims tab
- ❌ **EMPLOYEE** in company mode → Cannot see Claims tab
- ❌ **Anyone** in personal mode → Cannot see Claims tab

---

## 🎯 **Summary**

### **Where to Find Reimbursement Requests:**

**For EMPLOYEE:**
- Cannot see Claims tab
- Can only submit requests via "Request Reimbursement" checkbox
- Can view own expenses in Expenses tab

**For MANAGER/ADMIN:**
1. Login with MANAGER or ADMIN credentials
2. Switch to **Company Mode**
3. Go to **Claims** tab (💰 icon in bottom navigation)
4. Select **Pending** tab
5. See all pending reimbursement requests
6. Tap to approve/reject

### **If Claims Tab is Not Visible:**
1. ✅ Make sure you're in **Company Mode** (check mode badge at top)
2. ✅ Make sure you're logged in as **MANAGER** or **ADMIN**
3. ✅ Check Profile → Company section → "Your Role"

### **If Claims Tab is Empty:**
1. ✅ Make sure employee created expense in **Company Mode**
2. ✅ Make sure employee **checked "Request Reimbursement"** checkbox
3. ✅ Check console logs for errors during expense creation
4. ✅ Verify you're viewing the correct company

---

## 🔍 **Debug Checklist**

### **Employee Side:**
```bash
# Check if expense was created correctly
1. Go to Expenses tab
2. Find your expense
3. Tap to open details
4. Look for "Reimbursable: Yes"
5. Check console logs for:
   - "Expense added and reimbursement requested successfully"
```

### **Manager/Admin Side:**
```bash
# Check if you can see Claims tab
1. Go to Profile tab
2. Check "Your Role" - should be ADMIN or MANAGER
3. Check mode badge - should show company name
4. Go to bottom navigation
5. Look for Claims tab (💰 icon)
6. If not visible:
   - Switch to company mode
   - Verify your role is MANAGER or ADMIN
```

### **API Debug:**
```bash
# Check API calls in console
[ReimbursementService] Requesting reimbursement for expense: 123
[ClaimsScreen] Loading pending reimbursements for company: 1
[ClaimsScreen] Found X pending reimbursements
```

---

## ✅ **Quick Answer**

**Q: Where can I see the reimbursement request?**

**A:** 
1. Login as **MANAGER** or **ADMIN**
2. Switch to **Company Mode**
3. Go to **Claims** tab (💰 icon in bottom navigation)
4. Select **Pending** tab
5. You'll see all pending reimbursement requests there!

**Note:** The Claims tab is **ONLY visible for MANAGER/ADMIN in company mode**. EMPLOYEE users cannot see it.

---

**Last Updated:** December 2, 2025  
**Status:** ✅ **WORKFLOW DOCUMENTED**
