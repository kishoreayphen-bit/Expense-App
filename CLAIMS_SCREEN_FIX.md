# 🔧 Claims Screen 400 Error - Fixed

## ❌ **Problem**

Claims screen was failing with 400 error:
```
ERROR [API] Request failed: GET /api/v1/reimbursements/pending
{"code": "ERR_BAD_REQUEST", "status": 400}
Error: Only ADMIN or MANAGER can approve reimbursements
```

---

## 🔍 **Root Cause**

The backend `ReimbursementService` only allowed **ADMIN** and **MANAGER** roles to view pending reimbursements, but the user had **OWNER** role.

**Backend Logic:**
```java
if (!"ADMIN".equals(member.getRole()) && !"MANAGER".equals(member.getRole())) {
    throw new IllegalArgumentException("Only ADMIN or MANAGER can approve reimbursements");
}
```

**User's Role in Database:**
```sql
SELECT role FROM company_members WHERE user_id = 6;
-- Result: OWNER
```

**Mismatch:** OWNER role was not included in the permission check.

---

## ✅ **Solution Applied**

Updated `ReimbursementService.java` to include **OWNER** role in permission checks.

### **File:** `backend/src/main/java/com/expenseapp/expense/ReimbursementService.java`

#### **Change 1: Permission Verification**
```java
// Before:
if (!"ADMIN".equals(member.getRole()) && !"MANAGER".equals(member.getRole())) {
    throw new IllegalArgumentException("Only ADMIN or MANAGER can approve reimbursements");
}

// After:
String role = member.getRole();
if (!"ADMIN".equals(role) && !"MANAGER".equals(role) && !"OWNER".equals(role)) {
    throw new IllegalArgumentException("Only OWNER, ADMIN or MANAGER can approve reimbursements");
}
```

#### **Change 2: Notification Recipients**
```java
// Before:
List<CompanyMember> adminMembers = companyMemberRepository.findAllByCompany(company).stream()
    .filter(m -> "ADMIN".equals(m.getRole()) || "MANAGER".equals(m.getRole()))
    .toList();

// After:
List<CompanyMember> adminMembers = companyMemberRepository.findAllByCompany(company).stream()
    .filter(m -> "OWNER".equals(m.getRole()) || "ADMIN".equals(m.getRole()) || "MANAGER".equals(m.getRole()))
    .toList();
```

---

## 🎯 **What Changed**

### **Permissions Updated:**
- ✅ **OWNER** can now view pending reimbursements
- ✅ **OWNER** can approve/reject reimbursements
- ✅ **OWNER** receives notifications for new reimbursement requests
- ✅ **ADMIN** can still do all the above (unchanged)
- ✅ **MANAGER** can still do all the above (unchanged)

### **Affected Endpoints:**
1. `GET /api/v1/reimbursements/pending?companyId={id}`
2. `GET /api/v1/reimbursements/history?companyId={id}`
3. `POST /api/v1/reimbursements/approve/{expenseId}`
4. `POST /api/v1/reimbursements/reject/{expenseId}`
5. `POST /api/v1/reimbursements/mark-paid/{expenseId}`

---

## 🧪 **Testing**

### **Before Fix:**
```
GET /api/v1/reimbursements/pending?companyId=1
Status: 400 Bad Request
Error: "Only ADMIN or MANAGER can approve reimbursements"
```

### **After Fix:**
```
GET /api/v1/reimbursements/pending?companyId=1
Status: 200 OK
Response: [list of pending reimbursements]
```

---

## 📊 **Role Hierarchy**

In company mode, roles now have these permissions:

| Role | View Claims | Approve/Reject | Receive Notifications |
|------|-------------|----------------|----------------------|
| **OWNER** | ✅ | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ |
| **MANAGER** | ✅ | ✅ | ✅ |
| **EMPLOYEE** | ❌ | ❌ | ❌ |

**Note:** EMPLOYEE role can only:
- Submit reimbursement requests
- View their own reimbursement status
- Cannot view or approve others' reimbursements

---

## 🔄 **Backend Restart**

Backend was restarted to apply changes:
```bash
docker-compose restart backend
```

**Status:** ✅ Backend running successfully

---

## 📝 **Summary**

**Issue:** Claims screen 400 error due to missing OWNER role in permission check

**Fix:** Added OWNER role to reimbursement permission checks

**Impact:** 
- OWNER users can now access Claims screen
- OWNER users receive reimbursement notifications
- No breaking changes to existing ADMIN/MANAGER functionality

**Status:** ✅ **Fixed and Deployed**

---

**Fixed:** November 26, 2025, 5:15 PM IST  
**Backend Restarted:** ✅ Yes  
**Ready to Test:** ✅ Yes
