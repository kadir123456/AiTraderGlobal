from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import jwt
import httpx
from datetime import datetime, timedelta
import hashlib
import hmac
import time

# Import database module
try:
    from backend.database import db
    DATABASE_AVAILABLE = True
except ImportError:
    DATABASE_AVAILABLE = False
    print("⚠️ Warning: Database module not available")

# Import authentication
from backend.auth import get_current_user, get_user_plan, check_plan_limits

# Import auto-trading router
try:
    from backend.api.auto_trading import router as auto_trading_router
    try:
        from backend.api.auto_trading import init_ema_monitor
        EMA_INIT_AVAILABLE = True
    except ImportError:
        EMA_INIT_AVAILABLE = False
    AUTO_TRADING_AVAILABLE = True
    print("✅ Auto-trading module loaded successfully")
except ImportError as e:
    AUTO_TRADING_AVAILABLE = False
    EMA_INIT_AVAILABLE = False
    print(f"⚠️ Warning: Auto-trading module not available - {str(e)}")

# Import exchange services
try:
    from backend.services import binance_service, bybit_service, okx_service, kucoin_service, mexc_service
    EXCHANGE_SERVICES_AVAILABLE = True
except ImportError:
    EXCHANGE_SERVICES_AVAILABLE = False
    print("Warning: Exchange services not available")

app = FastAPI(title="EMA Navigator AI Trading API")

# Include routers
if AUTO_TRADING_AVAILABLE:
    app.include_router(auto_trading_router)

# Include balance router
try:
    from backend.api.balance import router as balance_router
    app.include_router(balance_router)
except ImportError:
    print("Warning: Balance module not available")

# Include payments router
try:
    from backend.api.payments import router as payments_router
    app.include_router(payments_router)
    print("✅ Payments module loaded")
except ImportError:
    print("⚠️ Warning: Payments module not available")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aitraderglobal-1.onrender.com",
        "https://aitraderglobal.onrender.com",
        "https://aitraderglobal-1.lovable.app",
        "https://aitraderglobal.lovable.app", 
        "http://localhost:5173",
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "32-char-encryption-key-change")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyDqAsiITYyPK9bTuGGz7aVBkZ7oLB2Kt3U")

# Models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class APIKeyInput(BaseModel):
    exchange: str
    api_key: str
    api_secret: str

class EMARequest(BaseModel):
    exchange: str
    symbol: str
    interval: str = "15m"

class PositionRequest(BaseModel):
    exchange: str
    symbol: str
    side: str
    amount: float
    leverage: int = 10
    tp_percentage: float
    sl_percentage: float
    is_futures: bool = True  # Default to futures, set False for spot
    passphrase: Optional[str] = None  # For OKX and KuCoin

# Helper Functions
def create_jwt_token(user_id: str, email: str) -> str:
    """Create JWT token for user authentication"""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_jwt_token(token: str) -> dict:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_firebase_token_with_identitytoolkit(id_token: str) -> dict:
    """Verify Firebase ID token by calling Google Identity Toolkit.
    Returns minimal user info on success.
    """
    if not FIREBASE_API_KEY:
        raise HTTPException(status_code=500, detail="Missing FIREBASE_API_KEY on server")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
                json={"idToken": id_token},
                timeout=10.0,
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
        data = resp.json()
        users = data.get("users", [])
        if not users:
            raise HTTPException(status_code=401, detail="Invalid Firebase ID token")
        u = users[0]
        return {"user_id": u.get("localId"), "email": u.get("email")}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Failed to verify Firebase token")

