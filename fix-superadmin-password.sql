-- Reset super admin password to Password123!
UPDATE users 
SET password = '$2a$10$dXJ3SW6G7P370kBeiUA.NO/RbpqU4cccD5A3nkSzKFocurBQQR4GC'
WHERE email = 'superadmin@expense.app';

-- Verify
SELECT id, email, substring(password, 1, 30) as password_start 
FROM users 
WHERE email = 'superadmin@expense.app';
