-- Reset super admin password to "password"
-- This is the default Laravel bcrypt hash for "password"
UPDATE users 
SET password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'superadmin@expense.app';

SELECT id, email, 'password reset to: password' as note
FROM users 
WHERE email = 'superadmin@expense.app';
