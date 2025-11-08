"""
Positions API Endpoints
Handles opening, closing, and managing trading positions
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

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
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization header")

        token = authorization.replace("Bearer ", "")

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return payload
        except:
            pass

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


# Request Models
class OpenPositionRequest(BaseModel):
    exchange: str
    symbol: str
    side: str  # "LONG" or "SHORT"
    amount: float
    leverage: int
    takeProfit: Optional[float] = None
    stopLoss: Optional[float] = None
    is_futures: bool = True


class ClosePositionRequest(BaseModel):
    exchange: str
    symbol: str
    position_id: Optional[str] = None


# ==================== GET POSITIONS ====================

@router.get("/bot/positions")
async def get_positions(current_user: dict = Depends(get_current_user)):
    """Get all open positions for user"""
    try:
        from backend.firebase_admin import get_all_user_exchanges, get_user_api_keys
        from backend.services.unified_exchange import unified_exchange
        
        user_id = current_user.get("user_id") or current_user.get("id")
        
        # Get all user's exchanges
        user_exchanges = get_all_user_exchanges(user_id)
        
        if not user_exchanges:
            return {
                "success": True,
                "positions": [],
                "message": "No exchanges configured"
            }
        
        all_positions = []
        
        # Fetch positions from each exchange
        for exchange_data in user_exchanges:
            exchange_name = exchange_data.get("id", "").lower()
            
            try:
                # Get API keys
                api_keys = get_user_api_keys(user_id, exchange_name)
                
                if not api_keys:
                    logger.warning(f"No API keys for {exchange_name}")
                    continue
                
                # Fetch positions from unified exchange service
                positions = await unified_exchange.get_positions(
                    exchange=exchange_name,
                    api_key=api_keys.get("api_key"),
                    api_secret=api_keys.get("api_secret"),
                    is_futures=exchange_data.get("is_futures", True),
                    passphrase=api_keys.get("passphrase", "")
                )
                
                all_positions.extend(positions)
                
            except Exception as e:
                logger.error(f"Error fetching positions from {exchange_name}: {str(e)}")
                continue
        
        return {
            "success": True,
            "positions": all_positions,
            "count": len(all_positions)
        }
        
    except Exception as e:
        logger.error(f"Error in get_positions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== OPEN POSITION ====================

@router.post("/bot/position")
async def open_position(
    request: OpenPositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Open a new trading position
    """
    try:
        from backend.firebase_admin import get_user_api_keys
        
        user_id = current_user.get("user_id") or current_user.get("id")
        exchange = request.exchange.lower()
        
        logger.info(f"🚀 Opening position: {request.side} {request.symbol} on {exchange} for user {user_id}")
        
        # Get API keys
        api_keys = get_user_api_keys(user_id, exchange)
        
        if not api_keys:
            raise HTTPException(
                status_code=404,
                detail=f"API keys not configured for {exchange}"
            )
        
        api_key = api_keys.get("api_key")
        api_secret = api_keys.get("api_secret")
        passphrase = api_keys.get("passphrase", "")
        
        # Get exchange service based on exchange name
        if exchange == "binance":
            from backend.services import binance_service
            
            # Set leverage first
            await binance_service.set_leverage(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                leverage=request.leverage,
                is_futures=request.is_futures
            )
            
            # Open position
            result = await binance_service.open_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                side=request.side,
                amount=request.amount,
                leverage=request.leverage,
                take_profit=request.takeProfit,
                stop_loss=request.stopLoss,
                is_futures=request.is_futures
            )
            
        elif exchange == "bybit":
            from backend.services import bybit_service
            
            result = await bybit_service.open_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                side=request.side,
                amount=request.amount,
                leverage=request.leverage,
                take_profit=request.takeProfit,
                stop_loss=request.stopLoss,
                is_futures=request.is_futures
            )
            
        elif exchange == "okx":
            from backend.services import okx_service
            
            result = await okx_service.open_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                side=request.side,
                amount=request.amount,
                leverage=request.leverage,
                take_profit=request.takeProfit,
                stop_loss=request.stopLoss,
                is_futures=request.is_futures,
                passphrase=passphrase
            )
            
        elif exchange == "kucoin":
            from backend.services import kucoin_service
            
            result = await kucoin_service.open_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                side=request.side,
                amount=request.amount,
                leverage=request.leverage,
                take_profit=request.takeProfit,
                stop_loss=request.stopLoss,
                is_futures=request.is_futures,
                passphrase=passphrase
            )
            
        elif exchange == "mexc":
            from backend.services import mexc_service
            
            result = await mexc_service.open_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                side=request.side,
                amount=request.amount,
                leverage=request.leverage,
                take_profit=request.takeProfit,
                stop_loss=request.stopLoss,
                is_futures=request.is_futures
            )
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported exchange: {exchange}"
            )
        
        logger.info(f"✅ Position opened successfully: {result}")
        
        return {
            "success": True,
            "message": "Position opened successfully",
            "position": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error opening position: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open position: {str(e)}"
        )


