# Exchange Balance Endpoint - Firebase Version with Unified Service
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import logging

from backend.firebase_admin import get_user_api_keys
from backend.services.unified_exchange import unified_exchange, ExchangeError, AuthenticationError

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency stub - will be overridden by main.py
async def get_current_user_dependency(authorization: str = None):
    """Stub for dependency injection"""
    pass

@router.get("/api/bot/balance/{exchange}")
async def get_exchange_balance(
    exchange: str,
    is_futures: bool = True,
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Get balance from specific exchange (spot or futures)
    Uses unified exchange service with retry logic and error handling
    """
    try:
        # Fetch user's API keys from Firebase
        user_id = current_user.get("user_id") or current_user.get("id")
        exchange = exchange.lower()

        logger.info(f"Balance request for {exchange} from user {user_id}")

        api_keys = get_user_api_keys(user_id, exchange)
        if not api_keys:
            raise HTTPException(
                status_code=404,
                detail=f"API keys not configured for {exchange}. Please add via Settings."
            )

        api_key = api_keys.get("api_key")
        api_secret = api_keys.get("api_secret")
        passphrase = api_keys.get("passphrase", "")

        if not api_key or not api_secret:
            raise HTTPException(
                status_code=400,
                detail=f"Incomplete API credentials for {exchange}"
            )

        # Use unified exchange service
        balance = await unified_exchange.get_balance(
            exchange=exchange,
            api_key=api_key,
            api_secret=api_secret,
            is_futures=is_futures,
            passphrase=passphrase
        )

        # Transform to frontend format
        return {
            "exchange": balance.get("exchange"),
            "type": balance.get("type"),
            "currency": balance.get("currency", "USDT"),
            "total_balance": balance.get("total", 0),
            "available_balance": balance.get("available", 0),
            "used_balance": balance.get("locked", 0),
            "timestamp": balance.get("timestamp")
        }

    except HTTPException:
        raise
    except AuthenticationError as e:
        logger.error(f"Authentication failed for {exchange}: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Invalid API credentials for {exchange}. Please check your keys in Settings."
        )
    except ExchangeError as e:
        logger.error(f"Exchange error for {exchange}: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Exchange temporarily unavailable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching balance: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch balance: {str(e)}"
        )
