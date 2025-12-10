-- Access logs for auditing resource access and ACL changes
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT,
    actor_email VARCHAR(255),
    action VARCHAR(50) NOT NULL,              -- e.g., EXPENSE_GET, RECEIPT_DOWNLOAD, ACL_SHARE
    resource_type VARCHAR(20) NOT NULL,       -- EXPENSE | RECEIPT | ACL
    resource_id BIGINT,
    outcome VARCHAR(20) NOT NULL,             -- ALLOWED | DENIED | SUCCESS | FAILED
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_access_logs_actor ON access_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_resource ON access_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
