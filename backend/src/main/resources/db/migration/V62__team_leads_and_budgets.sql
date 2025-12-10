-- V62: Team Lead Role & Team Budgets
-- Add team lead assignment and team budget tracking

-- Add team_lead_id to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS team_lead_id BIGINT;
ALTER TABLE groups ADD CONSTRAINT fk_groups_team_lead FOREIGN KEY (team_lead_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add budget fields to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(15,2);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS budget_period_start DATE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS budget_period_end DATE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(3) DEFAULT 'USD';

-- Create index for team lead lookups
CREATE INDEX IF NOT EXISTS idx_groups_team_lead ON groups(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_groups_budget_period ON groups(budget_period_start, budget_period_end);

-- Create team budget tracking table
CREATE TABLE IF NOT EXISTS team_budget_tracking (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    alert_threshold_percent INT DEFAULT 80,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_budget_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_budget_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_team_budget_period UNIQUE(group_id, period_start, period_end, is_active),
    CONSTRAINT chk_team_allocated_amount CHECK (allocated_amount > 0),
    CONSTRAINT chk_team_spent_amount CHECK (spent_amount >= 0),
    CONSTRAINT chk_team_alert_threshold CHECK (alert_threshold_percent > 0 AND alert_threshold_percent <= 100)
);

-- Indexes for team budget tracking
CREATE INDEX idx_team_budget_group ON team_budget_tracking(group_id);
CREATE INDEX idx_team_budget_period ON team_budget_tracking(period_start, period_end);
CREATE INDEX idx_team_budget_active ON team_budget_tracking(is_active);

-- Team budget alerts
CREATE TABLE IF NOT EXISTS team_budget_alerts (
    id BIGSERIAL PRIMARY KEY,
    team_budget_id BIGINT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    threshold_percent INT NOT NULL,
    spent_amount DECIMAL(15,2) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_team_budget_alerts_budget FOREIGN KEY (team_budget_id) REFERENCES team_budget_tracking(id) ON DELETE CASCADE,
    CONSTRAINT chk_team_alert_type CHECK (alert_type IN ('WARNING', 'CRITICAL', 'EXCEEDED'))
);

CREATE INDEX idx_team_budget_alerts_budget ON team_budget_alerts(team_budget_id);
CREATE INDEX idx_team_budget_alerts_sent_at ON team_budget_alerts(sent_at);

-- Comments
COMMENT ON COLUMN groups.team_lead_id IS 'User assigned as team lead - can manage team budget';
COMMENT ON COLUMN groups.budget_amount IS 'Current budget allocated to this team';
COMMENT ON COLUMN groups.budget_period_start IS 'Start date of current budget period';
COMMENT ON COLUMN groups.budget_period_end IS 'End date of current budget period';

COMMENT ON TABLE team_budget_tracking IS 'Track team budget allocations and spending over time';
COMMENT ON COLUMN team_budget_tracking.allocated_amount IS 'Budget amount allocated to team by admin/manager';
COMMENT ON COLUMN team_budget_tracking.spent_amount IS 'Auto-calculated from team expenses';

COMMENT ON TABLE team_budget_alerts IS 'Track when team budget alerts were sent';
