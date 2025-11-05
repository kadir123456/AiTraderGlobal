# Exchange Balance Endpoint
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from backend.main import get_current_user

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
        
        # TODO: Fetch user's API keys from database
        api_key = "mock_api_key"
        api_secret = "mock_api_secret"
        passphrase = ""
        
        exchange = exchange.lower()
        
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch balance: {str(e)}")