async def get_current_user(authorization: str = Header(None)):
    """Dependency to get current authenticated user (supports local JWT or Firebase ID token)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")

    # Try local JWT first
    try:
        return verify_jwt_token(token)
    except HTTPException:
        # Fallback to Firebase ID token
        return await verify_firebase_token_with_identitytoolkit(token)

# Exchange API Helpers
async def validate_binance_api(api_key: str, api_secret: str) -> bool:
    """Validate Binance API credentials"""
    try:
        timestamp = int(time.time() * 1000)
        query_string = f"timestamp={timestamp}"
        signature = hmac.new(
            api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://fapi.binance.com/fapi/v2/account?{query_string}&signature={signature}",
                headers={"X-MBX-APIKEY": api_key}
            )
            return response.status_code == 200
    except Exception:
        return False

async def validate_bybit_api(api_key: str, api_secret: str) -> bool:
    """Validate Bybit API credentials"""
    try:
        timestamp = str(int(time.time() * 1000))
        params = f"api_key={api_key}&timestamp={timestamp}"
        signature = hmac.new(
            api_secret.encode('utf-8'),
            params.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.bybit.com/v2/private/wallet/balance?{params}&sign={signature}",
                headers={"Content-Type": "application/json"}
            )
            return response.status_code == 200
    except Exception:
        return False

async def validate_okx_api(api_key: str, api_secret: str) -> bool:
    """Validate OKX API credentials"""
    try:
        timestamp = datetime.utcnow().isoformat()[:-3] + 'Z'
        message = timestamp + 'GET' + '/api/v5/account/balance'
        signature = hmac.new(
            api_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest().hex()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.okx.com/api/v5/account/balance",
                headers={
                    "OK-ACCESS-KEY": api_key,
                    "OK-ACCESS-SIGN": signature,
                    "OK-ACCESS-TIMESTAMP": timestamp,
                    "OK-ACCESS-PASSPHRASE": "your-passphrase"  # User needs to provide
                }
            )
            return response.status_code == 200
    except Exception:
        return False

async def calculate_ema(exchange: str, symbol: str, interval: str = "15m"):
    """Calculate EMA 9 and EMA 21 for given symbol"""
    try:
        # Fetch candle data from exchange
        if exchange.lower() == "binance":
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://fapi.binance.com/fapi/v1/klines",
                    params={"symbol": symbol, "interval": interval, "limit": 100}
                )
                candles = response.json()
        else:
            raise HTTPException(status_code=400, detail=f"Exchange {exchange} not yet supported for EMA calculation")
        
        # Calculate EMA 9 and EMA 21
        closes = [float(candle[4]) for candle in candles]
        
        def calculate_ema_value(data, period):
            multiplier = 2 / (period + 1)
            ema = [sum(data[:period]) / period]
            for price in data[period:]:
                ema.append((price - ema[-1]) * multiplier + ema[-1])
            return ema[-1]
        
        ema9 = calculate_ema_value(closes, 9)
        ema21 = calculate_ema_value(closes, 21)
        
        # Generate signal
        signal = "BUY" if ema9 > ema21 else "SELL" if ema9 < ema21 else "NEUTRAL"
        
        return {
            "symbol": symbol,
            "interval": interval,
            "ema9": round(ema9, 2),
            "ema21": round(ema21, 2),
            "current_price": closes[-1],
            "signal": signal,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EMA calculation failed: {str(e)}")

# API Endpoints

@app.get("/")
async def root():
    return {
        "message": "EMA Navigator AI Trading API",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Trading pairs endpoint
@app.get("/api/bot/coins")
async def get_trading_coins(exchange: str = "binance"):
    """Get popular trading pairs for the exchange"""
    # Popular coins across all exchanges
    popular_coins = [
        {"symbol": "BTCUSDT", "name": "Bitcoin", "min_leverage": 1, "max_leverage": 125},
        {"symbol": "ETHUSDT", "name": "Ethereum", "min_leverage": 1, "max_leverage": 100},
        {"symbol": "BNBUSDT", "name": "BNB", "min_leverage": 1, "max_leverage": 75},
        {"symbol": "SOLUSDT", "name": "Solana", "min_leverage": 1, "max_leverage": 50},
        {"symbol": "XRPUSDT", "name": "Ripple", "min_leverage": 1, "max_leverage": 75},
        {"symbol": "ADAUSDT", "name": "Cardano", "min_leverage": 1, "max_leverage": 50},
        {"symbol": "DOGEUSDT", "name": "Dogecoin", "min_leverage": 1, "max_leverage": 50},
        {"symbol": "AVAXUSDT", "name": "Avalanche", "min_leverage": 1, "max_leverage": 50},
        {"symbol": "DOTUSDT", "name": "Polkadot", "min_leverage": 1, "max_leverage": 50},
        {"symbol": "MATICUSDT", "name": "Polygon", "min_leverage": 1, "max_leverage": 50},
    ]
    
    return {"coins": popular_coins, "exchange": exchange}

# Authentication Endpoints
@app.post("/api/auth/register")
async def register(user: UserRegister):
    """Register new user"""
    # TODO: Implement user registration with Firebase or your DB
    # For now, return mock response
    return {
        "message": "User registered successfully",
        "user_id": "mock-user-id",
        "email": user.email
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    """Login user and return JWT token"""
    # TODO: Validate credentials with Firebase or your DB
    # For now, return mock token
    token = create_jwt_token("mock-user-id", user.email)
    return {
        "token": token,
        "user": {
            "id": "mock-user-id",
            "email": user.email
        }
    }

# API Key Management
@app.post("/api/user/api-keys")
async def add_api_key(api_input: APIKeyInput, current_user: dict = Depends(get_current_user)):
    """Add and validate exchange API key"""
    exchange = api_input.exchange.lower()
    
    # Validate API credentials
    is_valid = False
    if exchange == "binance":
        is_valid = await validate_binance_api(api_input.api_key, api_input.api_secret)
    elif exchange == "bybit":
        is_valid = await validate_bybit_api(api_input.api_key, api_input.api_secret)
    elif exchange == "okx":
        is_valid = await validate_okx_api(api_input.api_key, api_input.api_secret)
    else:
        raise HTTPException(status_code=400, detail=f"Exchange {exchange} not supported")
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API credentials")
    
    # TODO: Store encrypted API keys in database
    return {
        "message": f"{exchange.capitalize()} API key validated and stored successfully",
        "exchange": exchange,
        "status": "connected"
    }

@app.get("/api/user/api-keys")
async def get_api_keys(current_user: dict = Depends(get_current_user)):
    """Get user's connected exchanges"""
    # TODO: Fetch from database
    return {
        "exchanges": [
            {
                "id": "1",
                "name": "binance",
                "status": "connected",
                "added_at": datetime.utcnow().isoformat()
            }
        ]
    }

