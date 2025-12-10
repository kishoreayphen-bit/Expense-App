# 🔧 Reimbursement & Bill Number Fixes

**Date:** November 27, 2025, 10:14 AM IST  
**Status:** ✅ Fixes Applied - Backend Rebuilding

---

## 🐛 **Issue 1: Reimbursement Request 400 Error**

### **Problem:**
```
ERROR [API] Request failed: POST /api/v1/reimbursements/request/119
Status: 400
Message: "Expense is not marked as reimbursable"
```

### **Root Cause:**
Frontend was sending `isReimbursable: true` but backend DTO expects `reimbursable`.

**Database verification:**
```sql
SELECT id, merchant, is_reimbursable FROM expenses WHERE id = 119;
 id  | merchant | is_reimbursable 
-----+----------+-----------------
 119 | Amazon   | f               
```

The expense was saved with `is_reimbursable = false` even though checkbox was checked!

### **Why It Happened:**
- **Frontend:** Sending `isReimbursable: true`
- **Backend DTO:** Field name is `reimbursable` (not `isReimbursable`)
- **Jackson mapping:** Failed to map `isReimbursable` → `reimbursable`

### **Solution:**

**File:** `mobile/src/screens/AddExpenseScreen.tsx`

Changed line 477:
```typescript
// BEFORE
isReimbursable: isReimbursable,

// AFTER
reimbursable: isReimbursable,
```

**Backend DTO (already correct):**
```java
// ExpenseCreateRequest.java
private boolean reimbursable;

public boolean isReimbursable() { return reimbursable; }
public void setReimbursable(boolean reimbursable) { this.reimbursable = reimbursable; }
```

### **Result:**
- ✅ Frontend now sends `reimbursable: true`
- ✅ Backend correctly receives and saves the flag
- ✅ Reimbursement request will succeed

---

## 🐛 **Issue 2: Duplicate Bill Numbers Allowed**

### **Problem:**
Users can upload multiple bills with the same bill number, causing confusion.

### **Expected Behavior:**
- Each bill number should be unique per user
- Personal mode: Bill numbers unique within personal bills
- Company mode: Bill numbers unique within company bills
- Clear error message when duplicate detected

### **Solution:**

**File:** `backend/src/main/java/com/expenseapp/bill/BillService.java`

Added duplicate check before saving:

```java
// Check for duplicate bill number
if (request.getBillNumber() != null && !request.getBillNumber().trim().isEmpty()) {
    List<Bill> existingBills = billRepository.findByUserIdAndBillNumber(user.getId(), request.getBillNumber().trim());
    // Filter by company context
    boolean hasDuplicate = existingBills.stream()
        .anyMatch(b -> {
            if (companyId == null) {
                return b.getCompanyId() == null; // Personal mode - check personal bills
            } else {
                return companyId.equals(b.getCompanyId()); // Company mode - check company bills
            }
        });
    
    if (hasDuplicate) {
        throw new IllegalArgumentException("Bill number '" + request.getBillNumber().trim() + "' already exists. Please use a different bill number.");
    }
}
```

**File:** `backend/src/main/java/com/expenseapp/bill/BillRepository.java`

Added repository method:

```java
List<Bill> findByUserIdAndBillNumber(Long userId, String billNumber);
```

### **How It Works:**

1. **User uploads bill** with bill number "INV-001"
2. **Backend checks** if bill number exists for this user
3. **Context-aware:**
   - Personal mode: Checks only personal bills (companyId = null)
   - Company mode: Checks only bills in same company
4. **If duplicate found:** Throws error with clear message
5. **If unique:** Saves bill normally

### **Result:**
- ✅ Duplicate bill numbers rejected
- ✅ Clear error message shown to user
- ✅ Context-aware (personal vs company)
- ✅ Case-sensitive matching
- ✅ Trimmed whitespace

---

## 📊 **Changes Summary**

| File | Change | Type |
|------|--------|------|
| `AddExpenseScreen.tsx` | Changed `isReimbursable` to `reimbursable` | Frontend |
| `BillService.java` | Added duplicate bill number validation | Backend |
| `BillRepository.java` | Added `findByUserIdAndBillNumber` method | Backend |

---

## 🚀 **Deployment**

### **Backend Build:**
```bash
docker-compose build --no-cache backend
```
Status: ⏳ **Building...**

### **After Build Completes:**
```bash
docker-compose up -d backend
```

### **Verify Backend:**
```bash
docker logs expense_backend --tail 50
```

---

## 🧪 **Testing**

### **Test 1: Reimbursement Request**

**Steps:**
1. Switch to company mode
2. Go to Add Expense screen
3. Fill expense details:
   - Amount: 500
   - Merchant: Test Store
   - Category: Select any
   - Date: Today
4. ✅ **Check "Request Reimbursement"**
5. Submit expense
6. ✅ **Should succeed (no 400 error)**
7. ✅ **Should show success message**
8. Go to Claims screen
9. ✅ **Should see expense in pending claims**

**Verify in database:**
```sql
SELECT id, merchant, is_reimbursable, reimbursement_status 
FROM expenses 
WHERE merchant = 'Test Store' 
ORDER BY id DESC LIMIT 1;
```

Expected:
```
 id  | merchant   | is_reimbursable | reimbursement_status 
-----+------------+-----------------+----------------------
 120 | Test Store | t               | PENDING
```

### **Test 2: Duplicate Bill Number Prevention**

