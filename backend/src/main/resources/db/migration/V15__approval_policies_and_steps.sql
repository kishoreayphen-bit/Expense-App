-- Approval policies and steps for multi-level workflow
CREATE TABLE IF NOT EXISTS approval_policies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL DEFAULT 'Default',
    rules_json JSONB NOT NULL,  -- e.g., {"thresholds":[{"amount":1000,"approverRole":"MANAGER","slaHours":48},{"amount":5000,"approverRole":"FINANCE","slaHours":24}]}
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_steps (
    id BIGSERIAL PRIMARY KEY,
    approval_id BIGINT NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    approver_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(40), -- MANAGER/FINANCE etc.
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    sla_due_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approval ON approval_steps(approval_id);
