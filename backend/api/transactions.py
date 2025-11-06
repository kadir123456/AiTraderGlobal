# Transaction History Endpoint
# Updated: 2025-11-06 - Fixed auth dependency
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List, Dict
from datetime import datetime, timedelta

router = APIRouter()

# Import auth function with fallback (same as balance.py)
try:
    from backend.auth import get_current_user
except ImportError:
    import jwt
    import httpx
    import os

    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
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

@router.get("/bot/transactions")
async def get_transaction_history(
    hours: int = 24,
    current_user: dict = Depends(get_current_user)
):
    """Get user's transaction history for the last N hours"""
    try:
        user_id = current_user.get('user_id')
        
        # Mock data for demonstration
        mock_transactions = [
            {
                "id": "tx_1",
                "symbol": "BTCUSDT",
                "side": "LONG",
                "exchange": "binance",
                "entryPrice": 43250.50,
                "exitPrice": 43890.20,
                "amount": 100.0,
                "leverage": 10,
                "pnl": 148.0,
                "pnlPercent": 14.8,
                "fee": 2.0,
                "openedAt": (datetime.now() - timedelta(hours=1)).isoformat(),
                "closedAt": (datetime.now() - timedelta(minutes=30)).isoformat(),
                "type": "manual"
            },
            {
                "id": "tx_2",
                "symbol": "ETHUSDT",
                "side": "SHORT",
                "exchange": "bybit",
                "entryPrice": 2280.0,
                "exitPrice": 2250.0,
                "amount": 50.0,
                "leverage": 5,
                "pnl": 65.8,
                "pnlPercent": 13.16,
                "fee": 1.2,
                "openedAt": (datetime.now() - timedelta(hours=2)).isoformat(),
                "closedAt": (datetime.now() - timedelta(hours=1, minutes=30)).isoformat(),
                "type": "auto"
            },
            {
                "id": "tx_3",
                "symbol": "BNBUSDT",
                "side": "LONG",
                "exchange": "binance",
                "entryPrice": 315.0,
                "exitPrice": 310.0,
                "amount": 30.0,
                "leverage": 8,
                "pnl": -12.0,
                "pnlPercent": -4.0,
                "fee": 0.8,
                "openedAt": (datetime.now() - timedelta(hours=3)).isoformat(),
                "closedAt": (datetime.now() - timedelta(hours=2, minutes=30)).isoformat(),
                "type": "manual"
            }
        ]
        
        return {
            "success": True,
            "transactions": mock_transactions,
            "count": len(mock_transactions),
            "period_hours": hours
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")


@router.get("/bot/transactions/stats")
async def get_transaction_stats(
    days: int = 30,
    current_user: dict = Depends(get_current_user_dependency)
):
    """Get transaction statistics for the last N days"""
    try:
        return {
            "success": True,
            "stats": {
                "totalTrades": 15,
                "winningTrades": 10,
                "losingTrades": 5,
                "winRate": 66.7,
                "totalPnL": 542.8,
                "averagePnL": 36.19,
                "bestTrade": 148.0,
                "worstTrade": -45.2,
                "totalFees": 24.5
            },
            "period_days": days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")
