"""
Auto Trading API Endpoints
✅ FIXED VERSION - Proper EMA Monitor Integration
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from backend.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auto-trading", tags=["auto-trading"])


class AutoTradingSettings(BaseModel):
    enabled: bool
    watchlist: List[str]  # ['BTCUSDT', 'ETHUSDT', ...]
    interval: str  # '15m', '30m', '1h', '4h', '1d'
    default_amount: float
    default_leverage: int
    default_tp: float
    default_sl: float
    exchange: str


class AutoTradingStatus(BaseModel):
    enabled: bool
    active_monitors: int
    last_check: Optional[str]
    signals_today: int


@router.post("/settings")
async def update_auto_trading_settings(
    settings: AutoTradingSettings,
    current_user = Depends(get_current_user)
):
    """Update user's auto-trading settings"""
    try:
        from backend.firebase_admin import (
            save_auto_trading_settings, 
            get_user_api_keys, 
            get_user_subscription
        )
        # ✅ Import ema_monitor properly
        from backend.services.ema_monitor import ema_monitor

        user_id = current_user.get('user_id') or current_user.get('id')

        # ✅ Check subscription plan - Auto-trading requires Pro or Enterprise
        if settings.enabled:
            subscription = get_user_subscription(user_id)
            
            # ✅ FIXED: Use 'plan' instead of 'tier' (matches Firebase structure)
            user_plan = subscription.get('plan', 'free') if subscription else 'free'
            subscription_status = subscription.get('status', 'inactive') if subscription else 'inactive'
            
            # 🔧 DEBUG: Log subscription info
            logger.info(f"🔍 User {user_id} subscription: {subscription}")
            logger.info(f"🔍 Plan: {user_plan}, Status: {subscription_status}")

            # ✅ Check if user has an active paid plan
            is_paid_plan = user_plan.lower() in ['pro', 'enterprise', 'premium', 'business']
            is_active = subscription_status == 'active'
            
            if not (is_paid_plan and is_active):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        f"Auto-trading requires an active PRO or ENTERPRISE plan. "
                        f"Your current plan: {user_plan} ({subscription_status}). "
                        f"Please upgrade to access this feature."
                    )
                )

        # ✅ Validate exchange API keys exist
        if settings.enabled:
            api_keys = get_user_api_keys(user_id, settings.exchange)
            if not api_keys:
                raise HTTPException(
                    status_code=400,
                    detail=f"Please add {settings.exchange} API keys before enabling auto-trading"
                )
        
        # ✅ Save settings to Firebase
        saved = save_auto_trading_settings(user_id, settings.dict())
        if not saved:
            raise HTTPException(
                status_code=500,
                detail="Failed to save auto-trading settings"
            )
        
        # ✅ Start or stop monitoring based on enabled flag
        if settings.enabled:
            # Get API keys
            api_keys = get_user_api_keys(user_id, settings.exchange)
            
            # Start monitoring for each symbol in watchlist
            for symbol in settings.watchlist:
                monitor_config = {
                    'exchange': settings.exchange,
                    'api_key': api_keys.get('api_key'),
                    'api_secret': api_keys.get('api_secret'),
                    'passphrase': api_keys.get('passphrase', ''),
                    'symbol': symbol,
                    'interval': settings.interval,
                    'auto_trade': True,
                    'default_amount': settings.default_amount,
                    'default_leverage': settings.default_leverage,
                    'default_tp': settings.default_tp,
                    'default_sl': settings.default_sl
                }
                
                await ema_monitor.start_monitoring(user_id, monitor_config)
                logger.info(f"✅ Started monitoring {symbol} for user {user_id}")
        else:
            # Stop all monitoring for this user
            await ema_monitor.stop_all_monitoring(user_id)
            logger.info(f"🛑 Stopped all monitoring for user {user_id}")
        
        return {
            "success": True,
            "message": "Auto-trading settings updated successfully",
            "enabled": settings.enabled,
            "active_symbols": len(settings.watchlist) if settings.enabled else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating auto-trading settings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/settings")
async def get_auto_trading_settings(
    current_user = Depends(get_current_user)
):
    """Get user's auto-trading settings"""
    try:
        from backend.firebase_admin import get_auto_trading_settings
        
        user_id = current_user.get('user_id') or current_user.get('id')
        
        # Get settings from Firebase
        settings = get_auto_trading_settings(user_id)
        
        # If no settings exist, return defaults
        if not settings:
            return {
                "enabled": False,
                "watchlist": [],
                "interval": "15m",
                "default_amount": 10.0,
                "default_leverage": 10,
                "default_tp": 5.0,
                "default_sl": 2.0,
                "exchange": "binance"
            }
        
        return settings
        
    except HTTPException:
        raise
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
        from backend.firebase_admin import get_auto_trading_settings, get_user_signals
        from backend.services.ema_monitor import ema_monitor
        
        user_id = current_user.get('user_id') or current_user.get('id')
        
        # Get settings
        settings = get_auto_trading_settings(user_id)
        enabled = settings.get('enabled', False) if settings else False
        
        # Count active monitors
        active_monitors = 0
        if enabled and hasattr(ema_monitor, 'monitoring_tasks'):
            active_monitors = sum(
                1 for key in ema_monitor.monitoring_tasks.keys() 
                if key.startswith(user_id)
            )
        
        # Get today's signals count
        signals_today = 0
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            all_signals = get_user_signals(user_id, limit=100)
            signals_today = sum(
                1 for s in all_signals 
                if datetime.fromisoformat(s.get('timestamp', '')) >= today_start
            )
        except Exception as e:
            logger.warning(f"Could not count today's signals: {e}")
        
        return AutoTradingStatus(
            enabled=enabled,
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
        from backend.firebase_admin import get_user_signals
        
        user_id = current_user.get('user_id') or current_user.get('id')
        
        # Get signals from Firebase
        signals = get_user_signals(user_id, limit)
        
        return {
            "signals": signals or [],
            "count": len(signals) if signals else 0
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
        from backend.firebase_admin import save_auto_trading_settings, get_auto_trading_settings
        from backend.services.ema_monitor import ema_monitor
        
        user_id = current_user.get('user_id') or current_user.get('id')
        
        # Stop all monitoring
        await ema_monitor.stop_all_monitoring(user_id)
        
        # Update settings
        settings = get_auto_trading_settings(user_id) or {}
        settings['enabled'] = False
        save_auto_trading_settings(user_id, settings)
        
        logger.info(f"🚨 Emergency stop executed for user {user_id}")
        
        return {
            "success": True,
            "message": "Auto-trading stopped successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error stopping auto-trading: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
