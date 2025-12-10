-- Track per-user read progress per group
CREATE TABLE IF NOT EXISTS group_reads (
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id BIGINT NOT NULL DEFAULT 0,
    last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_reads_group ON group_reads(group_id);
CREATE INDEX IF NOT EXISTS idx_group_reads_user ON group_reads(user_id);
