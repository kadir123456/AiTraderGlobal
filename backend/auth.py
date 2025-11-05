"""
Authentication and Authorization Module
Handles JWT and Firebase token verification
"""
from fastapi import HTTPException, Header
import jwt
from datetime import datetime, timedelta
import httpx
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyDqAsiITYyPK9bTuGGz7aVBkZ7oLB2Kt3U")

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
    """
    Verify Firebase ID token by calling Google Identity Toolkit.
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
        return {
            "user_id": u.get("localId"),
            "email": u.get("email"),
            "firebase_uid": u.get("localId")
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Firebase token verification error: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to verify Firebase token")

async def get_current_user(authorization: str = Header(None)):
    """
    Dependency to get current authenticated user.
    Supports both local JWT and Firebase ID token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")

    # Try local JWT first
    try:
        return verify_jwt_token(token)
    except HTTPException:
        # Fallback to Firebase ID token
        return await verify_firebase_token_with_identitytoolkit(token)

async def get_user_plan(user_id: str) -> str:
    """
    Get user's subscription plan from database/Firebase.
    Returns: 'free', 'pro', or 'premium'
    
    TODO: Implement database lookup
    For now returns 'free' as default
    """
    # TODO: Query Firebase Realtime Database or PostgreSQL for user plan
    # Example Firebase path: /user_subscriptions/{user_id}/plan
    
    return "free"  # Default plan

def check_plan_limits(plan: str, current_positions: int) -> dict:
    """
    Check if user can open more positions based on their plan
    
    Returns: {
        "can_open": bool,
        "max_positions": int,
        "message": str
    }
    """
    plan_limits = {
        "free": 1,
        "pro": 10,
        "premium": 50
    }
    
    max_positions = plan_limits.get(plan, 1)
    can_open = current_positions < max_positions
    
    return {
        "can_open": can_open,
        "max_positions": max_positions,
        "current_positions": current_positions,
        "message": f"Your {plan.upper()} plan allows {max_positions} open position(s). Currently: {current_positions}"
    }