# ==================== CLOSE POSITION ====================

@router.post("/bot/position/close")
async def close_position(
    request: ClosePositionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Close an existing position
    """
    try:
        from backend.firebase_admin import get_user_api_keys
        
        user_id = current_user.get("user_id") or current_user.get("id")
        exchange = request.exchange.lower()
        
        logger.info(f"🔴 Closing position: {request.symbol} on {exchange} for user {user_id}")
        
        # Get API keys
        api_keys = get_user_api_keys(user_id, exchange)
        
        if not api_keys:
            raise HTTPException(
                status_code=404,
                detail=f"API keys not configured for {exchange}"
            )
        
        api_key = api_keys.get("api_key")
        api_secret = api_keys.get("api_secret")
        passphrase = api_keys.get("passphrase", "")
        
        # Close position based on exchange
        if exchange == "binance":
            from backend.services import binance_service
            result = await binance_service.close_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                is_futures=True
            )
            
        elif exchange == "bybit":
            from backend.services import bybit_service
            result = await bybit_service.close_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                is_futures=True
            )
            
        elif exchange == "okx":
            from backend.services import okx_service
            result = await okx_service.close_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                is_futures=True,
                passphrase=passphrase
            )
            
        elif exchange == "kucoin":
            from backend.services import kucoin_service
            result = await kucoin_service.close_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                is_futures=True,
                passphrase=passphrase
            )
            
        elif exchange == "mexc":
            from backend.services import mexc_service
            result = await mexc_service.close_position(
                api_key=api_key,
                api_secret=api_secret,
                symbol=request.symbol,
                is_futures=True
            )
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported exchange: {exchange}"
            )
        
        logger.info(f"✅ Position closed successfully")
        
        return {
            "success": True,
            "message": "Position closed successfully",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error closing position: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to close position: {str(e)}"
        )


# ==================== GET MARKET INFO ====================

@router.get("/bot/market/{exchange}/{symbol}")
async def get_market_info(
    exchange: str,
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get market information (min/max lot size, precision, etc.)
    This is the missing getMarket function!
    """
    try:
        from backend.firebase_admin import get_user_api_keys
        
        user_id = current_user.get("user_id") or current_user.get("id")
        exchange = exchange.lower()
        
        # Get API keys
        api_keys = get_user_api_keys(user_id, exchange)
        
        if not api_keys:
            raise HTTPException(
                status_code=404,
                detail=f"API keys not configured for {exchange}"
            )
        
        api_key = api_keys.get("api_key")
        api_secret = api_keys.get("api_secret")
        passphrase = api_keys.get("passphrase", "")
        
        # Get market info based on exchange
        if exchange == "binance":
            from backend.services import binance_service
            market_info = await binance_service.get_market_info(
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                is_futures=True
            )
            
        elif exchange == "bybit":
            from backend.services import bybit_service
            market_info = await bybit_service.get_market_info(
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                is_futures=True
            )
            
        elif exchange == "okx":
            from backend.services import okx_service
            market_info = await okx_service.get_market_info(
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                is_futures=True,
                passphrase=passphrase
            )
            
        elif exchange == "kucoin":
            from backend.services import kucoin_service
            market_info = await kucoin_service.get_market_info(
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                is_futures=True,
                passphrase=passphrase
            )
            
        elif exchange == "mexc":
            from backend.services import mexc_service
            market_info = await mexc_service.get_market_info(
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                is_futures=True
            )
            
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported exchange: {exchange}"
            )
        
        return {
            "success": True,
            "market": market_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting market info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get market info: {str(e)}"
        )