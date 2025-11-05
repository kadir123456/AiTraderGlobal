"""
Database Module
PostgreSQL database connection and queries
"""
import os
from typing import Optional, List, Dict
import asyncpg
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

# Database connection pool
db_pool: Optional[asyncpg.Pool] = None

# Encryption key for API keys
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "32-char-encryption-key-change").encode()
cipher_suite = Fernet(ENCRYPTION_KEY)

async def init_db():
    """Initialize database connection pool"""
    global db_pool
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL not set, database features disabled")
        return
    
    try:
        db_pool = await asyncpg.create_pool(
            database_url,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        logger.info("✅ Database connection pool initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {str(e)}")

async def close_db():
    """Close database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Database connection pool closed")

def encrypt_value(value: str) -> str:
    """Encrypt sensitive data"""
    return cipher_suite.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt sensitive data"""
    return cipher_suite.decrypt(encrypted_value.encode()).decode()

# User queries
async def get_user_by_firebase_uid(firebase_uid: str) -> Optional[Dict]:
    """Get user by Firebase UID"""
    if not db_pool:
        return None
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE firebase_uid = $1",
            firebase_uid
        )
        return dict(row) if row else None

async def create_user(firebase_uid: str, email: str, full_name: str = None, plan: str = 'free') -> Dict:
    """Create new user"""
    if not db_pool:
        raise Exception("Database not available")
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (firebase_uid, email, full_name, plan)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (firebase_uid) DO UPDATE SET
                email = EXCLUDED.email,
                updated_at = NOW()
            RETURNING *
            """,
            firebase_uid, email, full_name, plan
        )
        return dict(row)

async def update_user_plan(user_id: str, plan: str) -> bool:
    """Update user's subscription plan"""
    if not db_pool:
        return False
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2",
            plan, user_id
        )
        return True

# API Keys queries
async def get_user_api_keys(user_id: str, exchange: str = None) -> List[Dict]:
    """Get user's API keys for exchange(s)"""
    if not db_pool:
        return []
    
    async with db_pool.acquire() as conn:
        if exchange:
            rows = await conn.fetch(
                "SELECT * FROM user_api_keys WHERE user_id = $1 AND exchange = $2",
                user_id, exchange
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM user_api_keys WHERE user_id = $1",
                user_id
            )
        
        keys = []
        for row in rows:
            key_dict = dict(row)
            # Decrypt keys for use
            key_dict['api_key'] = decrypt_value(key_dict['api_key_encrypted'])
            key_dict['api_secret'] = decrypt_value(key_dict['api_secret_encrypted'])
            if key_dict.get('passphrase_encrypted'):
                key_dict['passphrase'] = decrypt_value(key_dict['passphrase_encrypted'])
            keys.append(key_dict)
        
        return keys

async def save_user_api_key(
    user_id: str,
    exchange: str,
    api_key: str,
    api_secret: str,
    passphrase: str = None,
    is_futures: bool = True
) -> Dict:
    """Save user's API key (encrypted)"""
    if not db_pool:
        raise Exception("Database not available")
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO user_api_keys (user_id, exchange, api_key_encrypted, api_secret_encrypted, passphrase_encrypted, is_futures)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, exchange) DO UPDATE SET
                api_key_encrypted = EXCLUDED.api_key_encrypted,
                api_secret_encrypted = EXCLUDED.api_secret_encrypted,
                passphrase_encrypted = EXCLUDED.passphrase_encrypted,
                is_futures = EXCLUDED.is_futures,
                status = 'active',
                last_validated = NOW()
            RETURNING *
            """,
            user_id,
            exchange,
            encrypt_value(api_key),
            encrypt_value(api_secret),
            encrypt_value(passphrase) if passphrase else None,
            is_futures
        )
        return dict(row)

async def delete_user_api_key(user_id: str, exchange: str) -> bool:
    """Delete user's API key"""
    if not db_pool:
        return False
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM user_api_keys WHERE user_id = $1 AND exchange = $2",
            user_id, exchange
        )
        return True

