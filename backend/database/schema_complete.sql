-- EMA Navigator AI - Complete Database Schema
-- PostgreSQL Schema for Production

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Firebase auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User API Keys (encrypted)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL CHECK (exchange IN ('binance', 'bybit', 'okx', 'kucoin', 'mexc')),
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NOT NULL,
    passphrase_encrypted TEXT,
    is_futures BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
    last_validated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, exchange)
);

-- Open Positions
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('LONG', 'SHORT', 'BUY', 'SELL')),
    amount DECIMAL(18, 8) NOT NULL,
    leverage INTEGER DEFAULT 1,
    is_futures BOOLEAN DEFAULT true,
    entry_price DECIMAL(18, 8) NOT NULL,
    current_price DECIMAL(18, 8),
    tp_price DECIMAL(18, 8),
    sl_price DECIMAL(18, 8),
    tp_percentage DECIMAL(5, 2),
    sl_percentage DECIMAL(5, 2),
    pnl DECIMAL(18, 8) DEFAULT 0,
    pnl_percentage DECIMAL(8, 4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
    exchange_order_id VARCHAR(255),
    opened_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transaction History
CREATE TABLE IF NOT EXISTS transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    pnl DECIMAL(18, 8),
    fee DECIMAL(18, 8),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('open', 'close', 'tp', 'sl', 'liquidation')),
    exchange_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Auto Trading Settings
CREATE TABLE IF NOT EXISTS auto_trading_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    exchange VARCHAR(50) NOT NULL,
    watchlist TEXT[], -- Array of symbols
    interval VARCHAR(10) DEFAULT '15m',
    default_amount DECIMAL(18, 8) DEFAULT 100,
    default_leverage INTEGER DEFAULT 10,
    default_tp DECIMAL(5, 2) DEFAULT 2.0,
    default_sl DECIMAL(5, 2) DEFAULT 1.0,
    max_daily_trades INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EMA Signals Log
CREATE TABLE IF NOT EXISTS ema_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    ema9 DECIMAL(18, 8),
    ema21 DECIMAL(18, 8),
    signal VARCHAR(10) CHECK (signal IN ('BUY', 'SELL', 'NEUTRAL')),
    price DECIMAL(18, 8),
    executed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_opened_at ON positions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_history_user_id ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_created_at ON transaction_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_ema_signals_user_id ON ema_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_ema_signals_created_at ON ema_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_trading_settings_updated_at BEFORE UPDATE ON auto_trading_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO users (firebase_uid, email, full_name, plan) VALUES
-- ('test-uid-1', 'test@example.com', 'Test User', 'pro');

COMMENT ON TABLE users IS 'User accounts linked to Firebase authentication';
COMMENT ON TABLE user_api_keys IS 'Encrypted exchange API keys for each user';
COMMENT ON TABLE positions IS 'Open and closed trading positions';
COMMENT ON TABLE transaction_history IS 'Complete transaction history for all trades';
COMMENT ON TABLE auto_trading_settings IS 'User-specific auto-trading configurations';
COMMENT ON TABLE ema_signals IS 'EMA crossover signals log';
COMMENT ON TABLE activity_logs IS 'User activity and audit trail';
