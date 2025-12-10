-- V60: Expense Visibility & RBAC
-- Add role-based visibility controls for expenses

-- Add visibility tracking for expenses
CREATE TABLE IF NOT EXISTS expense_viewers (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    can_view BOOLEAN DEFAULT true,
    can_approve BOOLEAN DEFAULT false,
    granted_by BIGINT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expense_viewers_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    CONSTRAINT fk_expense_viewers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_expense_viewers_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_expense_viewer UNIQUE(expense_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_expense_viewers_expense ON expense_viewers(expense_id);
CREATE INDEX idx_expense_viewers_user ON expense_viewers(user_id);
CREATE INDEX idx_expense_viewers_can_view ON expense_viewers(can_view);
CREATE INDEX idx_expense_viewers_can_approve ON expense_viewers(can_approve);

-- Add comments
COMMENT ON TABLE expense_viewers IS 'Tracks who can view and approve specific expenses based on role hierarchy';
COMMENT ON COLUMN expense_viewers.can_view IS 'Whether user can view this expense';
COMMENT ON COLUMN expense_viewers.can_approve IS 'Whether user can approve reimbursement for this expense';
