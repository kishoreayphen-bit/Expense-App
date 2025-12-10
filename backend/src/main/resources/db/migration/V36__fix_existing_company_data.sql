-- Migration to ensure all existing expenses and budgets have proper company_id values
-- This fixes data created before the company_id scoping was properly enforced

-- Note: company_id column already exists from V32__add_company_id_to_resources.sql

-- For expenses: Ensure company_id = NULL for all existing expenses with invalid company_id
-- This treats them as personal expenses
UPDATE expenses 
SET company_id = NULL 
WHERE company_id = 0;

-- For budgets: Ensure company_id = NULL for all existing budgets with invalid company_id
-- This treats them as personal budgets
UPDATE budgets 
SET company_id = NULL 
WHERE company_id = 0;

-- Create additional composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_company_date ON expenses(user_id, company_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_budgets_user_company_period ON budgets(user_id, company_id, period);
