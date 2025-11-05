"""
Firebase Admin SDK Integration
Manages user data and API keys in Firebase Realtime Database
"""
import os
import json
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
        logger.warning("Firebase not initialized")
        return False
    
    try:
        user_ref = db.reference(f'users/{user_id}/api_keys/{exchange}')
        user_ref.set({
            "api_key": api_key,
            "api_secret": api_secret,
            "passphrase": passphrase,
            "is_futures": is_futures,
            "status": "active",
            "added_at": db.ServerValue.TIMESTAMP
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
