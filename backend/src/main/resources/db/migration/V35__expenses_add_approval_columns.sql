-- Add approval-related columns to expenses to match JPA entity
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
