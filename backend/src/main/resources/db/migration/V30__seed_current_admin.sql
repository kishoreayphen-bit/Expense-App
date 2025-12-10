-- Seed the authenticated user observed in logs (admin@example.com)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (name, email, phone, password, role, enabled)
VALUES ('Admin Example', 'admin@example.com', NULL, crypt('Admin@123', gen_salt('bf')), 'ADMIN', TRUE)
ON CONFLICT (email) DO NOTHING;
