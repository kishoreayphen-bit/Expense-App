-- Update the test user's password to a known bcrypt hash of 'admin123'
UPDATE users 
SET password = '\x2432612431302458414c734f68667a55794b733475666434713158514f5a76595a76355933576b51396e51594a665059516e57595644384b4a3643'
WHERE email = 'test@example.com';

-- Verify the update
SELECT email, enabled, LENGTH(password) as pwd_length, 
       SUBSTRING(password, 1, 10) as pwd_prefix 
FROM users 
WHERE email = 'test@example.com';
