-- Add company_id to categories for company-specific categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);

-- Categories with NULL company_id are global/personal categories
-- Categories with company_id are company-specific categories
