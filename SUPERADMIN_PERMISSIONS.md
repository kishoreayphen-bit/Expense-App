# 🔐 SUPER_ADMIN Role - Permissions & Actions

## Overview
The **SUPER_ADMIN** role has the highest level of access in the system. This role is designed for system administrators who need full oversight and control over all companies, users, and operations.

---

## 🏢 Company Management Permissions

### ✅ View All Companies
- **Action:** List and view all companies in the system
- **Endpoint:** `GET /api/v1/companies` or `GET /api/v1/companies/my`
- **Description:** SUPER_ADMIN can see ALL companies, regardless of membership
- **Benefit:** Complete system oversight

### ✅ View Any Company Details
- **Action:** Access detailed information of any company
- **Endpoint:** `GET /api/v1/companies/{id}`
- **Description:** No membership required - full access to any company
- **Benefit:** Monitor and audit any company

### ✅ Create Companies
- **Action:** Create new companies
- **Endpoint:** `POST /api/v1/companies`
- **Description:** Can create companies on behalf of any user
- **Benefit:** System setup and management

### ❌ Update Company (DISABLED)
- **Action:** Modify company details
- **Endpoint:** `PUT /api/v1/companies/{id}`
- **Description:** Company updates are **disabled for all roles**
- **Reason:** Companies are permanent once created

### ❌ Delete Company (DISABLED)
- **Action:** Remove companies from the system
- **Endpoint:** `DELETE /api/v1/companies/{id}`
- **Description:** Company deletion is **disabled for all roles**
- **Reason:** Companies are permanent - cannot be deleted

---

## 💰 Expense Management Permissions

### ✅ View All Expenses
- **Action:** View expenses across all companies and users
- **Endpoint:** `GET /api/v1/expenses`
- **Description:** Full visibility into all expense data
- **Benefit:** System-wide expense monitoring and audit

### ✅ Update Any Expense
- **Action:** Modify any expense regardless of owner
- **Endpoint:** `PATCH /api/v1/expenses/{id}`
- **Description:** Can update amount, category, merchant, etc.
- **Benefit:** Fix errors, correct data issues
- **Note:** Bypasses ownership and ACL checks

### ✅ Delete Any Expense
- **Action:** Remove any expense from the system
- **Endpoint:** `DELETE /api/v1/expenses/{id}`
- **Description:** Can delete expenses from any user/company
- **Benefit:** Remove fraudulent or incorrect entries
- **Note:** Also deletes associated bills

---

## 📊 Budget Management Permissions

### ✅ Create Budgets
- **Action:** Create budgets for any user or company
- **Endpoint:** `POST /api/v1/budgets`
- **Description:** Set up budgets system-wide
- **Benefit:** Help users with budget planning

### ✅ Update Any Budget
- **Action:** Modify any budget (personal or company)
- **Endpoint:** `PUT /api/v1/budgets/{id}`
- **Description:** Change amounts, alerts, periods
- **Benefit:** Adjust budgets as needed
- **Note:** Bypasses ownership checks

### ✅ Delete Any Budget
- **Action:** Remove any budget from the system
- **Endpoint:** `DELETE /api/v1/budgets/{id}`
- **Description:** Clean up unused or incorrect budgets
- **Benefit:** System maintenance

---

## 👥 Team/Group Management Permissions

### ✅ Create Teams
- **Action:** Create groups/teams for any company
- **Endpoint:** `POST /api/v1/groups`
- **Description:** Set up teams for organization
- **Benefit:** Help companies organize

### ✅ View All Teams
- **Action:** See all groups across the system
- **Endpoint:** `GET /api/v1/groups`
- **Description:** Full visibility into team structure
- **Benefit:** Monitor team organization

### ✅ Delete Any Team
- **Action:** Remove any group/team
- **Endpoint:** `DELETE /api/v1/groups/{id}`
- **Description:** Can delete teams (unlinks expenses, removes members)
- **Benefit:** Clean up inactive teams
- **Note:** Bypasses owner-only restriction

---

## 👥 Member Management Permissions

### ✅ View All Company Members
- **Action:** List members of any company
- **Endpoint:** `GET /api/v1/companies/{companyId}/members`
- **Description:** View members without being part of the company
- **Benefit:** User management and oversight

