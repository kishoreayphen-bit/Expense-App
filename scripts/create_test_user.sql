-- Delete existing test user if it exists
DELETE FROM users WHERE email = 'testuser@example.com';

-- Insert new test user with properly hashed password (password: test123)
INSERT INTO users (name, email, password, role, enabled, created_at) 
VALUES (
    'Test User', 
    'testuser@example.com', 
    '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C', 
    'USER', 
    true, 
    NOW()
);
