-- Fix companies table schema to match Company entity
-- Drop the old table and recreate with correct schema

DROP TABLE IF EXISTS companies CASCADE;

-- Recreate companies table with correct schema
CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL UNIQUE,
    company_code VARCHAR(50) NOT NULL UNIQUE,
    company_email VARCHAR(120) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200),
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    postal_code VARCHAR(15) NOT NULL,
    country VARCHAR(80) NOT NULL,
    industry_type VARCHAR(50),
    registration_number VARCHAR(100),
    tax_id VARCHAR(50),
    currency VARCHAR(10) NOT NULL,
    time_zone VARCHAR(60) NOT NULL,
    fiscal_year_start VARCHAR(255),
    website VARCHAR(200),
    company_logo_url VARCHAR(300),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
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
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Add comment for documentation
COMMENT ON TABLE companies IS 'Companies/Organizations for multi-tenant expense management';
COMMENT ON COLUMN companies.company_code IS 'Unique short code for the company (e.g., ACME, TECH)';
COMMENT ON COLUMN companies.status IS 'Company status: ACTIVE, INACTIVE, SUSPENDED';
