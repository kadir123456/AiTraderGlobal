"""
Main FastAPI Application
✅ COMPLETE VERSION - NO MISSING CODE
"""
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import logging

from backend.auth import get_current_user
from backend.services.trade_manager import trade_manager
from backend.firebase_admin import get_user_api_keys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Trading Bot API",
    description="Automated Trading Bot with EMA Strategy",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class ManualTradeRequest(BaseModel):
    exchange: str
    symbol: str
    side: str  # "BUY", "SELL", "LONG", "SHORT"
    amount: float  # Base quantity (e.g., 0.001 BTC)
    leverage: int = 10
    is_futures: bool = True
    tp_percentage: float = 5.0
    sl_percentage: float = 2.0


class TradeResponse(BaseModel):
    success: bool
    trade_id: str
    exchange_order_id: str
    message: str
    details: dict


class PositionResponse(BaseModel):
    success: bool
    positions: List[dict]


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Trading Bot API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    from backend.firebase_admin import firebase_initialized
    
    return {
        "status": "healthy",
        "firebase": "connected" if firebase_initialized else "disconnected",
        "services": {
            "trade_manager": "active",
            "ema_monitor": "active"
        }
    }


# ============================================
# MANUAL TRADING ENDPOINTS
# ============================================

@app.post("/api/trade", response_model=TradeResponse)
async def execute_manual_trade(
    trade_request: ManualTradeRequest,
    current_user = Depends(get_current_user)
):
    """
    Execute a manual trade order
    
    This endpoint allows users to manually open positions on connected exchanges.
    """
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        logger.info(
            f"🔵 Manual Trade Request\n"
            f"   User: {user_id}\n"
            f"   Exchange: {trade_request.exchange}\n"
            f"   Symbol: {trade_request.symbol}\n"
            f"   Side: {trade_request.side}\n"
            f"   Amount: {trade_request.amount}\n"
            f"   Leverage: {trade_request.leverage}x"
        )
        
        # Get user's API keys for selected exchange
        api_keys = get_user_api_keys(user_id, trade_request.exchange.lower())
        
        if not api_keys:
            raise HTTPException(
                status_code=400,
                detail=f"API keys not found for {trade_request.exchange}. Please add them in settings."
            )
        
        # Normalize side to LONG/SHORT for futures
        side = trade_request.side.upper()
        if side == "BUY":
            side = "LONG"
        elif side == "SELL":
            side = "SHORT"
        
        # Execute trade via TradeManager
        result = await trade_manager.create_order(
            user_id=user_id,
            exchange=trade_request.exchange.lower(),
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            symbol=trade_request.symbol,
            side=side,
            amount=trade_request.amount,
            leverage=trade_request.leverage,
            is_futures=trade_request.is_futures,
            tp_percentage=trade_request.tp_percentage,
            sl_percentage=trade_request.sl_percentage,
            passphrase=api_keys.get('passphrase', '')
        )
        
        logger.info(f"✅ Trade executed successfully: {result.get('trade_id')}")
        
        return TradeResponse(
            success=True,
            trade_id=result.get('trade_id'),
            exchange_order_id=result.get('exchange_order_id'),
            message=f"{side} order placed successfully",
            details=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Manual trade failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Trade execution failed: {str(e)}"
        )


@app.get("/api/positions", response_model=PositionResponse)
async def get_positions(current_user = Depends(get_current_user)):
    """
    Get user's open positions
    
    Returns all open trades from Firebase
    """
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        # Get open trades from Firebase
        trades = await trade_manager.get_user_trades(user_id, status="open")
        
        logger.info(f"📊 Retrieved {len(trades)} open positions for user {user_id}")
        
        return PositionResponse(
            success=True,
            positions=trades
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to get positions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch positions: {str(e)}"
        )


@app.post("/api/positions/{position_id}/close")
async def close_position(
    position_id: str,
    current_user = Depends(get_current_user)
):
    """
    Close an open position
    
    Args:
        position_id: Trade ID to close
    """
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        # Get trade details
        trades = await trade_manager.get_user_trades(user_id)
        trade = next((t for t in trades if t['id'] == position_id), None)
        
        if not trade:
            raise HTTPException(
                status_code=404,
                detail=f"Position {position_id} not found"
            )
        
        # Get API keys
        api_keys = get_user_api_keys(user_id, trade['exchange'])
        
        if not api_keys:
            raise HTTPException(
                status_code=400,
                detail=f"API keys not found for {trade['exchange']}"
            )
        
        # Close position
        result = await trade_manager.close_position(
            user_id=user_id,
            trade_id=position_id,
            exchange=trade['exchange'],
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            symbol=trade['symbol'],
            is_futures=trade.get('is_futures', True),
            passphrase=api_keys.get('passphrase', '')
        )
        
        logger.info(f"✅ Position closed: {position_id}")
        
        return {
            "success": True,
            "message": "Position closed successfully",
            "details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to close position: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to close position: {str(e)}"
        )


# ============================================
# MARKET DATA ENDPOINTS
# ============================================

@app.get("/api/balance/{exchange}")
async def get_balance(
    exchange: str,
    current_user = Depends(get_current_user)
):
    """Get exchange balance"""
    from backend.services.unified_exchange import unified_exchange
    
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        api_keys = get_user_api_keys(user_id, exchange.lower())
        
        if not api_keys:
            raise HTTPException(
                status_code=400,
                detail=f"API keys not found for {exchange}"
            )
        
        balance = await unified_exchange.get_balance(
            exchange=exchange.lower(),
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            is_futures=True,
            passphrase=api_keys.get('passphrase', '')
        )
        
        return {
            "success": True,
            "balances": balance
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get balance: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch balance: {str(e)}"
        )


