-- Delete existing test user if it exists
DELETE FROM users WHERE email = 'fresh@example.com';

-- Insert new test user with a fresh password hash (password: fresh123)
INSERT INTO users (name, email, password, role, enabled, created_at) 
VALUES (
    'Fresh User', 
    'fresh@example.com', 
    '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C', 
    'USER', 
    true, 
    NOW()
);
