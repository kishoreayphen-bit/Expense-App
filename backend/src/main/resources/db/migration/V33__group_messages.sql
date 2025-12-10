-- Group messages table for chat and splits
CREATE TABLE IF NOT EXISTS group_messages (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text' or 'split'
    text TEXT,
    
    -- Split-specific fields
    split_title VARCHAR(255),
    split_total_amount DECIMAL(15, 2),
    split_currency VARCHAR(10),
    split_involved_ids TEXT, -- Comma-separated user IDs
    split_shares_json TEXT, -- JSON array of {userId, amount}
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_sender_user_id ON group_messages(sender_user_id);
CREATE INDEX idx_group_messages_type ON group_messages(type);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_group_messages_group_created ON group_messages(group_id, created_at DESC);
