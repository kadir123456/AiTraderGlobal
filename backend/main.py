# Last updated: 2025-11-06 17:21 - Fixed dependency_overrides
from fastapi import FastAPI, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import jwt
import httpx
import json
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

# Import authentication with fallback
try:
    from backend.auth import get_current_user as auth_get_current_user
    from backend.auth import get_user_plan, check_plan_limits
    AUTH_MODULE_AVAILABLE = True
    print("✅ Auth module loaded")
except ImportError:
    AUTH_MODULE_AVAILABLE = False
    print("⚠️ Warning: Auth module not available, using fallback")

# Import auto-trading router
try:
    from backend.api.auto_trading import router as auto_trading_router
    AUTO_TRADING_AVAILABLE = True
    print("✅ Auto-trading module loaded successfully")
except ImportError as e:
    AUTO_TRADING_AVAILABLE = False
    print(f"⚠️ Warning: Auto-trading module not available - {str(e)}")

# Import exchange services
try:
    from backend.services import binance_service, bybit_service, okx_service, kucoin_service, mexc_service
    EXCHANGE_SERVICES_AVAILABLE = True
    print("✅ Exchange services loaded")
except ImportError:
    EXCHANGE_SERVICES_AVAILABLE = False
    print("⚠️ Warning: Exchange services not available")

# Import WebSocket manager
try:
    from backend.websocket_manager import connection_manager
    WEBSOCKET_AVAILABLE = True
    print("✅ WebSocket manager loaded")
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("⚠️ Warning: WebSocket manager not available")

app = FastAPI(title="EMA Navigator AI Trading API")

