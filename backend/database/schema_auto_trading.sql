-- Auto Trading Schema
-- Tables for automated trading system

-- Auto-trading settings per user
CREATE TABLE IF NOT EXISTS auto_trading_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE,
    watchlist TEXT[], -- Array of symbols
    interval VARCHAR(10) DEFAULT '15m',
    default_amount DECIMAL(18, 8) DEFAULT 10,
    default_leverage INTEGER DEFAULT 10,
    default_tp DECIMAL(5, 2) DEFAULT 5.0,
    default_sl DECIMAL(5, 2) DEFAULT 2.0,
    exchange VARCHAR(50) DEFAULT 'binance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- EMA values cache for tracking crossovers
CREATE TABLE IF NOT EXISTS ema_values (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    period INTEGER NOT NULL,
    value DECIMAL(18, 8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol, interval, period)
);

-- Signal history
CREATE TABLE IF NOT EXISTS trading_signals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    signal VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
    ema9 DECIMAL(18, 8) NOT NULL,
    ema21 DECIMAL(18, 8) NOT NULL,
    auto_traded BOOLEAN DEFAULT FALSE,
    position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced positions table
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'LONG' or 'SHORT'
    entry_price DECIMAL(18, 8) NOT NULL,
    current_price DECIMAL(18, 8),
    amount DECIMAL(18, 8) NOT NULL,
    leverage INTEGER NOT NULL,
    tp_price DECIMAL(18, 8),
    sl_price DECIMAL(18, 8),
    close_price DECIMAL(18, 8),
    pnl DECIMAL(18, 8),
    pnl_percent DECIMAL(10, 4),
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'cancelled'
    close_reason VARCHAR(20), -- 'TP', 'SL', 'MANUAL'
    order_id VARCHAR(100),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    auto_opened BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON positions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_user_created ON trading_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ema_values_lookup ON ema_values(user_id, symbol, interval, period);

-- Transaction history
CREATE TABLE IF NOT EXISTS transaction_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    position_id INTEGER REFERENCES positions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'OPEN', 'CLOSE', 'TP', 'SL'
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    pnl DECIMAL(18, 8),
    fee DECIMAL(18, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transaction_history_user ON transaction_history(user_id, created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auto_trading_settings_updated_at 
    BEFORE UPDATE ON auto_trading_settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
