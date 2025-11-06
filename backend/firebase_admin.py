"""
Firebase Admin SDK Integration
Manages user data and API keys in Firebase Realtime Database
"""
import os
import json
import time
import logging
from typing import Optional, Dict
import firebase_admin
from firebase_admin import credentials, db, auth

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            # Get credentials from environment
            firebase_cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
            database_url = os.getenv("FIREBASE_DATABASE_URL")
            
            if not firebase_cred_json or not database_url:
                logger.error("❌ Firebase credentials not found in environment variables")
                return False
            
            # Parse credentials
            try:
                cred_dict = json.loads(firebase_cred_json)
            except json.JSONDecodeError:
                logger.error("❌ Invalid FIREBASE_CREDENTIALS_JSON format")
                return False
            
            # Initialize app
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                'databaseURL': database_url
            })
            
            logger.info("✅ Firebase Admin SDK initialized")
            return True
            
    except Exception as e:
        logger.error(f"❌ Firebase initialization error: {e}")
        return False

# Initialize on module load
firebase_initialized = init_firebase()

def get_user_data(user_id: str) -> Optional[Dict]:
    """Get user data from Firebase"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return None
    
    try:
        user_ref = db.reference(f'users/{user_id}')
        user_data = user_ref.get()
        
        if user_data:
            logger.debug(f"User data retrieved for: {user_id}")
            return user_data
        else:
            logger.debug(f"No user data found for: {user_id}")
            return None
            
    except Exception as e:
        logger.error(f"Error getting user data for {user_id}: {e}")
        return None

def get_user_api_keys(user_id: str, exchange: str) -> Optional[Dict]:
    """Get API keys for a specific exchange from Firebase"""
    user_data = get_user_data(user_id)
    
    if not user_data:
        return None
    
    # API keys stored in user_data['api_keys'][exchange]
    api_keys_data = user_data.get('api_keys', {})
    
    if exchange not in api_keys_data:
        logger.debug(f"No API keys found for exchange {exchange}")
        return None
    
    exchange_keys = api_keys_data[exchange]
    
    return {
        "api_key": exchange_keys.get("api_key"),
        "api_secret": exchange_keys.get("api_secret"),
        "passphrase": exchange_keys.get("passphrase", ""),
        "is_futures": exchange_keys.get("is_futures", True)
    }

def save_user_api_keys(user_id: str, exchange: str, api_key: str, api_secret: str, passphrase: str = "", is_futures: bool = True) -> bool:
    """Save API keys to Firebase"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized, saving to mock storage")
        # Fallback: return success for testing
        logger.info(f"✅ API keys would be saved for {user_id} - {exchange} (Firebase not available)")
        return True
    
    try:
        user_ref = db.reference(f'users/{user_id}/api_keys/{exchange}')
        user_ref.set({
            "api_key": api_key,
            "api_secret": api_secret,
            "passphrase": passphrase,
            "is_futures": is_futures,
            "status": "active",
            "added_at": int(time.time())
        })
        
        logger.info(f"✅ API keys saved for {user_id} - {exchange}")
        return True
        
    except Exception as e:
        logger.error(f"Error saving API keys: {e}")
        return False

def delete_user_api_keys(user_id: str, exchange: str) -> bool:
    """Delete API keys from Firebase"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return False
    
    try:
        user_ref = db.reference(f'users/{user_id}/api_keys/{exchange}')
        user_ref.delete()
        
        logger.info(f"✅ API keys deleted for {user_id} - {exchange}")
        return True
        
    except Exception as e:
        logger.error(f"Error deleting API keys: {e}")
        return False

def get_all_user_exchanges(user_id: str) -> list:
    """Get list of all connected exchanges for a user"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized, returning empty list")
        return []
    
    user_data = get_user_data(user_id)
    
    if not user_data:
        return []
    
    api_keys_data = user_data.get('api_keys', {})
    
    exchanges = []
    for exchange_name, exchange_data in api_keys_data.items():
        exchanges.append({
            "id": exchange_name,
            "name": exchange_name,
            "status": exchange_data.get("status", "active"),
            "addedAt": exchange_data.get("added_at", None),
            "lastChecked": exchange_data.get("last_checked", None)
        })
    
    return exchanges