# Position queries
async def get_open_positions(user_id: str) -> List[Dict]:
    """Get user's open positions"""
    if not db_pool:
        return []
    
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM positions 
            WHERE user_id = $1 AND status = 'open'
            ORDER BY opened_at DESC
            """,
            user_id
        )
        return [dict(row) for row in rows]

async def create_position(
    user_id: str,
    exchange: str,
    symbol: str,
    side: str,
    amount: float,
    leverage: int,
    is_futures: bool,
    entry_price: float,
    tp_price: float = None,
    sl_price: float = None,
    tp_percentage: float = None,
    sl_percentage: float = None,
    exchange_order_id: str = None
) -> Dict:
    """Create new position"""
    if not db_pool:
        raise Exception("Database not available")
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO positions (
                user_id, exchange, symbol, side, amount, leverage, is_futures,
                entry_price, current_price, tp_price, sl_price, tp_percentage, sl_percentage,
                exchange_order_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
            """,
            user_id, exchange, symbol, side, amount, leverage, is_futures,
            entry_price, entry_price, tp_price, sl_price, tp_percentage, sl_percentage,
            exchange_order_id
        )
        return dict(row)

async def update_position_price(position_id: str, current_price: float, pnl: float, pnl_percentage: float) -> bool:
    """Update position's current price and PnL"""
    if not db_pool:
        return False
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE positions 
            SET current_price = $1, pnl = $2, pnl_percentage = $3, updated_at = NOW()
            WHERE id = $4
            """,
            current_price, pnl, pnl_percentage, position_id
        )
        return True

async def close_position(position_id: str, closing_price: float, pnl: float, pnl_percentage: float) -> bool:
    """Close a position"""
    if not db_pool:
        return False
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE positions 
            SET status = 'closed', current_price = $1, pnl = $2, pnl_percentage = $3, 
                closed_at = NOW(), updated_at = NOW()
            WHERE id = $4
            """,
            closing_price, pnl, pnl_percentage, position_id
        )
        return True

# Auto-trading settings
async def get_auto_trading_settings(user_id: str) -> Optional[Dict]:
    """Get user's auto-trading settings"""
    if not db_pool:
        return None
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM auto_trading_settings WHERE user_id = $1",
            user_id
        )
        return dict(row) if row else None

async def save_auto_trading_settings(user_id: str, settings: Dict) -> Dict:
    """Save user's auto-trading settings"""
    if not db_pool:
        raise Exception("Database not available")
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO auto_trading_settings (
                user_id, enabled, exchange, watchlist, interval,
                default_amount, default_leverage, default_tp, default_sl, max_daily_trades
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id) DO UPDATE SET
                enabled = EXCLUDED.enabled,
                exchange = EXCLUDED.exchange,
                watchlist = EXCLUDED.watchlist,
                interval = EXCLUDED.interval,
                default_amount = EXCLUDED.default_amount,
                default_leverage = EXCLUDED.default_leverage,
                default_tp = EXCLUDED.default_tp,
                default_sl = EXCLUDED.default_sl,
                max_daily_trades = EXCLUDED.max_daily_trades,
                updated_at = NOW()
            RETURNING *
            """,
            user_id,
            settings.get('enabled', False),
            settings.get('exchange', 'binance'),
            settings.get('watchlist', []),
            settings.get('interval', '15m'),
            settings.get('default_amount', 100),
            settings.get('default_leverage', 10),
            settings.get('default_tp', 2.0),
            settings.get('default_sl', 1.0),
            settings.get('max_daily_trades', 10)
        )
        return dict(row)

# Activity logging
async def log_activity(user_id: str, action: str, details: Dict = None, ip_address: str = None, user_agent: str = None):
    """Log user activity"""
    if not db_pool:
        return
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id, action, details, ip_address, user_agent
        )
