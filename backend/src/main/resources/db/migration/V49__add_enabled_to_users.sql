-- Add enabled column to users table for user suspension feature
ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;

-- Set all existing users to enabled
UPDATE users SET enabled = true WHERE enabled IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_enabled ON users(enabled);
