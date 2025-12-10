-- Ensure approvals table has expected columns for Hibernate validation
ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS policy_json JSONB;
