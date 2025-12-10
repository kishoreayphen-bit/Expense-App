-- Seed initial roles/users and example groups/members
-- Uses pgcrypto to generate bcrypt hashes in DB for portability

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Admin
INSERT INTO users (name, email, phone, password, role, enabled)
VALUES ('Admin User', 'admin@demo.local', NULL, crypt('Admin@123', gen_salt('bf')), 'ADMIN', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Manager
INSERT INTO users (name, email, phone, password, role, enabled)
VALUES ('Manager User', 'manager@demo.local', NULL, crypt('Manager@123', gen_salt('bf')), 'MANAGER', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Normal users
INSERT INTO users (name, email, phone, password, role, enabled)
VALUES 
  ('Alice Doe', 'alice@demo.local', NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('Bob Ray', 'bob@demo.local', NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('Charlie Kim', 'charlie@demo.local', NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('Diana Lee', 'diana@demo.local', NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('Evan Park', 'evan@demo.local', NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Example groups owned by admin
-- Get admin id
WITH admin_u AS (
  SELECT id FROM users WHERE email = 'admin@demo.local'
), manager_u AS (
  SELECT id FROM users WHERE email = 'manager@demo.local'
)
INSERT INTO groups (name, type, owner_id, archived)
SELECT 'Demo Team', 'TEAM', (SELECT id FROM admin_u), FALSE
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Demo Team');

-- Add some members to Demo Team
DO $$
DECLARE
  g_id BIGINT;
BEGIN
  SELECT id INTO g_id FROM groups WHERE name = 'Demo Team';
  IF g_id IS NOT NULL THEN
    -- Upsert-like inserts (ignore if already present)
    INSERT INTO group_members (group_id, user_id, role)
      SELECT g_id, u.id, 'OWNER' FROM users u WHERE u.email = 'admin@demo.local'
      ON CONFLICT DO NOTHING;
    INSERT INTO group_members (group_id, user_id, role)
      SELECT g_id, u.id, 'MEMBER' FROM users u WHERE u.email = 'manager@demo.local'
      ON CONFLICT DO NOTHING;
    INSERT INTO group_members (group_id, user_id, role)
      SELECT g_id, u.id, 'MEMBER' FROM users u WHERE u.email IN ('alice@demo.local','bob@demo.local','charlie@demo.local')
      ON CONFLICT DO NOTHING;
  END IF;
END $$;
