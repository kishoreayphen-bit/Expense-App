-- Delete existing test user if it exists
DELETE FROM users WHERE email = 'test2@example.com';

-- Insert new test user with a fresh password hash (password: test123)
INSERT INTO users (name, email, password, role, enabled, created_at) 
VALUES (
    'Test User 2', 
    'test2@example.com', 
    '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C', 
    'USER', 
    true, 
    NOW()
);
