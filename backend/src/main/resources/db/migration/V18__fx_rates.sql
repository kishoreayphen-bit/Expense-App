-- FX rates table storing rate to base currency for a given date and currency
CREATE TABLE IF NOT EXISTS fx_rates (
    id BIGSERIAL PRIMARY KEY,
    rate_date DATE NOT NULL,
    currency CHAR(3) NOT NULL,
    rate_to_base NUMERIC(18,8) NOT NULL, -- multiply amount in currency by this to get base
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(rate_date, currency)
);
CREATE INDEX IF NOT EXISTS idx_fx_rates_date ON fx_rates(rate_date);
CREATE INDEX IF NOT EXISTS idx_fx_rates_currency ON fx_rates(currency);