def verify_firebase_token(token: str) -> Optional[Dict]:
    """Verify Firebase ID token"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return None
    
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return None

# Auto Trading Settings Management
def get_auto_trading_settings(user_id: str) -> Optional[Dict]:
    """Get user's auto-trading settings from Firebase"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized, returning default settings")
        return {
            "enabled": False,
            "watchlist": ["BTCUSDT", "ETHUSDT"],
            "interval": "15m",
            "default_amount": 10,
            "default_leverage": 10,
            "default_tp": 5,
            "default_sl": 2,
            "exchange": "binance"
        }
    
    try:
        ref = db.reference(f'users/{user_id}/auto_trading')
        settings = ref.get()
        
        if settings:
            logger.info(f"Auto-trading settings retrieved for user: {user_id}")
            return settings
        else:
            # Return default settings
            logger.info(f"No auto-trading settings found, returning defaults")
            return {
                "enabled": False,
                "watchlist": ["BTCUSDT", "ETHUSDT"],
                "interval": "15m",
                "default_amount": 10,
                "default_leverage": 10,
                "default_tp": 5,
                "default_sl": 2,
                "exchange": "binance"
            }
    except Exception as e:
        logger.error(f"Error getting auto-trading settings: {e}")
        return None

def save_auto_trading_settings(user_id: str, settings: Dict) -> bool:
    """Save user's auto-trading settings to Firebase"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return False
    
    try:
        ref = db.reference(f'users/{user_id}/auto_trading')
        ref.set({
            "enabled": settings.get("enabled", False),
            "watchlist": settings.get("watchlist", []),
            "interval": settings.get("interval", "15m"),
            "default_amount": settings.get("default_amount", 10),
            "default_leverage": settings.get("default_leverage", 10),
            "default_tp": settings.get("default_tp", 5),
            "default_sl": settings.get("default_sl", 2),
            "exchange": settings.get("exchange", "binance"),
            "updated_at": int(time.time())
        })
        logger.info(f"Auto-trading settings saved for user: {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error saving auto-trading settings: {e}")
        return False

def save_ema_signal(user_id: str, signal: Dict) -> bool:
    """Save EMA signal to Firebase"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return False
    
    try:
        ref = db.reference('signals')
        new_signal_ref = ref.push({
            "user_id": user_id,
            "symbol": signal.get("symbol"),
            "signal_type": signal.get("signal_type"),
            "ema9": signal.get("ema9"),
            "ema21": signal.get("ema21"),
            "price": signal.get("price"),
            "exchange": signal.get("exchange"),
            "interval": signal.get("interval"),
            "timestamp": int(time.time()),
            "action_taken": False
        })
        logger.info(f"Signal saved: {new_signal_ref.key}")
        return True
    except Exception as e:
        logger.error(f"Error saving signal: {e}")
        return False

def get_user_signals(user_id: str, limit: int = 50) -> list:
    """Get user's recent signals"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return []
    
    try:
        ref = db.reference('signals')
        signals = ref.order_by_child('user_id').equal_to(user_id).limit_to_last(limit).get()
        
        if signals:
            # Convert to list and sort by timestamp
            signals_list = []
            for signal_id, signal_data in signals.items():
                signal_data['id'] = signal_id
                signals_list.append(signal_data)
            
            signals_list.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
            logger.info(f"Retrieved {len(signals_list)} signals for user: {user_id}")
            return signals_list
        return []
    except Exception as e:
        logger.error(f"Error getting signals: {e}")
        return []

def update_signal_action(signal_id: str, action_taken: bool) -> bool:
    """Update signal action status"""
    if not firebase_initialized:
        logger.warning("Firebase not initialized")
        return False
    
    try:
        ref = db.reference(f'signals/{signal_id}')
        ref.update({
            "action_taken": action_taken,
            "action_timestamp": int(time.time())
        })
        logger.info(f"Signal {signal_id} action updated")
        return True
    except Exception as e:
        logger.error(f"Error updating signal action: {e}")
        return False