@app.delete("/api/user/api-keys/{exchange_id}")
async def remove_api_key(exchange_id: str, current_user: dict = Depends(get_current_user)):
    """Remove exchange API key"""
    # TODO: Delete from database
    return {"message": "Exchange removed successfully"}

# Bot/Trading Endpoints
@app.post("/api/bot/ema-signal")
async def get_ema_signal(request: EMARequest, current_user: dict = Depends(get_current_user)):
    """Get EMA signal for trading pair"""
    result = await calculate_ema(request.exchange, request.symbol, request.interval)
    return result

@app.get("/api/bot/positions")
async def get_positions(current_user: dict = Depends(get_current_user), exchange: Optional[str] = None):
    """Get user's open positions from all exchanges or specific exchange"""
    if not EXCHANGE_SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Exchange services not available")
    
    user_id = current_user.get("user_id")
    
    # TODO: Fetch user's API keys from database
    # For now using mock - REPLACE IN PRODUCTION
    api_key = "mock_api_key"
    api_secret = "mock_api_secret"
    passphrase = ""
    
    all_positions = []
    exchanges_to_check = [exchange.lower()] if exchange else ["binance", "bybit", "okx", "kucoin", "mexc"]
    
    for exch in exchanges_to_check:
        try:
            positions = []
            
            # Fetch positions from exchange
            if exch == "binance":
                positions = await binance_service.get_positions(api_key, api_secret, is_futures=True)
            elif exch == "bybit":
                positions = await bybit_service.get_positions(api_key, api_secret, is_futures=True)
            elif exch == "okx":
                positions = await okx_service.get_positions(api_key, api_secret, is_futures=True, passphrase=passphrase)
            elif exch == "kucoin":
                positions = await kucoin_service.get_positions(api_key, api_secret, is_futures=True, passphrase=passphrase)
            elif exch == "mexc":
                positions = await mexc_service.get_positions(api_key, api_secret, is_futures=True)
            
            # Add exchange info to each position
            for pos in positions:
                pos["exchange"] = exch
                pos["id"] = f"{exch}_{pos['symbol']}_{int(datetime.utcnow().timestamp())}"
                all_positions.append(pos)
                
        except Exception as e:
            print(f"[ERROR] Failed to fetch positions from {exch}: {str(e)}")
            continue
    
    return {"positions": all_positions}

