# 🎯 Complete Reimbursement & Role Management Workflow

## 📋 **Requirements Summary**

### **1. Reimbursement Workflow**
- ✅ Employee can submit expense for reimbursement
- ✅ Request appears in manager/admin Claims tab
- ✅ Manager/admin can approve or reject
- ✅ Employee gets notified of status changes
- ✅ Employee can track request status

### **2. Role Management**
- ✅ New user registers → Role: USER (personal mode)
- ✅ User creates company → Role: ADMIN for that company
- ✅ User accepts invite → Gets assigned role from invitation
- ✅ User can have different roles in different companies

### **3. Notifications**
- ✅ Manager/admin notified when reimbursement requested
- ✅ Employee notified when request approved/rejected/paid

---

## 🔧 **Current Status**

### **✅ Already Implemented (Backend)**
1. **ReimbursementService.java** - Complete workflow logic
   - `requestReimbursement()` - Employee submits request
   - `approveReimbursement()` - Manager approves
   - `rejectReimbursement()` - Manager rejects
   - `markAsPaid()` - Manager marks as paid
   - `listPendingReimbursements()` - Get pending requests
   - `listReimbursementHistory()` - Get history

2. **Notifications** - Already sending
   - REIMBURSEMENT_REQUEST → To managers/admins
   - REIMBURSEMENT_APPROVED → To employee
   - REIMBURSEMENT_REJECTED → To employee
   - REIMBURSEMENT_PAID → To employee

3. **Database Schema** - All fields exist
   - `reimbursement_status` (PENDING/APPROVED/REJECTED/PAID)
   - `reimbursement_requested_at`
   - `reimbursement_approved_at`
   - `reimbursement_approved_by`
   - `reimbursement_paid_at`
   - `reimbursement_notes`

### **❌ Issues to Fix**

1. **500 Error on `/api/v1/reimbursements/pending`**
   - Likely: Database column mismatch or migration needed
   - Need to check if columns exist in DB

2. **Role Assignment**
   - Company creator should get ADMIN role automatically
   - Invited users should get role from invitation

3. **Mobile UI**
   - Claims tab exists but needs error handling
   - Need to add approve/reject buttons
   - Need to show status to employees

---

## 🎯 **Implementation Plan**

### **Phase 1: Fix Immediate Issues** ⚡

#### **1.1 Fix 500 Error**
```sql
-- Check if reimbursement columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name LIKE '%reimbursement%';

-- If missing, add migration
```

#### **1.2 Add Database Migration**
Create `V50__add_reimbursement_columns.sql`:
```sql
-- Add reimbursement columns if they don't exist
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_status VARCHAR(20);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_requested_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_approved_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_approved_by_id BIGINT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_paid_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_notes TEXT;

-- Add foreign key
ALTER TABLE expenses 
ADD CONSTRAINT IF NOT EXISTS fk_reimbursement_approved_by 
FOREIGN KEY (reimbursement_approved_by_id) REFERENCES users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_expenses_reimbursement_status 
ON expenses(company_id, reimbursement_status);
```

---

### **Phase 2: Role Assignment** 👥

#### **2.1 Company Creator Gets ADMIN Role**

**File:** `CompanyService.java`

```java
@Transactional
public Company createCompany(String userEmail, CreateCompanyRequest request) {
    User user = userRepository.findByEmail(userEmail)
        .orElseThrow(() -> new IllegalArgumentException("User not found"));
    
    // Create company
    Company company = new Company();
    company.setCompanyName(request.getCompanyName());
    company.setCompanyCode(request.getCompanyCode());
    company.setCreatedBy(user);
    company = companyRepository.save(company);
    
    // Add creator as ADMIN member
    CompanyMember member = new CompanyMember();
    member.setCompany(company);
    member.setUser(user);
    member.setRole("ADMIN");  // ← Creator gets ADMIN role
    member.setJoinedAt(Instant.now());
    companyMemberRepository.save(member);
    
    log.info("Created company {} with creator {} as ADMIN", 
        company.getCompanyName(), user.getEmail());
    
    return company;
}
```

#### **2.2 Invited User Gets Assigned Role**

**File:** `CompanyMemberService.java`

```java
@Transactional
public CompanyMember inviteMember(Long companyId, InviteMemberRequest request) {
    // ... existing validation ...
    
    // Create invitation with specified role
    CompanyMember invitation = new CompanyMember();
    invitation.setCompany(company);
    invitation.setUser(invitedUser);
    invitation.setRole(request.getRole());  // ← Use role from request (ADMIN/MANAGER/EMPLOYEE)
    invitation.setStatus("PENDING");
    invitation.setInvitedAt(Instant.now());
    invitation.setInvitedBy(inviter);
    
    return companyMemberRepository.save(invitation);
}

@Transactional
public CompanyMember acceptInvitation(String userEmail, Long companyId) {
    // ... existing validation ...
    
    // Accept invitation - role is already set from invitation
    member.setStatus("ACTIVE");
    member.setJoinedAt(Instant.now());
    
    log.info("User {} accepted invitation to company {} with role {}", 
        userEmail, companyId, member.getRole());
    
    return companyMemberRepository.save(member);
}
```

---

### **Phase 3: Mobile UI Enhancements** 📱

#### **3.1 Fix ClaimsScreen Error Handling**

