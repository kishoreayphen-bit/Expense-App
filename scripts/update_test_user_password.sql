-- Update test user with a known bcrypt hash for 'admin123'
UPDATE users 
SET password = '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C',
    enabled = true
WHERE email = 'test@example.com';

-- Verify the update
SELECT id, email, enabled, LENGTH(password) as password_length 
FROM users 
WHERE email = 'test@example.com';
