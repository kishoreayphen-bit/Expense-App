-- Add missing SLA due timestamp column expected by entities
ALTER TABLE approvals
    ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
