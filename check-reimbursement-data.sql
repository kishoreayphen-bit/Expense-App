-- Check Reimbursement Data in Database
-- Run this in PostgreSQL to see what's in the database

-- 1. Check all reimbursable expenses
SELECT 
    e.id,
    e.merchant,
    e.amount,
    e.currency,
    e.company_id,
    e.is_reimbursable,
    e.reimbursement_status,
    e.reimbursement_requested_at,
    u.email as user_email
FROM expenses e
JOIN users u ON e.user_id = u.id
WHERE e.is_reimbursable = true
ORDER BY e.created_at DESC;

-- 2. Check company members and their roles
SELECT 
    c.id as company_id,
    c.name as company_name,
    u.email as member_email,
    cm.role as member_role
FROM company_members cm
JOIN companies c ON cm.company_id = c.id
JOIN users u ON cm.user_id = u.id
ORDER BY c.id, cm.role;

-- 3. Check pending reimbursements with company info
SELECT 
    e.id as expense_id,
    e.merchant,
    e.amount,
    e.currency,
    e.company_id,
    e.reimbursement_status,
    e.reimbursement_requested_at,
    u.email as employee_email,
    c.name as company_name
FROM expenses e
JOIN users u ON e.user_id = u.id
LEFT JOIN companies c ON e.company_id = c.id
WHERE e.reimbursement_status = 'PENDING'
ORDER BY e.reimbursement_requested_at DESC;

-- 4. Check if superadmin's expenses have company_id
SELECT 
    e.id,
    e.merchant,
    e.amount,
    e.company_id,
    e.is_reimbursable,
    e.reimbursement_status,
    u.email
FROM expenses e
JOIN users u ON e.user_id = u.id
WHERE u.email = 'superadmin@expense.app'
ORDER BY e.created_at DESC
LIMIT 10;
