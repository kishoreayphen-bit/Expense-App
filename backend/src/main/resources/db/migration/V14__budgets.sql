-- Budgets (user/group/category, monthly period) and alert thresholds
CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    amount NUMERIC(14,2) NOT NULL,
    alert80 BOOLEAN NOT NULL DEFAULT TRUE,
    alert100 BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Unique combination across nullable references via expression index
CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_uk ON budgets (
    COALESCE(user_id,0), COALESCE(group_id,0), COALESCE(category_id,0), period
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period);
CREATE INDEX IF NOT EXISTS idx_budgets_group_period ON budgets(group_id, period);
