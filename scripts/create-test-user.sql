-- Insert a test user with a pre-hashed password (bcrypt hash of 'admin123')
-- The password hash is for 'admin123' using BCrypt with strength 10
INSERT INTO users (name, email, password, role, enabled, created_at)
VALUES (
    'Admin User',
    'admin@example.com',
    '$2a$10$XALsOhfzUyKs4ufd4q1XQOZvYZv5Y3WkQ9nQYJfPYQnWYVYD8KJ6C',
    'ADMIN',
    true,
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    enabled = EXCLUDED.enabled;
