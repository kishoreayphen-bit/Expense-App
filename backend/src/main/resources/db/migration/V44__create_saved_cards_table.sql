-- Create saved_cards table for storing Stripe payment methods
CREATE TABLE IF NOT EXISTS saved_cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_card_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_saved_cards_user_id ON saved_cards(user_id);
CREATE INDEX idx_saved_cards_stripe_pm_id ON saved_cards(stripe_payment_method_id);
CREATE INDEX idx_saved_cards_is_default ON saved_cards(user_id, is_default);

-- Ensure only one default card per user
CREATE UNIQUE INDEX idx_saved_cards_one_default_per_user ON saved_cards(user_id) WHERE is_default = TRUE;
