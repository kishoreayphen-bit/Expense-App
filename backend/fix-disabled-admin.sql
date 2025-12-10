-- Fix disabled admin account
-- Run this SQL script to enable the admin@demo.local account

-- Enable the admin account
UPDATE users 
SET enabled = true 
WHERE email = 'admin@demo.local';

-- Verify the change
SELECT id, name, email, role, enabled 
FROM users 
WHERE email = 'admin@demo.local';

-- Enable all demo accounts if needed
UPDATE users 
SET enabled = true 
WHERE email LIKE '%@demo.local';

-- Show all demo accounts
SELECT id, name, email, role, enabled 
FROM users 
WHERE email LIKE '%@demo.local'
ORDER BY role, email;
