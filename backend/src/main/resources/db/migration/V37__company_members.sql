-- Company Members table for team management
CREATE TABLE IF NOT EXISTS company_members (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE', -- OWNER, ADMIN, MANAGER, EMPLOYEE
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INVITED, SUSPENDED
    invited_by BIGINT REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_status ON company_members(status);

-- Migrate existing company creators to OWNER role
INSERT INTO company_members (company_id, user_id, role, status, joined_at, created_at)
SELECT id, created_by, 'OWNER', 'ACTIVE', created_at, created_at
FROM companies
WHERE created_by IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;
