-- Reminders for outstanding dues
CREATE TABLE IF NOT EXISTS settlement_reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counterparty_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    min_amount NUMERIC(14,2),
    due_date DATE,
    channel VARCHAR(20) DEFAULT 'IN_APP', -- IN_APP | EMAIL | SMS (stub)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON settlement_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_counterparty ON settlement_reminders(counterparty_id);