### ✅ Invite Members to Any Company
- **Action:** Send invitations to join any company
- **Endpoint:** `POST /api/v1/companies/{companyId}/members/invite`
- **Description:** Can invite users to any company as any role
- **Benefit:** Help companies with onboarding
- **Roles can assign:** OWNER, ADMIN, MANAGER, EMPLOYEE

### ✅ Remove Members from Any Company
- **Action:** Remove users from any company
- **Endpoint:** `DELETE /api/v1/companies/{companyId}/members/{memberId}`
- **Description:** Can remove members (except OWNER) from any company
- **Benefit:** Resolve disputes, manage access
- **Limitation:** Cannot remove company OWNER

---

## 🎯 Key Differences from Other Roles

| Permission | SUPER_ADMIN | ADMIN | OWNER | MANAGER | EMPLOYEE |
|-----------|-------------|-------|-------|---------|----------|
| View all companies | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create companies | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update companies | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete companies | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update any expense | ✅ | ✅ | Own only | Own only | Own only |
| Delete any expense | ✅ | ✅ | Own only | Own only | Own only |
| Update any budget | ✅ | ✅ | Own only | Own only | Own only |
| Delete any budget | ✅ | ✅ | Own only | Own only | Own only |
| Delete any team | ✅ | ✅ | Own only | ❌ | ❌ |
| Manage any members | ✅ | ✅ | Own only | ❌ | ❌ |

---

## 🔒 Security Considerations

### What SUPER_ADMIN CAN Do:
- ✅ View ALL companies system-wide
- ✅ Create new companies
- ✅ View all company data
- ✅ Invite/remove members from any company
- ✅ Update/delete any expense (all users)
- ✅ Update/delete any budget (all users)
- ✅ Delete any team/group
- ✅ Bypass ownership and membership requirements for viewing
- ✅ Full system-wide access as **app owner**

### What SUPER_ADMIN CANNOT Do:
- ❌ **Update companies** (companies are permanent once created)
- ❌ **Delete companies** (companies cannot be removed)
- ❌ Remove company OWNER (only OWNER can transfer ownership)
- ❌ Access user passwords (encrypted)
- ❌ Modify user roles directly (must go through company membership)

---

## 📋 Use Cases

### 1. **System Monitoring**
Monitor all companies and their activities for compliance and audit purposes.

### 2. **Customer Support**
Help company owners with setup, configuration, and troubleshooting.

### 3. **Data Management**
Clean up inactive companies, merge duplicates, or fix data issues.

### 4. **Emergency Access**
Resolve disputes, recover locked accounts, or manage critical situations.

### 5. **Onboarding Assistance**
Help new companies get started by setting up their structure.

---

## 🚀 Best Practices

1. **Use Sparingly:** Only use SUPER_ADMIN access when necessary
2. **Audit Trail:** All actions should be logged for accountability
3. **Communication:** Inform company owners before making changes
4. **Backup First:** Before deleting companies, ensure data is backed up
5. **Security:** Protect SUPER_ADMIN credentials with 2FA and strong passwords

---

## 🔑 Test Credentials

```
Email:    superadmin@expense.app
Password: password
Role:     SUPER_ADMIN
```

**Current Companies in System:**
1. Ayphen Technologies (ACME)
2. Zoho (ACM)
3. Esds (BME)

---

## 📝 Implementation Notes

**Backend Files Modified:**
- `CompanyService.java` - Added SUPER_ADMIN checks for update/delete
- `CompanyMemberService.java` - Added SUPER_ADMIN checks for invite/remove/list
- `ExpenseService.java` - Added SUPER_ADMIN checks for update/delete
- `BudgetService.java` - Added SUPER_ADMIN checks for update/delete
- `GroupService.java` - Added SUPER_ADMIN checks for delete
- All services check: `user.getRole() == Role.SUPER_ADMIN || user.getRole() == Role.ADMIN`

**Permission Pattern:**
```java
// SUPER_ADMIN and ADMIN can perform action on any company
if (user.getRole() != Role.SUPER_ADMIN && user.getRole() != Role.ADMIN) {
    // Regular permission checks for other users
}
```

---

## ⚠️ Important Notes

- **ADMIN role** has the same permissions as SUPER_ADMIN for company management
- **SUPER_ADMIN** is intended for system administrators
- **ADMIN** is intended for platform administrators
- Both roles bypass company membership requirements
- Use these roles responsibly and maintain audit logs

---

**Last Updated:** December 1, 2025  
**Version:** 1.0  
**Status:** ✅ Implemented and Active
