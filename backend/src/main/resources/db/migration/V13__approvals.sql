-- Update approvals table with new columns
ALTER TABLE approvals 
    ADD COLUMN IF NOT EXISTS requester_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS policy_json JSONB,
    ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update approver_id to be nullable
ALTER TABLE approvals ALTER COLUMN approver_id DROP NOT NULL;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_approvals_requester ON approvals(requester_id);

-- Create approval_audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS approval_audit (
    id BIGSERIAL PRIMARY KEY,
    approval_id BIGINT NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- SUBMITTED | APPROVED | REJECTED | ESCALATED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_audit_approval ON approval_audit(approval_id);

-- Optional: basic status fields on expenses for quick filters
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
