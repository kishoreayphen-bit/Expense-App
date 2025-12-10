-- First, let's check the current user data
SELECT id, email, password, enabled FROM users WHERE email = 'test@example.com';

-- Update the password to a known bcrypt hash for "test123"
-- This is a pre-computed bcrypt hash for "test123" with cost factor 10
UPDATE users 
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrqopYH0HnD7y3Bq5J2nT3a6QhQ1/CW'
WHERE email = 'test@example.com';

-- Verify the update
SELECT id, email, password, enabled FROM users WHERE email = 'test@example.com';
