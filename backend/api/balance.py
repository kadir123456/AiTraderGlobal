# Exchange Balance Endpoint - Firebase Version
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from backend.main import get_current_user
from backend.firebase_admin import get_user_api_keys

router = APIRouter()

@router.get("/api/bot/balance/{exchange}")
async def get_exchange_balance(
    exchange: str,
    is_futures: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Get balance from specific exchange (spot or futures)"""
    try:
        from backend.services import binance_service, bybit_service, okx_service, kucoin_service, mexc_service
        
        # Fetch user's API keys from Firebase
        user_id = current_user.get("user_id")
        exchange = exchange.lower()
        
        api_keys = get_user_api_keys(user_id, exchange)
        if not api_keys:
            raise HTTPException(status_code=400, detail=f"API keys not configured for {exchange}. Please add via Settings.")
        
        api_key = api_keys.get("api_key")
        api_secret = api_keys.get("api_secret")
        passphrase = api_keys.get("passphrase", "")
        
        if exchange == "binance":
            balance = await binance_service.get_balance(api_key, api_secret, is_futures)
        elif exchange == "bybit":
            balance = await bybit_service.get_balance(api_key, api_secret, is_futures)
        elif exchange == "okx":
            balance = await okx_service.get_balance(api_key, api_secret, is_futures, passphrase)
        elif exchange == "kucoin":
            balance = await kucoin_service.get_balance(api_key, api_secret, is_futures, passphrase)
        elif exchange == "mexc":
            balance = await mexc_service.get_balance(api_key, api_secret, is_futures)
        else:
            raise HTTPException(status_code=400, detail=f"Exchange {exchange} not supported")
        
        balance["exchange"] = exchange
        balance["type"] = "futures" if is_futures else "spot"
        
        return balance
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch balance: {str(e)}")
