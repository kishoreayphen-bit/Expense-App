-- Add missing updated_at column to approvals for Hibernate validation
ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
