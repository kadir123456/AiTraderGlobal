"""
Auto Trading API Endpoints
✅ FIXED VERSION - Proper API key path resolution
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from backend.auth import get_current_user, check_feature_access
from backend.firebase_admin import get_user_api_keys  # ✅ Correct import

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auto-trading", tags=["auto-trading"])


class AutoTradingSettings(BaseModel):
    # Spot trading settings
    spot_enabled: bool = False
    spot_watchlist: List[str] = []
    spot_default_amount: float = 10.0
    spot_default_tp: float = 5.0
    spot_default_sl: float = 2.0
    
    # Futures trading settings
    futures_enabled: bool = False
    futures_watchlist: List[str] = []
    futures_default_amount: float = 10.0
    futures_default_leverage: int = 10
    futures_default_tp: float = 5.0
    futures_default_sl: float = 2.0
    
    # Common settings
    interval: str = '15m'
    exchange: str = 'binance'


class AutoTradingStatus(BaseModel):
    spot_enabled: bool
    futures_enabled: bool
    active_monitors: int
    last_check: Optional[str]
    signals_today: int


@router.post("/settings")
async def update_auto_trading_settings(
    settings: AutoTradingSettings,
    current_user = Depends(get_current_user)
):
    """Update user's auto-trading settings (spot and futures separately)"""
    try:
        from firebase_admin import db
        import os
        
        user_id = current_user.get('user_id') or current_user.get('id')
        firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")

        logger.info(f"📝 Updating auto-trading settings for user {user_id}")
        logger.info(f"   Spot enabled: {settings.spot_enabled}")
        logger.info(f"   Futures enabled: {settings.futures_enabled}")
        logger.info(f"   Exchange: {settings.exchange}")

        # ✅ Check feature access for spot trading
        if settings.spot_enabled:
            logger.info(f"🔐 Checking spot trading access for user {user_id}")
            can_access_spot = await check_feature_access(user_id, 'auto_trading_spot')
            if not can_access_spot:
                logger.warning(f"❌ User {user_id} cannot access spot auto-trading")
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Spot auto-trading requires an active PRO or ENTERPRISE plan. "
                        "Please upgrade to access this feature."
                    )
                )
        
        # ✅ Check feature access for futures trading
        if settings.futures_enabled:
            logger.info(f"🔐 Checking futures trading access for user {user_id}")
            can_access_futures = await check_feature_access(user_id, 'auto_trading_futures')
            if not can_access_futures:
                logger.warning(f"❌ User {user_id} cannot access futures auto-trading")
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Futures auto-trading requires an active PRO or ENTERPRISE plan. "
                        "Please upgrade to access this feature."
                    )
                )
        
        # ✅ Validate exchange API keys exist
        if settings.spot_enabled or settings.futures_enabled:
            logger.info(f"🔑 Checking API keys for exchange: {settings.exchange}")
            
            # ✅ Use the same function as balance.py and integrations.py
            # This reads from: users/{user_id}/api_keys/{exchange}
            api_keys = get_user_api_keys(user_id, settings.exchange)
            
            logger.info(f"📦 API keys found: {api_keys is not None}")
            
            if not api_keys:
                logger.error(f"❌ No API keys found for {settings.exchange}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Please add {settings.exchange.upper()} API keys before enabling auto-trading. Go to Settings > Exchange Integration to add your keys."
                )
            
            # Check if keys are not empty
            if not api_keys.get('api_key') or not api_keys.get('api_secret'):
                logger.error(f"❌ Incomplete API keys for {settings.exchange}")
                raise HTTPException(
                    status_code=400,
                    detail=f"{settings.exchange.upper()} API keys are incomplete. Please update your keys in Settings."
                )
            
            logger.info(f"✅ API keys validated for {settings.exchange}")
            logger.info(f"   API Key (first 10 chars): {api_keys.get('api_key', '')[:10]}...")
        
        # ✅ Save settings to Firebase
        settings_ref = db.reference(f'trading_settings/{user_id}', url=firebase_db_url)
        settings_data = {
            # Spot settings
            'spot_enabled': settings.spot_enabled,
            'spot_watchlist': settings.spot_watchlist,
            'spot_default_amount': settings.spot_default_amount,
            'spot_default_tp': settings.spot_default_tp,
            'spot_default_sl': settings.spot_default_sl,
            
            # Futures settings
            'futures_enabled': settings.futures_enabled,
            'futures_watchlist': settings.futures_watchlist,
            'futures_default_amount': settings.futures_default_amount,
            'futures_default_leverage': settings.futures_default_leverage,
            'futures_default_tp': settings.futures_default_tp,
            'futures_default_sl': settings.futures_default_sl,
            
            # Common settings
            'interval': settings.interval,
            'exchange': settings.exchange,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        settings_ref.set(settings_data)
        
        logger.info(f"✅ Auto-trading settings saved for user {user_id}")
        logger.info(f"   Spot: {settings.spot_enabled}, Futures: {settings.futures_enabled}")
        
        # TODO: Start/stop monitoring based on enabled flags
        # This will be implemented with EMA monitor integration
        
        return {
            "success": True,
            "message": "Auto-trading settings updated successfully",
            "spot_enabled": settings.spot_enabled,
            "futures_enabled": settings.futures_enabled,
            "active_symbols": {
                "spot": len(settings.spot_watchlist) if settings.spot_enabled else 0,
                "futures": len(settings.futures_watchlist) if settings.futures_enabled else 0
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating auto-trading settings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/settings")
async def get_auto_trading_settings(
    current_user = Depends(get_current_user)
):
    """Get user's auto-trading settings"""
    try:
        from firebase_admin import db
        import os
        
        user_id = current_user.get('user_id') or current_user.get('id')
        firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
        
        logger.info(f"📖 Fetching auto-trading settings for user {user_id}")
        
        # Get settings from Firebase
        settings_ref = db.reference(f'trading_settings/{user_id}', url=firebase_db_url)
        settings = settings_ref.get()
        
        # If no settings exist, return defaults
        if not settings:
            logger.info(f"⚠️ No settings found, returning defaults")
            return {
                # Spot defaults
                "spot_enabled": False,
                "spot_watchlist": [],
                "spot_default_amount": 10.0,
                "spot_default_tp": 5.0,
                "spot_default_sl": 2.0,
                
                # Futures defaults
                "futures_enabled": False,
                "futures_watchlist": [],
                "futures_default_amount": 10.0,
                "futures_default_leverage": 10,
                "futures_default_tp": 5.0,
                "futures_default_sl": 2.0,
                
                # Common defaults
                "interval": "15m",
                "exchange": "binance"
            }
        
        logger.info(f"✅ Settings retrieved: {settings}")
        return settings
        
    except Exception as e:
        logger.error(f"❌ Error getting auto-trading settings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/status")
async def get_auto_trading_status(
    current_user = Depends(get_current_user)
) -> AutoTradingStatus:
    """Get auto-trading status"""
    try:
        from firebase_admin import db
        import os
        
        user_id = current_user.get('user_id') or current_user.get('id')
        firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
        
        # Get settings
        settings_ref = db.reference(f'trading_settings/{user_id}', url=firebase_db_url)
        settings = settings_ref.get()
        
        spot_enabled = settings.get('spot_enabled', False) if settings else False
        futures_enabled = settings.get('futures_enabled', False) if settings else False
        
        # Count active monitors
        active_monitors = 0
        if settings:
            if spot_enabled:
                active_monitors += len(settings.get('spot_watchlist', []))
            if futures_enabled:
                active_monitors += len(settings.get('futures_watchlist', []))
        
        # Get today's signals count
        signals_today = 0
        try:
            signals_ref = db.reference(f'ema_signals/{user_id}', url=firebase_db_url)
            all_signals = signals_ref.get()
            
            if all_signals:
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                signals_today = sum(
                    1 for signal in all_signals.values()
                    if datetime.fromisoformat(signal.get('created_at', '')) >= today_start
                )
        except Exception as e:
            logger.warning(f"Could not count today's signals: {e}")
        
        return AutoTradingStatus(
            spot_enabled=spot_enabled,
            futures_enabled=futures_enabled,
            active_monitors=active_monitors,
            last_check=datetime.utcnow().isoformat(),
            signals_today=signals_today
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting auto-trading status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/signals/history")
async def get_signals_history(
    current_user = Depends(get_current_user),
    limit: int = 50
):
    """Get signal history"""
    try:
        from firebase_admin import db
        import os
        
        user_id = current_user.get('user_id') or current_user.get('id')
        firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
        
        # Get signals from Firebase
        signals_ref = db.reference(f'ema_signals/{user_id}', url=firebase_db_url)
        all_signals = signals_ref.get()
        
        if not all_signals:
            return {"signals": [], "count": 0}
        
        # Convert to list and sort by timestamp
        signals_list = []
        for signal_id, signal_data in all_signals.items():
            signals_list.append({
                "id": signal_id,
                **signal_data
            })
        
        # Sort by timestamp descending
        signals_list.sort(
            key=lambda x: x.get('created_at', ''),
            reverse=True
        )
        
        # Limit results
        signals_list = signals_list[:limit]
        
        return {
            "signals": signals_list,
            "count": len(signals_list)
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting signals history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/stop")
async def stop_auto_trading(
    current_user = Depends(get_current_user)
):
    """Emergency stop - immediately stop all auto-trading"""
    try:
        from firebase_admin import db
        import os
        
        user_id = current_user.get('user_id') or current_user.get('id')
        firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
        
        # Update settings to disable both spot and futures
        settings_ref = db.reference(f'trading_settings/{user_id}', url=firebase_db_url)
        settings = settings_ref.get() or {}
        
        settings['spot_enabled'] = False
        settings['futures_enabled'] = False
        settings['updated_at'] = datetime.utcnow().isoformat()
        
        settings_ref.set(settings)
        
        logger.info(f"🚨 Emergency stop executed for user {user_id}")
        
        return {
            "success": True,
            "message": "Auto-trading stopped successfully (both spot and futures)"
        }
        
    except Exception as e:
        logger.error(f"❌ Error stopping auto-trading: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )