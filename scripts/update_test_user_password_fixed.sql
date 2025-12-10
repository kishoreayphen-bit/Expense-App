-- Update the test user's password to a known good bcrypt hash for 'admin123'
UPDATE users 
SET password = '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C'
WHERE email = 'test@example.com';

-- Verify the update
SELECT id, email, enabled, LENGTH(password) as pwd_length, SUBSTRING(password, 1, 30) as pwd_prefix 
FROM users 
WHERE email = 'test@example.com';
