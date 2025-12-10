-- Dashboard preferences per user
CREATE TABLE IF NOT EXISTS dashboard_prefs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL DEFAULT 'LAST_30_DAYS', -- e.g., LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, CUSTOM
    collapsed_widgets TEXT, -- comma-separated widget keys or JSON (kept simple here)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_user ON dashboard_prefs(user_id);