@app.post("/api/bot/positions")
async def create_position(position: PositionRequest, current_user: dict = Depends(get_current_user)):
    """Create new trading position with leverage and TP/SL - Multi-Exchange Support"""
    if not EXCHANGE_SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Exchange services not available")
    
    from backend.auth import get_user_plan, check_plan_limits
    
    user_id = current_user.get("user_id")
    exchange = position.exchange.lower()
    
    # Check user's subscription plan and position limits
    user_plan = await get_user_plan(user_id)
    
    # Get current open positions count (TODO: fetch from database)
    current_positions_count = 0  # Replace with actual DB query
    
    # Check plan limits
    limit_check = check_plan_limits(user_plan, current_positions_count)
    
    if not limit_check["can_open"]:
        raise HTTPException(
            status_code=403,
            detail=f"Position limit reached. {limit_check['message']}. Upgrade to Pro for more positions."
        )
    
    # TODO: Fetch user's API keys from database for the selected exchange
    # For now using mock keys - REPLACE IN PRODUCTION
    api_key = "mock_api_key"
    api_secret = "mock_api_secret"
    passphrase = position.passphrase or ""
    
    # Validate API keys exist
    if not api_key or api_key == "mock_api_key":
        raise HTTPException(
            status_code=400,
            detail=f"Exchange credentials missing for {exchange}. Please add your API keys in Settings."
        )
    
    try:
        # Route to appropriate exchange service
        if exchange == "binance":
            order_result = await binance_service.create_order(
                api_key=api_key,
                api_secret=api_secret,
                symbol=position.symbol,
                side=position.side.upper(),
                amount=position.amount,
                leverage=position.leverage,
                is_futures=position.is_futures,
                tp_percentage=position.tp_percentage,
                sl_percentage=position.sl_percentage
            )
        elif exchange == "bybit":
            order_result = await bybit_service.create_order(
                api_key=api_key,
                api_secret=api_secret,
                symbol=position.symbol,
                side=position.side.upper(),
                amount=position.amount,
                leverage=position.leverage,
                is_futures=position.is_futures,
                tp_percentage=position.tp_percentage,
                sl_percentage=position.sl_percentage
            )
        elif exchange == "okx":
            order_result = await okx_service.create_order(
                api_key=api_key,
                api_secret=api_secret,
                symbol=position.symbol,
                side=position.side.upper(),
                amount=position.amount,
                leverage=position.leverage,
                is_futures=position.is_futures,
                tp_percentage=position.tp_percentage,
                sl_percentage=position.sl_percentage,
                passphrase=passphrase
            )
        elif exchange == "kucoin":
            order_result = await kucoin_service.create_order(
                api_key=api_key,
                api_secret=api_secret,
                symbol=position.symbol,
                side=position.side.upper(),
                amount=position.amount,
                leverage=position.leverage,
                is_futures=position.is_futures,
                tp_percentage=position.tp_percentage,
                sl_percentage=position.sl_percentage,
                passphrase=passphrase
            )
        elif exchange == "mexc":
            order_result = await mexc_service.create_order(
                api_key=api_key,
                api_secret=api_secret,
                symbol=position.symbol,
                side=position.side.upper(),
                amount=position.amount,
                leverage=position.leverage,
                is_futures=position.is_futures,
                tp_percentage=position.tp_percentage,
                sl_percentage=position.sl_percentage
            )
        else:
            raise HTTPException(status_code=400, detail=f"Exchange {exchange} not supported")
        
        # Get current price for calculations
        if exchange == "binance":
            current_price = await binance_service.get_current_price(api_key, api_secret, position.symbol, position.is_futures)
        elif exchange == "bybit":
            current_price = await bybit_service.get_current_price(api_key, api_secret, position.symbol, position.is_futures)
        elif exchange == "okx":
            current_price = await okx_service.get_current_price(api_key, api_secret, position.symbol, position.is_futures, passphrase)
        elif exchange == "kucoin":
            current_price = await kucoin_service.get_current_price(api_key, api_secret, position.symbol, position.is_futures, passphrase)
        elif exchange == "mexc":
            current_price = await mexc_service.get_current_price(api_key, api_secret, position.symbol, position.is_futures)
        else:
            current_price = 0.0
        
        # Calculate TP/SL prices
        if position.side.upper() == "LONG" or position.side.upper() == "BUY":
            tp_price = current_price * (1 + position.tp_percentage / 100)
            sl_price = current_price * (1 - position.sl_percentage / 100)
        else:  # SHORT/SELL
            tp_price = current_price * (1 - position.tp_percentage / 100)
            sl_price = current_price * (1 + position.sl_percentage / 100)
        
        # TODO: Store position in database
        position_data = {
            "id": f"pos_{int(datetime.utcnow().timestamp() * 1000)}",
            "user_id": user_id,
            "exchange": exchange,
            "symbol": position.symbol,
            "side": position.side.upper(),
            "entry_price": current_price,
            "current_price": current_price,
            "amount": position.amount,
            "leverage": position.leverage,
            "is_futures": position.is_futures,
            "tp_price": round(tp_price, 2),
            "sl_price": round(sl_price, 2),
            "tp_percentage": position.tp_percentage,
            "sl_percentage": position.sl_percentage,
            "pnl": 0.0,
            "pnl_percentage": 0.0,
            "opened_at": datetime.utcnow().isoformat(),
            "status": "open",
            "order_data": order_result
        }
        
        print(f"[TRADING] {exchange.upper()} Position opened: {position.side} {position.symbol} @ {current_price}")
        print(f"[TRADING] Type: {'FUTURES' if position.is_futures else 'SPOT'} | Leverage: {position.leverage}x")
        print(f"[TRADING] TP: {round(tp_price, 2)} ({position.tp_percentage}%) | SL: {round(sl_price, 2)} ({position.sl_percentage}%)")
        
        return {
            "message": f"Position opened successfully on {exchange.upper()}",
            "position": position_data
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to create position on {exchange}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create position: {str(e)}")

@app.delete("/api/bot/positions/{position_id}")
async def close_position(position_id: str, current_user: dict = Depends(get_current_user)):
    """Close trading position"""
    # TODO: Close position via exchange API
    # TODO: Update database with closing details
    return {
        "message": "Position closed successfully",
        "position_id": position_id,
        "closing_price": 46500.0,
        "pnl": 1500.0,
        "pnl_percentage": 3.33
    }

# Payment Endpoints
@app.post("/api/payments/webhook")
async def payment_webhook(payload: dict):
    """Handle LemonSqueezy webhooks"""
    try:
        # LemonSqueezy webhook events
        event_name = payload.get('meta', {}).get('event_name')
        
        if event_name == 'order_created':
            # New subscription created
            order_id = payload.get('data', {}).get('id')
            customer_email = payload.get('data', {}).get('attributes', {}).get('user_email')
            product_id = payload.get('data', {}).get('attributes', {}).get('first_order_item', {}).get('product_id')
            
            # Determine plan based on product_id
            plan = 'free'
            if 'pro' in str(product_id).lower():
                plan = 'pro'
            elif 'enterprise' in str(product_id).lower():
                plan = 'enterprise'
            
            # TODO: Update user subscription in database
            print(f"New subscription: {customer_email} -> {plan}")
            
        elif event_name == 'subscription_created':
            # Recurring subscription created
            subscription_id = payload.get('data', {}).get('id')
            customer_email = payload.get('data', {}).get('attributes', {}).get('user_email')
            
            # TODO: Update user subscription status
            print(f"Subscription created: {subscription_id} for {customer_email}")
            
        elif event_name == 'subscription_cancelled':
            # Subscription cancelled
            subscription_id = payload.get('data', {}).get('id')
            
            # TODO: Downgrade user to free plan
            print(f"Subscription cancelled: {subscription_id}")
            
        return {"message": "Webhook processed successfully"}
        
    except Exception as e:
        print(f"Webhook processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

@app.get("/api/payments/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    """Get user subscription details"""
    # TODO: Fetch from database
    return {
        "plan": "free",
        "status": "active",
        "expires_at": None
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
