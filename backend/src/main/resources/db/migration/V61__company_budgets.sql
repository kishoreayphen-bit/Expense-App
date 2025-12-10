-- V61: Overall Company Budgets
-- Add overall/total budget management for companies

CREATE TABLE IF NOT EXISTS company_budgets (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    alert_threshold_percent INT DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_company_budgets_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_company_budgets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_company_budget_period UNIQUE(company_id, period_start, period_end, is_active),
    CONSTRAINT chk_period_type CHECK (period_type IN ('MONTHLY', 'YEARLY', 'QUARTERLY', 'CUSTOM')),
    CONSTRAINT chk_total_amount CHECK (total_amount > 0),
    CONSTRAINT chk_spent_amount CHECK (spent_amount >= 0),
    CONSTRAINT chk_alert_threshold CHECK (alert_threshold_percent > 0 AND alert_threshold_percent <= 100)
);

-- Indexes for performance
CREATE INDEX idx_company_budgets_company ON company_budgets(company_id);
CREATE INDEX idx_company_budgets_period ON company_budgets(period_start, period_end);
CREATE INDEX idx_company_budgets_active ON company_budgets(is_active);
CREATE INDEX idx_company_budgets_company_period ON company_budgets(company_id, period_start, period_end);

-- Track budget alerts sent
CREATE TABLE IF NOT EXISTS company_budget_alerts (
    id BIGSERIAL PRIMARY KEY,
    company_budget_id BIGINT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold_percent INT NOT NULL,
    spent_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_budget_alerts_budget FOREIGN KEY (company_budget_id) REFERENCES company_budgets(id) ON DELETE CASCADE,
    CONSTRAINT chk_alert_type CHECK (alert_type IN ('WARNING', 'CRITICAL', 'EXCEEDED'))
);

CREATE INDEX idx_budget_alerts_budget ON company_budget_alerts(company_budget_id);
CREATE INDEX idx_budget_alerts_sent_at ON company_budget_alerts(sent_at);

-- Comments
COMMENT ON TABLE company_budgets IS 'Overall/total budgets for companies (not category-specific)';
COMMENT ON COLUMN company_budgets.period_type IS 'MONTHLY, YEARLY, QUARTERLY, or CUSTOM';
COMMENT ON COLUMN company_budgets.total_amount IS 'Total budget ceiling for the period';
COMMENT ON COLUMN company_budgets.spent_amount IS 'Auto-calculated from expenses in period';
COMMENT ON COLUMN company_budgets.alert_threshold_percent IS 'Send alert when spending reaches this % (default 80%)';
COMMENT ON COLUMN company_budgets.is_active IS 'Only one active budget per company per period';

COMMENT ON TABLE company_budget_alerts IS 'Track when budget alerts were sent to avoid duplicates';
COMMENT ON COLUMN company_budget_alerts.alert_type IS 'WARNING (80%), CRITICAL (90%), EXCEEDED (100%)';
