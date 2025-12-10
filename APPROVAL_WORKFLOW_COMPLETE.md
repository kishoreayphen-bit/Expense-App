# ✅ Approval Workflow - Complete Implementation

## 🎯 **All Issues Fixed**

### **Issue 1: Self-Approval Prevention** ✅ FIXED
**Problem:** Managers could approve their own expenses  
**Solution:** Added logic to prevent users from approving their own expenses

### **Issue 2: ManageMembers Navigation** ✅ FIXED
**Problem:** No way to access ManageMembersScreen  
**Solution:** Added "Manage Members (Invite)" button in ProfileScreen for ADMIN users

### **Issue 3: Approval Workflow Logic** ✅ IMPLEMENTED
**Solution:** Clear workflow for reimbursement approvals with role-based rules

---

## 📋 **Approval Workflow Rules**

### **Who Can Approve Expenses?**

| User Role | Can Approve? | Can Approve Own? | Notes |
|-----------|--------------|------------------|-------|
| **EMPLOYEE** | ❌ No | ❌ No | Can only submit expenses |
| **MANAGER** | ✅ Yes | ❌ No | Can approve team expenses (not own) |
| **ADMIN** | ✅ Yes | ❌ No | Can approve all company expenses (not own) |
| **SUPER_ADMIN** | ✅ Yes | ❌ No | Can approve all expenses (not own) |

### **Approval Scenarios**

#### **Scenario 1: Employee Submits Reimbursement**
```
1. EMPLOYEE creates expense (isReimbursable = true)
2. Expense status: PENDING (or undefined)
3. MANAGER or ADMIN can see approval buttons
4. MANAGER/ADMIN approves or rejects
5. Expense status: APPROVED or REJECTED
```

#### **Scenario 2: Manager Submits Reimbursement**
```
1. MANAGER creates expense (isReimbursable = true)
2. Expense status: PENDING
3. MANAGER cannot see approval buttons (own expense)
4. ADMIN can see approval buttons
5. ADMIN approves or rejects
6. Expense status: APPROVED or REJECTED
```

#### **Scenario 3: Admin Submits Reimbursement**
```
1. ADMIN creates expense (isReimbursable = true)
2. Expense status: PENDING
3. ADMIN cannot see approval buttons (own expense)
4. Another ADMIN or SUPER_ADMIN can approve
5. Expense status: APPROVED or REJECTED
```

---

## 🔧 **Technical Implementation**

### **1. Self-Approval Prevention**

**File:** `mobile/src/screens/ExpenseDetailScreen.tsx`

**Added Fields to Expense Interface:**
```typescript
interface Expense {
  // ... existing fields
  userId?: number; // Owner of the expense
  userEmail?: string; // Owner email
}
```

**Added State:**
```typescript
const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
```

**Load Current User:**
```typescript
const storedEmail = await AsyncStorage.getItem('userEmail');
setCurrentUserEmail(storedEmail);
```

**Self-Approval Check:**
```typescript
// Prevent self-approval: user cannot approve their own expenses
const isOwnExpense = expense && currentUserEmail && expense.userEmail === currentUserEmail;
const canApproveThisExpense = canUserApprove && !isOwnExpense;
```

**Updated Condition:**
```typescript
{canApproveThisExpense && isCompanyMode && (!expense.approvalStatus || expense.approvalStatus === 'PENDING') && (
  // Approval buttons
)}
```

---

### **2. Debug Banner**

**Shows All Conditions:**
```typescript
<View style={{ backgroundColor: '#FEF3C7', padding: 12, ... }}>
  <Text>canUserApprove: {String(canUserApprove)}</Text>
  <Text>isCompanyMode: {String(isCompanyMode)}</Text>
  <Text>approvalStatus: {expense.approvalStatus || 'undefined'}</Text>
  <Text>userRole: {userRole || 'null'}</Text>
  <Text>companyRole: {companyRole || 'null'}</Text>
  <Text>currentUser: {currentUserEmail || 'null'}</Text>
  <Text>expenseOwner: {expense.userEmail || 'null'}</Text>
  <Text>isOwnExpense: {String(isOwnExpense)}</Text>
  <Text>Show Buttons: {String(canApproveThisExpense && ...)}</Text>
  {isOwnExpense && (
    <Text style={{ color: '#DC2626' }}>⚠️ Cannot approve own expense</Text>
  )}
</View>
```

---

### **3. ManageMembers Navigation**

**File:** `mobile/src/screens/ProfileScreen.tsx`

**Added Button (Lines 430-439):**
```typescript
{/* Manage Members (Invite & Roles) - Only for ADMIN */}
{activeCompanyId && activeCompanyId > 0 && userRole === 'ADMIN' && (
  <TouchableOpacity 
    style={[styles.actionBtn, { backgroundColor: '#3B82F6', marginBottom: 12 }]} 
    onPress={() => navigation.navigate('ManageMembers')}
  >
    <MaterialIcons name="person-add" size={18} color="#fff" />
    <Text style={styles.actionText}>Manage Members (Invite)</Text>
  </TouchableOpacity>
)}
```

**Access Path:**
```
Profile → Company Section → "Manage Members (Invite)" button (blue)
```

---

## 🧪 **Testing Guide**

### **Test 1: Employee Reimbursement**
```bash
1. Login as employee@demo.local / Employee@123
2. Switch to company mode
3. Create expense with isReimbursable = true
4. Logout

5. Login as manager@demo.local / Manager@123
6. Switch to company mode
7. Open the expense
8. Check debug banner:
   - canUserApprove: true
   - isOwnExpense: false
   - Show Buttons: true
9. Should see "Approval Required" section
10. Tap "Approve" or "Reject"
11. Enter notes/reason
12. Submit
13. Expense status should update
```

