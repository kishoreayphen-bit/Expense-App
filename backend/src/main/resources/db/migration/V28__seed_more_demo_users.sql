-- Seed 10 more demo users for group selection and testing
-- Requires pgcrypto (enabled once; harmless if already exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert users (id will be auto-generated). Default password: User@123
INSERT INTO users (name, email, phone, password, role, enabled)
VALUES
  ('User One',   'user1@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Two',   'user2@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Three', 'user3@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Four',  'user4@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Five',  'user5@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Six',   'user6@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Seven', 'user7@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Eight', 'user8@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Nine',  'user9@demo.local',  NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE),
  ('User Ten',   'user10@demo.local', NULL, crypt('User@123', gen_salt('bf')), 'USER', TRUE)
ON CONFLICT (email) DO NOTHING;
