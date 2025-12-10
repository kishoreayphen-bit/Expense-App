-- Add company_id to expenses table for multi-tenant company isolation
ALTER TABLE expenses ADD COLUMN company_id BIGINT;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_company FOREIGN KEY (company_id) REFERENCES companies(id);
CREATE INDEX idx_expenses_company_id ON expenses(company_id);

-- Add company_id to budgets table for multi-tenant company isolation
ALTER TABLE budgets ADD COLUMN company_id BIGINT;
ALTER TABLE budgets ADD CONSTRAINT fk_budgets_company FOREIGN KEY (company_id) REFERENCES companies(id);
CREATE INDEX idx_budgets_company_id ON budgets(company_id);

-- Add company_id to groups table (for splits) for multi-tenant company isolation
ALTER TABLE groups ADD COLUMN company_id BIGINT;
ALTER TABLE groups ADD CONSTRAINT fk_groups_company FOREIGN KEY (company_id) REFERENCES companies(id);
CREATE INDEX idx_groups_company_id ON groups(company_id);

-- Add company_id to settlements table for multi-tenant company isolation
ALTER TABLE settlements ADD COLUMN company_id BIGINT;
ALTER TABLE settlements ADD CONSTRAINT fk_settlements_company FOREIGN KEY (company_id) REFERENCES companies(id);
CREATE INDEX idx_settlements_company_id ON settlements(company_id);