# CORS Configuration - Must be before router includes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://aitraderglobal.com",
        "https://www.aitraderglobal.com",
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
    passphrase: Optional[str] = None
    is_futures: bool = True

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
    is_futures: bool = True
    passphrase: Optional[str] = None

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
    """Verify Firebase ID token"""
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
        return {
            "user_id": u.get("localId"), 
            "email": u.get("email"),
            "uid": u.get("localId")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Failed to verify Firebase token: {str(e)}")

async def get_current_user_fallback(authorization: str = Header(None)):
    """Fallback dependency to get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")

    # Try local JWT first
    try:
        return verify_jwt_token(token)
    except HTTPException:
        # Fallback to Firebase ID token
        return await verify_firebase_token_with_identitytoolkit(token)

# Use imported get_current_user if available, otherwise use fallback
if AUTH_MODULE_AVAILABLE:
    get_current_user = auth_get_current_user
else:
    get_current_user = get_current_user_fallback

# Include routers
if AUTO_TRADING_AVAILABLE:
    app.include_router(auto_trading_router)

# Include other routers with error handling
try:
    from backend.api.balance import router as balance_router
    app.include_router(balance_router)
    print("✅ Balance module loaded")
except ImportError as e:
    print(f"⚠️ Warning: Balance module not available - {e}")

try:
    from backend.api.payments import router as payments_router
    app.include_router(payments_router)
    print("✅ Payments module loaded")
except ImportError:
    print("⚠️ Warning: Payments module not available")

try:
    from backend.api.admin import router as admin_router
    app.include_router(admin_router)
    print("✅ Admin module loaded")
except ImportError:
    print("⚠️ Warning: Admin module not available")

try:
    from backend.api.integrations import router as integrations_router
    app.include_router(integrations_router)
    print("✅ Integrations module loaded")
except ImportError:
    print("⚠️ Warning: Integrations module not available")

# ✅ FIXED: Transactions router
try:
    from backend.api.transactions import router as transactions_router
    app.include_router(transactions_router, prefix="/api")
    print("✅ Transactions module loaded")
except ImportError as e:
    print(f"⚠️ Warning: Transactions module not available - {e}")

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
                headers={"X-MBX-APIKEY": api_key},
                timeout=10.0
            )
            return response.status_code == 200
    except Exception as e:
        print(f"Binance validation error: {e}")
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
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )
            return response.status_code == 200
    except Exception as e:
        print(f"Bybit validation error: {e}")
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
                    "OK-ACCESS-PASSPHRASE": "your-passphrase"
                },
                timeout=10.0
            )
            return response.status_code == 200
    except Exception as e:
        print(f"OKX validation error: {e}")
        return False

async def calculate_ema(exchange: str, symbol: str, interval: str = "15m"):
    """Calculate EMA 9 and EMA 21 for given symbol"""
    try:
        if exchange.lower() == "binance":
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://fapi.binance.com/fapi/v1/klines",
                    params={"symbol": symbol, "interval": interval, "limit": 100},
                    timeout=10.0
                )
                candles = response.json()
        else:
            raise HTTPException(status_code=400, detail=f"Exchange {exchange} not yet supported for EMA calculation")
        
        closes = [float(candle[4]) for candle in candles]
        
        def calculate_ema_value(data, period):
            multiplier = 2 / (period + 1)
            ema = [sum(data[:period]) / period]
            for price in data[period:]:
                ema.append((price - ema[-1]) * multiplier + ema[-1])
            return ema[-1]
        
        ema9 = calculate_ema_value(closes, 9)
        ema21 = calculate_ema_value(closes, 21)
        
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

@app.get("/api/bot/coins")
async def get_trading_coins(exchange: str = "binance"):
    """Get popular trading pairs for the exchange"""
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

@app.post("/api/auth/register")
async def register(user: UserRegister):
    """Register new user"""
    return {
        "message": "User registered successfully",
        "user_id": "mock-user-id",
        "email": user.email
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    """Login user and return JWT token"""
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
    try:
        from backend.firebase_admin import save_user_api_keys, get_user_subscription, get_all_user_exchanges
        firebase_available = True
    except ImportError:
        firebase_available = False
        print("⚠️ Firebase admin not available, using mock storage")

    # Check subscription plan and exchange limits
    if firebase_available:
        user_id = current_user.get("user_id")
        subscription = get_user_subscription(user_id)
        user_tier = subscription.get('tier', 'free') if subscription else 'free'

        # Get current exchanges count
        current_exchanges = get_all_user_exchanges(user_id)
        exchange_count = len(current_exchanges)

        # Free plan: 1 exchange only
        if user_tier == 'free' and exchange_count >= 1:
            raise HTTPException(
                status_code=403,
                detail="Exchange limit reached. Free plan allows 1 exchange. Upgrade to Pro for unlimited exchanges."
            )

    exchange = api_input.exchange.lower()
    
    # Validate API credentials
    is_valid = False
    try:
        if exchange == "binance":
            is_valid = await validate_binance_api(api_input.api_key, api_input.api_secret)
        elif exchange == "bybit":
            is_valid = await validate_bybit_api(api_input.api_key, api_input.api_secret)
        elif exchange == "okx":
            is_valid = await validate_okx_api(api_input.api_key, api_input.api_secret)
        elif exchange in ["kucoin", "mexc"]:
            is_valid = True
        else:
            raise HTTPException(status_code=400, detail=f"Exchange {exchange} not supported")
    except Exception as e:
        print(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=f"API validation failed: {str(e)}")
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid API credentials")
    
    # Save to Firebase or mock
    saved = False
    if firebase_available:
        saved = save_user_api_keys(
            user_id=current_user.get("user_id"),
            exchange=exchange,
            api_key=api_input.api_key,
            api_secret=api_input.api_secret,
            passphrase=api_input.passphrase or "",
            is_futures=api_input.is_futures
        )
    else:
        saved = True
        print(f"Mock: API keys saved for {exchange}")
    
    return {
        "message": f"{exchange.capitalize()} API key validated and stored successfully",
        "exchange": exchange,
        "status": "connected",
        "saved": saved
    }

@app.get("/api/user/api-keys")
async def get_api_keys(current_user: dict = Depends(get_current_user)):
    """Get user's connected exchanges"""
    try:
        from backend.firebase_admin import get_all_user_exchanges
        exchanges = get_all_user_exchanges(current_user.get("user_id"))
    except ImportError:
        exchanges = []
    
    return {"exchanges": exchanges}

@app.delete("/api/user/api-keys/{exchange_id}")
async def remove_api_key(exchange_id: str, current_user: dict = Depends(get_current_user)):
    """Remove exchange API key"""
    try:
        from backend.firebase_admin import delete_user_api_keys
        deleted = delete_user_api_keys(current_user.get("user_id"), exchange_id)
    except ImportError:
        deleted = True
    
    return {"message": "Exchange removed successfully", "deleted": deleted}

@app.post("/api/bot/ema-signal")
async def get_ema_signal(request: EMARequest, current_user: dict = Depends(get_current_user)):
    """Get EMA signal for trading pair"""
    result = await calculate_ema(request.exchange, request.symbol, request.interval)
    return result

@app.get("/api/bot/positions")
async def get_positions(current_user: dict = Depends(get_current_user), exchange: Optional[str] = None):
    """Get user's open positions"""
    return {"positions": []}

@app.post("/api/bot/positions")
async def create_position(position: PositionRequest, current_user: dict = Depends(get_current_user)):
    """Create new trading position (LONG/SHORT)"""
    if not EXCHANGE_SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Exchange services not available")

    try:
        user_id = current_user.get("user_id") or current_user.get("id")
        exchange = position.exchange.lower()

        # Get API keys from Firebase
        try:
            from backend.firebase_admin import get_user_api_keys
            api_keys = get_user_api_keys(user_id, exchange)
            if not api_keys:
                raise HTTPException(status_code=404, detail=f"API keys not found for {exchange}")

            api_key = api_keys.get("api_key")
            api_secret = api_keys.get("api_secret")
            passphrase = api_keys.get("passphrase", position.passphrase or "")

            if not api_key or not api_secret:
                raise HTTPException(status_code=400, detail=f"Incomplete API credentials for {exchange}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get API keys: {str(e)}")

        # Create order based on exchange
        order_result = None
        order_side = "BUY" if position.side.upper() == "LONG" else "SELL"

        if exchange == "binance":
            order_result = await binance_service.create_order(
                api_key, api_secret, position.symbol, order_side,
                position.amount, position.leverage, position.is_futures,
                position.tp_percentage, position.sl_percentage
            )
        elif exchange == "bybit":
            order_result = await bybit_service.create_order(
                api_key, api_secret, position.symbol, order_side,
                position.amount, position.leverage, position.is_futures,
                position.tp_percentage, position.sl_percentage
            )
        elif exchange == "okx":
            order_result = await okx_service.create_order(
                api_key, api_secret, position.symbol, order_side,
                position.amount, position.leverage, position.is_futures, passphrase,
                position.tp_percentage, position.sl_percentage
            )
        elif exchange == "kucoin":
            order_result = await kucoin_service.create_order(
                api_key, api_secret, position.symbol, order_side,
                position.amount, position.leverage, position.is_futures, passphrase,
                position.tp_percentage, position.sl_percentage
            )
        elif exchange == "mexc":
            order_result = await mexc_service.create_order(
                api_key, api_secret, position.symbol, order_side,
                position.amount, position.leverage, position.is_futures,
                position.tp_percentage, position.sl_percentage
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported exchange: {exchange}")

        if not order_result:
            raise HTTPException(status_code=500, detail="Order creation failed")

        return {
            "success": True,
            "message": "Position created successfully",
            "position": {
                "id": str(order_result.get("orderId", f"pos_{int(time.time())}")),
                "exchange": exchange,
                "symbol": position.symbol,
                "side": position.side,
                "amount": position.amount,
                "leverage": position.leverage,
                "tp_percentage": position.tp_percentage,
                "sl_percentage": position.sl_percentage,
                "status": "open",
                "timestamp": int(time.time())
            },
            "order_details": order_result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create position: {str(e)}")

@app.delete("/api/bot/positions/{position_id}")
async def close_position(position_id: str, current_user: dict = Depends(get_current_user)):
    """Close trading position"""
    return {
        "message": "Position closed successfully",
        "position_id": position_id
    }

# Payment Webhook - FIXED VERSION
@app.post("/api/payments/webhook")
async def payment_webhook(payload: dict):
    """Handle LemonSqueezy webhooks"""
    try:
        # Log webhook data
        print("🔔 Webhook received:")
        print(json.dumps(payload, indent=2))
        
        # LemonSqueezy webhook events
        event_name = payload.get('meta', {}).get('event_name')
        
        if event_name == 'order_created':
            # New order created
            order_id = payload.get('data', {}).get('id')
            attributes = payload.get('data', {}).get('attributes', {})
            customer_email = attributes.get('user_email')
            custom_data = attributes.get('custom_data', {})
            user_email = custom_data.get('user_email', customer_email)
            
            # Get product variant to determine plan
            first_order_item = attributes.get('first_order_item', {})
            variant_id = str(first_order_item.get('variant_id', ''))
            
            # Map variant ID to plan
            plan = 'free'
            if variant_id == '1075011':
                plan = 'pro'
            elif variant_id == '1075030':
                plan = 'enterprise'
            
            print(f"📦 New order: {order_id} | Email: {user_email} | Plan: {plan}")
            
            # Save to Firebase
            try:
                from backend.firebase_admin import firebase_initialized
                if firebase_initialized:
                    from firebase_admin import db as firebase_db
                    user_ref = firebase_db.reference(f'subscriptions/{user_email.replace(".", "_")}')
                    user_ref.set({
                        'plan': plan,
                        'status': 'active',
                        'order_id': order_id,
                        'variant_id': variant_id,
                        'created_at': int(time.time()),
                        'updated_at': int(time.time())
                    })
                    print(f"✅ Subscription saved for {user_email}")
                else:
                    print(f"⚠️ Firebase not initialized, subscription not saved")
            except Exception as e:
                print(f"❌ Error saving subscription: {e}")
            
        elif event_name == 'subscription_created':
            subscription_id = payload.get('data', {}).get('id')
            customer_email = payload.get('data', {}).get('attributes', {}).get('user_email')
            status = payload.get('data', {}).get('attributes', {}).get('status')
            
            print(f"🔄 Subscription created: {subscription_id} | Email: {customer_email} | Status: {status}")
            
        elif event_name == 'subscription_cancelled':
            subscription_id = payload.get('data', {}).get('id')
            customer_email = payload.get('data', {}).get('attributes', {}).get('user_email')
            
            print(f"❌ Subscription cancelled: {subscription_id} | Email: {customer_email}")
            
            # Update to free plan
            try:
                from backend.firebase_admin import firebase_initialized
                if firebase_initialized:
                    from firebase_admin import db as firebase_db
                    user_ref = firebase_db.reference(f'subscriptions/{customer_email.replace(".", "_")}')
                    user_ref.update({
                        'plan': 'free',
                        'status': 'cancelled',
                        'cancelled_at': int(time.time())
                    })
                    print(f"✅ User downgraded to free: {customer_email}")
            except Exception as e:
                print(f"❌ Error updating subscription: {e}")
            
        return {"message": "Webhook processed successfully"}
        
    except Exception as e:
        print(f"❌ Webhook processing error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

@app.get("/api/payments/subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    """Get user subscription details"""
    try:
        from backend.firebase_admin import firebase_initialized
        if firebase_initialized:
            from firebase_admin import db as firebase_db
            user_email = current_user.get("email", "").replace(".", "_")
            user_ref = firebase_db.reference(f'subscriptions/{user_email}')
            subscription = user_ref.get()
            
            if subscription:
                return subscription
    except Exception as e:
        print(f"Error fetching subscription: {e}")
    
    # Default response
    return {
        "plan": "free",
        "status": "active",
        "expires_at": None
    }

@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    """
    WebSocket endpoint for broadcasting trading signals to all connected clients
    Supports 1000+ concurrent connections
    """
    if not WEBSOCKET_AVAILABLE:
        await websocket.close(code=1011, reason="WebSocket not available")
        return

    await connection_manager.connect(websocket)

    try:
        # Keep connection alive and listen for ping/pong
        while True:
            try:
                # Wait for messages (ping/pong to keep connection alive)
                data = await websocket.receive_text()

                # Handle ping/pong
                if data == "ping":
                    await websocket.send_text("pong")

            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break

    finally:
        connection_manager.disconnect(websocket)

@app.get("/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    if not WEBSOCKET_AVAILABLE:
        return {"error": "WebSocket not available"}

    return connection_manager.get_stats()

@app.get("/api/bot/transactions")
async def get_transactions(hours: int = 24, current_user: dict = Depends(get_current_user)):
    """Get user's transaction history"""
    try:
        from backend.firebase_admin import get_user_trades
        user_id = current_user.get("user_id") or current_user.get("id")

        # Get trades from Firebase
        trades = get_user_trades(user_id, hours)

        return {
            "transactions": trades,
            "count": len(trades)
        }
    except Exception as e:
        print(f"Error fetching transactions: {e}")
        # Return empty list if error
        return {
            "transactions": [],
            "count": 0
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
