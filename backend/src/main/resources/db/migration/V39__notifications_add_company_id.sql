-- Add company_id to notifications for scoping notifications to company context
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id BIGINT;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_company ON notifications(user_id, company_id);
