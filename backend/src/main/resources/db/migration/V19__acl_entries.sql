-- ACL entries for sharing resources with users or groups
CREATE TABLE IF NOT EXISTS acl_entries (
    id BIGSERIAL PRIMARY KEY,
    resource_type VARCHAR(20) NOT NULL,          -- EXPENSE | RECEIPT
    resource_id BIGINT NOT NULL,
    principal_type VARCHAR(20) NOT NULL,         -- USER | GROUP
    principal_id BIGINT NOT NULL,
    permission VARCHAR(10) NOT NULL,             -- READ | WRITE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT,
    CONSTRAINT uq_acl UNIQUE(resource_type, resource_id, principal_type, principal_id, permission)
);
CREATE INDEX IF NOT EXISTS idx_acl_resource ON acl_entries(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_acl_principal ON acl_entries(principal_type, principal_id);
