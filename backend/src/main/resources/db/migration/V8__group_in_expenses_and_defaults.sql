-- Add group_id to expenses and create group_defaults table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);

CREATE TABLE IF NOT EXISTS group_defaults (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
    default_type VARCHAR(20), -- EQUAL | RATIO | PERCENTAGE
    ratios_json JSONB,        -- [{userId, ratio}]
    percentages_json JSONB,   -- [{userId, percentage}]
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_defaults_group ON group_defaults(group_id);