**File:** `ClaimsScreen.tsx`

```typescript
const loadData = async () => {
  if (!activeCompanyId) {
    setError('Please select a company to view claims');
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    const data = await ReimbursementService.getPendingClaims(activeCompanyId);
    setPendingClaims(data);
  } catch (err: any) {
    console.error('[ClaimsScreen] Error loading claims:', err);
    setError(err.message || 'Failed to load claims');
    
    // Show user-friendly message
    Alert.alert(
      'Error Loading Claims',
      'Unable to load reimbursement requests. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    setLoading(false);
  }
};
```

#### **3.2 Add Approve/Reject Buttons**

```typescript
const ClaimCard = ({ claim }) => {
  const handleApprove = async () => {
    try {
      await ReimbursementService.approve(claim.id, notes);
      Alert.alert('Success', 'Reimbursement approved');
      loadData(); // Refresh
    } catch (err) {
      Alert.alert('Error', 'Failed to approve reimbursement');
    }
  };

  const handleReject = async () => {
    try {
      await ReimbursementService.reject(claim.id, reason);
      Alert.alert('Success', 'Reimbursement rejected');
      loadData(); // Refresh
    } catch (err) {
      Alert.alert('Error', 'Failed to reject reimbursement');
    }
  };

  return (
    <View style={styles.card}>
      {/* Claim details */}
      <View style={styles.actions}>
        <Button title="Approve" onPress={handleApprove} />
        <Button title="Reject" onPress={handleReject} />
      </View>
    </View>
  );
};
```

#### **3.3 Employee Status Tracking**

**File:** `ExpenseDetailScreen.tsx`

```typescript
// Show reimbursement status
{expense.reimbursable && (
  <View style={styles.reimbursementStatus}>
    <Text style={styles.label}>Reimbursement Status:</Text>
    <View style={[styles.statusBadge, getStatusStyle(expense.reimbursementStatus)]}>
      <Text style={styles.statusText}>
        {expense.reimbursementStatus || 'NOT_REQUESTED'}
      </Text>
    </View>
    
    {expense.reimbursementStatus === 'APPROVED' && (
      <Text style={styles.approvedText}>
        Approved by {expense.reimbursementApprovedBy?.name} 
        on {formatDate(expense.reimbursementApprovedAt)}
      </Text>
    )}
    
    {expense.reimbursementStatus === 'REJECTED' && (
      <Text style={styles.rejectedText}>
        Rejected: {expense.reimbursementNotes}
      </Text>
    )}
  </View>
)}
```

---

## 📊 **Complete Workflow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    User registers → Role: USER
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
          Creates Company        Receives Invite
                    ↓                   ↓
          Role: ADMIN           Role: As assigned
         (for that company)     (ADMIN/MANAGER/EMPLOYEE)

┌─────────────────────────────────────────────────────────────┐
│                 REIMBURSEMENT WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

EMPLOYEE                    MANAGER/ADMIN
   │                             │
   │ 1. Add Expense              │
   │    (mark reimbursable)      │
   │                             │
   │ 2. Submit Request           │
   ├──────────────────────────→  │
   │                             │ 3. Notification
   │                             │    "New Request"
   │                             │
   │                             │ 4. Review Request
   │                             │    - View details
   │                             │    - Check receipts
   │                             │
   │                             │ 5. Decision
   │                             ├─────┬─────┐
   │                             │     │     │
   │                        APPROVE  REJECT  │
   │                             │     │     │
   │ 6. Notification         ←───┴─────┘     │
   │    "Approved/Rejected"      │           │
   │                             │           │
   │ 7. Check Status             │           │
   │    - View in app            │           │
   │    - See notes              │           │
   │                             │           │
   │                             │ 8. Mark Paid
   │                             │    (if approved)
   │                             │
   │ 9. Notification         ←───┤
   │    "Payment Processed"      │
   │                             │
```

---

## 🧪 **Testing Checklist**

### **Reimbursement Flow**
- [ ] Employee can add expense with reimbursement flag
- [ ] Request appears in manager's Claims tab
- [ ] Manager can view request details
- [ ] Manager can approve with notes
- [ ] Manager can reject with reason
- [ ] Employee receives notification
- [ ] Employee can see status in expense detail
- [ ] Approved request can be marked as paid
- [ ] Employee receives payment notification

### **Role Assignment**
- [ ] New user has USER role
- [ ] Company creator gets ADMIN role
- [ ] ADMIN can invite with different roles
- [ ] Invited user gets assigned role
- [ ] User can have different roles in different companies
- [ ] Role determines permissions correctly

### **Notifications**
- [ ] Manager notified on new request
- [ ] Employee notified on approval
- [ ] Employee notified on rejection
- [ ] Employee notified on payment
- [ ] Notifications show in app
- [ ] Notifications have correct data

---

## 🚀 **Next Steps**

1. **Fix 500 Error** - Add database migration
2. **Update CompanyService** - Auto-assign ADMIN role
3. **Update InviteService** - Use role from invitation
4. **Enhance ClaimsScreen** - Add approve/reject UI
5. **Update ExpenseDetailScreen** - Show status tracking
6. **Test End-to-End** - Complete workflow

---

**Status:** Ready to implement  
**Priority:** High  
**Estimated Time:** 2-3 hours
