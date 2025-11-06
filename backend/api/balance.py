# Exchange Balance Endpoint - Firebase Version with Unified Service
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
import logging

from backend.firebase_admin import get_user_api_keys
from backend.services.unified_exchange import unified_exchange, ExchangeError, AuthenticationError

logger = logging.getLogger(__name__)
router = APIRouter()

# Import auth function with fallback
try:
    from backend.auth import get_current_user
except ImportError:
    import jwt
    import httpx
    import os

    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTQzMjF4eXoiLCJlbWFpbCI6Imt1bGxhbmljaUBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzYyNDM4MjMwLCJleHAiOjE3NjMwNDMwMzB9.3xp821UGnFcTUX4LJxjQI_Px6tcMgb9jbLxlmDbddP4")
    FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyDqAsiITYyPK9bTuGGz7aVBkZ7oLB2Kt3U")

    async def get_current_user(authorization: str = Header(None)):
        """Fallback authentication"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization header")

        token = authorization.replace("Bearer ", "")

        # Try JWT first
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return payload
        except:
            pass

        # Try Firebase token
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
                    json={"idToken": token},
                    timeout=10.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    users = data.get("users", [])
                    if users:
                        u = users[0]
                        return {
                            "user_id": u.get("localId"),
                            "email": u.get("email"),
                            "uid": u.get("localId")
                        }
        except:
            pass

        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/api/bot/balance/{exchange}")
async def get_exchange_balance(
    exchange: str,
    is_futures: bool = True,
    current_user: dict = Depends(get_current_user)
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
