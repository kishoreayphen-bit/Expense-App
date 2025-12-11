-- Create companies table for multi-tenant support
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) NOT NULL UNIQUE,
    industry VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(32),
    email VARCHAR(320),
    website VARCHAR(255),
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_company_code UNIQUE (company_code),
    CONSTRAINT uk_company_name UNIQUE (company_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON companies(created_by);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- Add comment for documentation
COMMENT ON TABLE companies IS 'Companies/Organizations for multi-tenant expense management';
COMMENT ON COLUMN companies.company_code IS 'Unique short code for the company (e.g., ACME, TECH)';
COMMENT ON COLUMN companies.settings IS 'JSON configuration for company-specific settings';
