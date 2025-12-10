-- Add bill_number field to expenses for bill integration
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bill_number VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_expenses_bill_number ON expenses(bill_number);

-- Add reimbursement fields to expenses (is_reimbursable already exists from earlier migration)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_status VARCHAR(20); -- PENDING, APPROVED, REJECTED, PAID
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_requested_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_approved_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_approved_by BIGINT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_paid_at TIMESTAMP;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reimbursement_notes TEXT;

-- Add foreign key for reimbursement approver
ALTER TABLE expenses ADD CONSTRAINT fk_expense_reimbursement_approver 
    FOREIGN KEY (reimbursement_approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create budget_permissions table for granular budget creation access
CREATE TABLE IF NOT EXISTS budget_permissions (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    can_create_budgets BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by BIGINT,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_budget_perm_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_budget_perm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_budget_perm_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_budget_perm_company_user UNIQUE (company_id, user_id)
);

CREATE INDEX idx_budget_perm_company ON budget_permissions(company_id);
CREATE INDEX idx_budget_perm_user ON budget_permissions(user_id);

-- Add team_lead_id to groups table for team lead functionality
ALTER TABLE groups ADD COLUMN IF NOT EXISTS team_lead_id BIGINT;
ALTER TABLE groups ADD CONSTRAINT fk_group_team_lead 
    FOREIGN KEY (team_lead_id) REFERENCES users(id) ON DELETE SET NULL;

-- Update existing groups to have owner as team lead
UPDATE groups SET team_lead_id = owner_id WHERE team_lead_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_reimbursement_status ON expenses(reimbursement_status) WHERE reimbursement_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_company_reimbursement ON expenses(company_id, reimbursement_status) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_team_lead ON groups(team_lead_id) WHERE team_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_groups_company_team_lead ON groups(company_id, team_lead_id) WHERE company_id IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE budget_permissions IS 'Granular permissions for budget creation in companies. Admins and managers have default access.';
COMMENT ON COLUMN expenses.bill_number IS 'Reference to uploaded bill for this expense';
COMMENT ON COLUMN expenses.reimbursement_status IS 'Status of reimbursement claim: PENDING, APPROVED, REJECTED, PAID';
COMMENT ON COLUMN groups.team_lead_id IS 'Team lead who can manage team budgets and settings. Defaults to owner.';
