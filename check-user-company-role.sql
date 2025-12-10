-- Check user's role in company

-- 1. Check which user is logged in (from the logs it's superadmin@expense.app)
SELECT id, email, name, role as user_role FROM users WHERE email IN ('superadmin@expense.app', 'admin@demo.local');

-- 2. Check company members and their roles
SELECT 
    cm.id as member_id,
    c.id as company_id,
    c.company_name,
    u.email,
    u.name,
    u.role as user_table_role,
    cm.role as company_role,
    cm.joined_at
FROM company_members cm
JOIN companies c ON cm.company_id = c.id
JOIN users u ON cm.user_id = u.id
WHERE u.email IN ('superadmin@expense.app', 'admin@demo.local')
ORDER BY c.id, u.email;

-- 3. Check if there are any members for company ID 1
SELECT 
    cm.id,
    u.email,
    u.name,
    cm.role,
    cm.joined_at
FROM company_members cm
JOIN users u ON cm.user_id = u.id
WHERE cm.company_id = 1
ORDER BY cm.role, u.email;
