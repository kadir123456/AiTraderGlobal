"""
Auto Trading API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, TYPE_CHECKING, Any
from datetime import datetime
import logging

from backend.auth import get_current_user

if TYPE_CHECKING:
    from backend.services.ema_monitor import EMAMonitor

try:
    from backend.services.ema_monitor import EMAMonitor
    EMA_MONITOR_AVAILABLE = True
except ImportError:
    EMA_MONITOR_AVAILABLE = False
    print("⚠️ Warning: EMA Monitor not available")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auto-trading", tags=["auto-trading"])

# Global monitor instance
ema_monitor: Optional[Any] = None

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
        from backend.firebase_admin import save_auto_trading_settings, get_user_api_keys, get_user_subscription

        user_id = current_user.get('user_id') or current_user.get('id')

        # Check subscription plan - Auto-trading requires Pro or Enterprise
        if settings.enabled:
            subscription = get_user_subscription(user_id)
            user_tier = subscription.get('tier', 'free') if subscription else 'free'

            if user_tier == 'free':
                raise HTTPException(
                    status_code=403,
                    detail="Auto-trading is a PRO feature. Please upgrade your plan to use this feature."
                )

        # Validate exchange API keys exist
        if settings.enabled:
            api_keys = get_user_api_keys(user_id, settings.exchange)
            if not api_keys:
                raise HTTPException(
                    status_code=400,
                    detail=f"Please add {settings.exchange} API keys before enabling auto-trading"
                )
        
        # Save settings to Firebase
        saved = save_auto_trading_settings(user_id, settings.dict())
        if not saved:
            raise HTTPException(
                status_code=500,
                detail="Failed to save auto-trading settings"
            )
        
        # Start or stop monitoring based on enabled flag
        if settings.enabled and EMA_MONITOR_AVAILABLE:
            if ema_monitor:
                await ema_monitor.start_monitoring_user(user_id, settings.dict())
                logger.info(f"Started auto-trading for user {user_id}")
        else:
            if ema_monitor:
                await ema_monitor.stop_monitoring_user(user_id)
                logger.info(f"Stopped auto-trading for user {user_id}")
        
        return {
            "success": True,
            "message": "Auto-trading settings updated successfully",
            "enabled": settings.enabled
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating auto-trading settings: {e}")
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
        if not settings:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve auto-trading settings"
            )
        
        return settings
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting auto-trading settings: {e}")
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
        user_id = current_user.get('user_id') or current_user.get('id')
        
        # Get status from monitor
        # Implementation needed
        
        return AutoTradingStatus(
            enabled=True,
            active_monitors=1,
            last_check=datetime.utcnow().isoformat(),
            signals_today=3
        )
        
    except Exception as e:
        logger.error(f"Error getting auto-trading status: {e}")
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
            "signals": signals,
            "count": len(signals)
        }
        
    except Exception as e:
        logger.error(f"Error getting signals history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

def init_ema_monitor(db_connection):
    """Initialize EMA monitor"""
    global ema_monitor
    ema_monitor = EMAMonitor(db_connection)
    return ema_monitor