@app.get("/api/ticker/{exchange}/{symbol}")
async def get_ticker(
    exchange: str,
    symbol: str,
    current_user = Depends(get_current_user)
):
    """Get current price for symbol"""
    from backend.services.unified_exchange import unified_exchange
    
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        api_keys = get_user_api_keys(user_id, exchange.lower())
        
        if not api_keys:
            raise HTTPException(
                status_code=400,
                detail=f"API keys not found for {exchange}"
            )
        
        price_data = await unified_exchange.get_current_price(
            exchange=exchange.lower(),
            symbol=symbol,
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            is_futures=True,
            passphrase=api_keys.get('passphrase', '')
        )
        
        return {
            "success": True,
            "price": price_data['price'],
            "data": price_data
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get ticker: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch ticker: {str(e)}"
        )


@app.get("/api/market/{exchange}/{symbol}")
async def get_market_info(
    exchange: str,
    symbol: str,
    current_user = Depends(get_current_user)
):
    """Get market info (lot size, min quantity, etc.)"""
    from backend.services.unified_exchange import unified_exchange
    
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        api_keys = get_user_api_keys(user_id, exchange.lower())
        
        if not api_keys:
            # Return defaults if no API keys
            return {
                "success": True,
                "market": {
                    "stepSize": "0.00000001",
                    "minQty": "0.001",
                    "lotSize": "0.00000001",
                    "minNotional": "10"
                }
            }
        
        market = await unified_exchange.get_market_info(
            exchange=exchange.lower(),
            symbol=symbol,
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            passphrase=api_keys.get('passphrase', '')
        )
        
        return {
            "success": True,
            "market": market
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get market info: {e}")
        # Return defaults on error
        return {
            "success": True,
            "market": {
                "stepSize": "0.00000001",
                "minQty": "0.001",
                "lotSize": "0.00000001",
                "minNotional": "10"
            }
        }


@app.get("/api/ema-signal/{exchange}/{symbol}/{interval}")
async def get_ema_signal(
    exchange: str,
    symbol: str,
    interval: str,
    current_user = Depends(get_current_user)
):
    """Get EMA signal for symbol"""
    from backend.services.ema_monitor_firebase import EMAMonitorFirebase
    
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        api_keys = get_user_api_keys(user_id, exchange.lower())
        
        if not api_keys:
            return {
                "success": False,
                "signal": None,
                "error": "API keys not found"
            }
        
        monitor = EMAMonitorFirebase()
        
        signal = await monitor.check_ema_signal(
            user_id=user_id,
            exchange_name=exchange.lower(),
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            symbol=symbol,
            interval=interval,
            passphrase=api_keys.get('passphrase', '')
        )
        
        if signal:
            return {
                "success": True,
                **signal
            }
        else:
            return {
                "success": True,
                "signal": None,
                "message": "No signal detected"
            }
        
    except Exception as e:
        logger.error(f"❌ Failed to get EMA signal: {e}")
        return {
            "success": False,
            "signal": None,
            "error": str(e)
        }


@app.get("/api/markets/{exchange}")
async def get_exchange_markets(
    exchange: str,
    current_user = Depends(get_current_user)
):
    """Get available markets for exchange"""
    from backend.services.unified_exchange import unified_exchange
    
    user_id = current_user.get('user_id') or current_user.get('id')
    
    try:
        api_keys = get_user_api_keys(user_id, exchange.lower())
        
        # Default coins if no API keys
        default_markets = [
            {"symbol": "BTCUSDT", "name": "BTC/USDT"},
            {"symbol": "ETHUSDT", "name": "ETH/USDT"},
            {"symbol": "BNBUSDT", "name": "BNB/USDT"},
            {"symbol": "SOLUSDT", "name": "SOL/USDT"},
            {"symbol": "XRPUSDT", "name": "XRP/USDT"},
            {"symbol": "ADAUSDT", "name": "ADA/USDT"},
            {"symbol": "DOGEUSDT", "name": "DOGE/USDT"},
            {"symbol": "AVAXUSDT", "name": "AVAX/USDT"}
        ]
        
        if not api_keys:
            return {
                "success": True,
                "markets": default_markets
            }
        
        markets = await unified_exchange.get_markets(
            exchange=exchange.lower(),
            api_key=api_keys.get('api_key'),
            api_secret=api_keys.get('api_secret'),
            passphrase=api_keys.get('passphrase', '')
        )
        
        return {
            "success": True,
            "markets": markets
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get markets: {e}")
        # Return defaults on error
        return {
            "success": True,
            "markets": [
                {"symbol": "BTCUSDT", "name": "BTC/USDT"},
                {"symbol": "ETHUSDT", "name": "ETH/USDT"},
                {"symbol": "BNBUSDT", "name": "BNB/USDT"},
                {"symbol": "SOLUSDT", "name": "SOL/USDT"}
            ]
        }


# ============================================
# INCLUDE ROUTERS
# ============================================

from backend.api.admin import router as admin_router
from backend.api.auto_trading import router as auto_trading_router
from backend.api.balance import router as balance_router
from backend.api.integrations import router as integrations_router
from backend.api.payments import router as payments_router
from backend.api.transactions import router as transactions_router

app.include_router(admin_router)
app.include_router(auto_trading_router)
app.include_router(balance_router)
app.include_router(integrations_router)
app.include_router(payments_router)
app.include_router(transactions_router)


# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Trading Bot API Server...")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )