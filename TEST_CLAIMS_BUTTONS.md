# 🔍 Claims Tab Buttons Troubleshooting

## ✅ **What's Already Implemented**

The ClaimsScreen.tsx already has:
1. ✅ Approve button (lines 219-225)
2. ✅ Reject button (lines 226-232)
3. ✅ Mark as Paid button (lines 236-243)
4. ✅ API service methods (ReimbursementService)

---

## 🎯 **Why Buttons Might Not Be Visible**

### **Issue 1: No Pending Claims**
If there are no pending reimbursement requests, the list will be empty.

**Solution:** Create a test reimbursement request.

### **Issue 2: Buttons Only Show for Pending Tab**
The approve/reject buttons only appear when `activeTab === 'pending'` (line 217).

**Check:**
- Are you on the "Pending" tab?
- Or are you on "Approved", "Rejected", or "Paid" tabs?

### **Issue 3: Data Not Loading**
The claims might not be loading due to permission issues.

**Check backend logs for:**
- Permission errors
- "Not a member of this company"
- "Only OWNER, ADMIN or MANAGER can approve"

---

## 🧪 **Testing Steps**

### **Step 1: Create a Test Reimbursement Request**

**As EMPLOYEE:**
```bash
1. Login as: employee@expense.app / Password123!
2. Add a new expense
3. Toggle "Reimbursable" ON
4. Save expense
5. Tap "Request Reimbursement" button
```

### **Step 2: View in Claims Tab**

**As MANAGER:**
```bash
1. Login as: manager1@expense.app / password
2. Switch to company mode
3. Tap "Claims" tab
4. Ensure you're on "Pending" tab (should be default)
5. You should see the request with TWO buttons:
   - Green "Approve" button
   - Red "Reject" button
```

### **Step 3: Test Approve**
```bash
1. Tap "Approve" button
2. Enter notes (optional)
3. Tap "Approve" in dialog
4. Should show "Success" alert
5. Request should disappear from Pending
6. Go to "Approved" tab to see it there
```

### **Step 4: Test Reject**
```bash
1. Create another test request (as employee)
2. As manager, tap "Reject" button
3. Enter reason (required)
4. Tap "Reject" in dialog
5. Should show "Rejected" alert
6. Request should disappear from Pending
7. Go to "Rejected" tab to see it there
```

---

## 🔍 **Debug: Check What's Showing**

### **If you see the claim card but NO buttons:**

**Possible causes:**
1. You're not on the "Pending" tab
2. The `activeTab` state is not 'pending'
3. Styling issue hiding buttons

**Add debug logging:**
```typescript
// In ClaimsScreen.tsx, inside renderClaim function
console.log('[ClaimsScreen] Rendering claim:', {
  id: item.id,
  status: item.reimbursementStatus,
  activeTab: activeTab,
  shouldShowButtons: activeTab === 'pending'
});
```

### **If you don't see any claims at all:**

**Possible causes:**
1. No reimbursement requests exist
2. Permission error preventing data load
3. Wrong company selected

**Check console for:**
```javascript
[ClaimsScreen] Loading claims...
[API] Request: GET /api/v1/reimbursements/pending
[API] Response: 200 GET /api/v1/reimbursements/pending
```

---

## 🎨 **Button Styling (Already Implemented)**

The buttons are styled with:
- **Approve Button:** Green background (#10b981)
- **Reject Button:** Red background (#ef4444)
- **Icons:** MaterialIcons (check-circle, cancel)
- **Size:** Full width in action row, 14px padding
- **Text:** White, bold, 14px

They should be VERY visible!

---

## 🚀 **Quick Fix: Add Debug Logs**

If buttons still not showing, add this to ClaimsScreen.tsx:

```typescript
// After line 216, before the action row
console.log('[ClaimsScreen] Claim details:', {
  id: item.id,
  activeTab,
  shouldShowButtons: activeTab === 'pending',
  status: item.reimbursementStatus
});
```

Then check console output when viewing claims.

---

## 📋 **Expected UI**

```
┌────────────────────────────────────────┐
│ Taxi                     $50.00        │
│ employee@expense.app     Dec 2, 2025   │
│                                        │
│ Lunch with client                      │
│                                        │
│ ⏰ Requested: Dec 2, 2025              │
│                                        │
│ ┌─────────────┐  ┌─────────────┐      │
│ │ ✓ Approve   │  │ ✗ Reject    │      │
│ └─────────────┘  └─────────────┘      │
└────────────────────────────────────────┘
```

---

## 🎯 **Most Likely Issue**

**You probably don't have any pending reimbursement requests yet!**

**Solution:**
1. Create a test expense as employee
2. Mark it as reimbursable
3. Submit reimbursement request
4. Then check Claims tab as manager

---

**Please try creating a test reimbursement request and let me know what you see!** 🎯