### **Test 2: Manager Self-Approval (Should Fail)**
```bash
1. Login as manager@demo.local / Manager@123
2. Switch to company mode
3. Create expense with isReimbursable = true
4. Open the expense
5. Check debug banner:
   - canUserApprove: true
   - isOwnExpense: true
   - Show Buttons: false
   - ⚠️ Cannot approve own expense
6. Should NOT see approval buttons
7. Logout

8. Login as admin@demo.local / Admin@123
9. Switch to company mode
10. Open the same expense
11. Should see approval buttons
12. Can approve/reject
```

### **Test 3: Invite Members**
```bash
1. Login as admin@demo.local / Admin@123
2. Switch to company mode
3. Go to Profile tab
4. Scroll to Company section
5. Should see blue "Manage Members (Invite)" button
6. Tap it
7. Should navigate to ManageMembersScreen
8. Tap person-add icon (top-right)
9. Enter email and select role
10. Tap "Invite"
11. Invitation should be sent
```

---

## 📊 **Approval States**

### **Expense Approval Status:**
- **undefined** - New expense, not submitted for approval
- **PENDING** - Submitted, waiting for approval
- **APPROVED** - Approved by MANAGER/ADMIN
- **REJECTED** - Rejected by MANAGER/ADMIN

### **Visual Indicators:**
- **Green Badge** - APPROVED (#DCFCE7 bg, #16A34A text)
- **Red Badge** - REJECTED (#FEE2E2 bg, #DC2626 text)
- **Yellow Badge** - PENDING (#FEF3C7 bg, #CA8A04 text)

---

## 🎯 **Key Features**

### **1. Self-Approval Prevention**
- ✅ Users cannot approve their own expenses
- ✅ Debug banner shows "Cannot approve own expense"
- ✅ Approval buttons hidden for own expenses

### **2. Role-Based Approval**
- ✅ EMPLOYEE: Cannot approve
- ✅ MANAGER: Can approve others' expenses
- ✅ ADMIN: Can approve all expenses (except own)
- ✅ SUPER_ADMIN: Can approve all expenses (except own)

### **3. Company Mode Only**
- ✅ Approval only works in company mode
- ✅ Personal mode expenses don't have approval workflow

### **4. Status Tracking**
- ✅ Visual badges show approval status
- ✅ Timestamps for approvedAt
- ✅ Notes/reasons saved to expense

### **5. Member Management**
- ✅ ADMIN can access ManageMembersScreen
- ✅ Invite button visible in header
- ✅ Can invite members with role selection
- ✅ Can view all members
- ✅ Can remove members

---

## 🔍 **Debug Checklist**

### **If Approval Buttons Don't Show:**

1. **Check Debug Banner Values:**
   ```
   canUserApprove: Should be true for MANAGER/ADMIN
   isCompanyMode: Should be true
   approvalStatus: Should be undefined or PENDING
   isOwnExpense: Should be false
   Show Buttons: Should be true
   ```

2. **Common Issues:**
   - ❌ `isCompanyMode: false` → Switch to company mode
   - ❌ `canUserApprove: false` → Login as MANAGER/ADMIN
   - ❌ `isOwnExpense: true` → This is your expense, login as different user
   - ❌ `approvalStatus: APPROVED` → Expense already approved
   - ❌ `userRole: null` → Logout and login again

3. **Verify User Email:**
   ```typescript
   AsyncStorage.getItem('userEmail').then(email => console.log('Current user:', email));
   ```

---

## 📝 **Backend Requirements**

### **Expense Entity Must Have:**
```java
private String approvalStatus; // PENDING | APPROVED | REJECTED
private Instant approvedAt;
private Instant submittedAt;
private Long userId; // Owner ID
```

### **API Endpoints:**
```
POST /api/v1/expenses/{id}/approve
POST /api/v1/expenses/{id}/reject
```

### **Response Should Include:**
```json
{
  "id": 123,
  "userId": 456,
  "userEmail": "employee@demo.local",
  "approvalStatus": "APPROVED",
  "approvedAt": "2025-12-01T12:00:00Z",
  ...
}
```

---

## ✅ **Summary**

### **What Was Implemented:**
1. ✅ Self-approval prevention logic
2. ✅ Enhanced debug banner with all conditions
3. ✅ ManageMembers navigation button in ProfileScreen
4. ✅ Clear approval workflow rules
5. ✅ Role-based permission checks

### **How It Works:**
1. **Employee** creates reimbursement expense
2. **Manager/Admin** sees approval buttons (if not own expense)
3. **Manager/Admin** approves or rejects with notes
4. **Status** updates to APPROVED or REJECTED
5. **Badge** shows visual status

### **Access Points:**
- **Approval UI:** ExpenseDetailScreen (when conditions met)
- **Bulk Approval:** ExpensesScreen (selection mode)
- **Member Management:** Profile → "Manage Members (Invite)" button

---

## 🚀 **Next Steps**

1. **Enable admin account:**
   ```bash
   docker exec -it expense_postgres psql -U expense_user -d expenses -c "UPDATE users SET enabled = true WHERE email = 'admin@demo.local';"
   ```

2. **Login with correct credentials:**
   - Email: `admin@demo.local`
   - Password: `Admin@123`

3. **Test approval workflow:**
   - Create expense as EMPLOYEE
   - Approve as MANAGER/ADMIN
   - Verify self-approval prevention

4. **Test member management:**
   - Go to Profile
   - Tap "Manage Members (Invite)"
   - Invite new member

---

**Last Updated:** December 1, 2025  
**Status:** ✅ **COMPLETE - READY FOR TESTING**