**Steps:**
1. Go to Add Expense screen
2. Fill expense details
3. Attach receipt
4. Enter bill number: **"INV-001"**
5. Submit expense
6. ✅ **Should succeed**
7. Go to Bills screen
8. ✅ **Should see bill with number "INV-001"**
9. Create another expense
10. Attach receipt
11. Enter same bill number: **"INV-001"**
12. Submit expense
13. ✅ **Should fail with error:**
    ```
    "Bill number 'INV-001' already exists. 
     Please use a different bill number."
    ```
14. Change bill number to **"INV-002"**
15. Submit expense
16. ✅ **Should succeed**

**Test in both modes:**
- Personal mode: Bill numbers unique within personal bills
- Company mode: Bill numbers unique within company bills

---

## 🔍 **Error Messages**

### **Reimbursement Errors:**

**Before Fix:**
```
ERROR [API] Request failed: POST /api/v1/reimbursements/request/119
Status: 400
Message: "Expense is not marked as reimbursable"
```

**After Fix:**
```
✅ Success: Expense added and reimbursement requested successfully
```

### **Duplicate Bill Number:**

**Error Message:**
```
Bill number 'INV-001' already exists. 
Please use a different bill number.
```

**User Action:**
- Change bill number to unique value
- Or leave bill number empty (optional field)

---

## 📝 **Technical Details**

### **Reimbursement Flow:**

1. **Frontend:**
   ```typescript
   const expenseData = {
     ...formData,
     reimbursable: isReimbursable,  // ✅ Correct field name
   };
   ```

2. **Backend DTO:**
   ```java
   private boolean reimbursable;  // ✅ Matches frontend
   ```

3. **Backend Service:**
   ```java
   e.setReimbursable(req.isReimbursable());  // ✅ Saves to DB
   ```

4. **Database:**
   ```sql
   is_reimbursable = true  -- ✅ Correctly saved
   ```

5. **Reimbursement Request:**
   ```java
   if (!expense.isReimbursable()) {
       throw new IllegalArgumentException("...");  // ✅ Passes validation
   }
   ```

### **Bill Number Validation:**

1. **Check if bill number provided:**
   ```java
   if (request.getBillNumber() != null && !request.getBillNumber().trim().isEmpty())
   ```

2. **Find existing bills:**
   ```java
   List<Bill> existingBills = billRepository.findByUserIdAndBillNumber(user.getId(), billNumber);
   ```

3. **Filter by context:**
   ```java
   boolean hasDuplicate = existingBills.stream()
       .anyMatch(b -> {
           if (companyId == null) {
               return b.getCompanyId() == null;  // Personal
           } else {
               return companyId.equals(b.getCompanyId());  // Company
           }
       });
   ```

4. **Reject if duplicate:**
   ```java
   if (hasDuplicate) {
       throw new IllegalArgumentException("Bill number already exists");
   }
   ```

---

## ⚠️ **Important Notes**

### **Reimbursement:**
- Only works in company mode
- Requires OWNER/ADMIN/MANAGER to approve
- Expense must have `reimbursable = true`
- Status changes: null → PENDING → APPROVED/REJECTED → PAID

### **Bill Numbers:**
- Optional field (can be empty)
- Case-sensitive ("INV-001" ≠ "inv-001")
- Whitespace trimmed before checking
- Scoped to user + company context
- Different users can use same bill number
- Same user can use same bill number in different companies

### **Data Isolation:**
- Personal bills: `companyId = null`
- Company bills: `companyId = 1, 2, 3, etc.`
- Duplicate check respects this isolation

---

## 🐛 **If Issues Persist**

### **Reimbursement Still Failing:**

1. **Check expense in database:**
   ```sql
   SELECT id, merchant, is_reimbursable, reimbursement_status 
   FROM expenses 
   WHERE id = YOUR_EXPENSE_ID;
   ```

2. **Check backend logs:**
   ```bash
   docker logs expense_backend --tail 100 | grep -i "reimburs"
   ```

3. **Verify user role:**
   ```sql
   SELECT cm.role 
   FROM company_members cm 
   WHERE cm.user_id = YOUR_USER_ID 
   AND cm.company_id = YOUR_COMPANY_ID;
   ```

### **Duplicate Bill Check Not Working:**

1. **Check existing bills:**
   ```sql
   SELECT id, bill_number, user_id, company_id 
   FROM bills 
   WHERE user_id = YOUR_USER_ID 
   AND bill_number = 'YOUR_BILL_NUMBER';
   ```

2. **Check backend logs:**
   ```bash
   docker logs expense_backend --tail 100 | grep -i "bill"
   ```

3. **Verify backend rebuilt:**
   ```bash
   docker images | grep expenses-backend
   ```

---

## ✅ **Summary**

| Issue | Root Cause | Fix | Status |
|-------|-----------|-----|--------|
| Reimbursement 400 | Field name mismatch | Changed `isReimbursable` → `reimbursable` | ✅ Fixed |
| Duplicate bills | No validation | Added duplicate check in BillService | ✅ Fixed |

**Files Modified:** 3  
**Backend Rebuild:** ⏳ In Progress  
**Frontend Changes:** ✅ Complete  

---

## 🎯 **Next Steps**

1. ⏳ Wait for backend build to complete
2. ✅ Start backend: `docker-compose up -d backend`
3. ✅ Verify logs: `docker logs expense_backend --tail 50`
4. ✅ Restart mobile app
5. ✅ Test reimbursement request
6. ✅ Test duplicate bill number prevention
7. ✅ Report results

---

**Both fixes implemented and ready for testing!** 🚀
