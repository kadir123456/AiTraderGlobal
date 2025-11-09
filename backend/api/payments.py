"""
LemonSqueezy Payment Integration
Handles subscription webhooks and plan management
"""
from fastapi import APIRouter, HTTPException, Header, Request, Depends
from pydantic import BaseModel
from typing import Optional
import hmac
import hashlib
import os
import logging
from datetime import datetime

from backend.auth import get_current_user
from firebase_admin import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

LEMONSQUEEZY_WEBHOOK_SECRET = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "P2mF4tQx9zGj1cYh7vBn8kLp5rDs6wE3")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL")

# ✅ Variant ID Mapping (Update when going LIVE)
VARIANT_MAP = {
    "1075011": "pro",        # EMA Navigator - Pro (TRY999.99/month)
    "1075030": "enterprise",  # EMA Navigator - Enterprise (TRY12,000/month)
}

class SubscriptionInfo(BaseModel):
    plan: str
    status: str
    valid_until: Optional[str] = None

@router.get("/subscription")
async def get_subscription(current_user = Depends(get_current_user)):
    """Get user's current subscription"""
    try:
        user_id = current_user.get("user_id")
        
        ref = db.reference(f'user_subscriptions/{user_id}', url=FIREBASE_DATABASE_URL)
        subscription = ref.get()
        
        if subscription and isinstance(subscription, dict):
            return {
                "plan": subscription.get("tier", "free"),
                "status": subscription.get("status", "active"),
                "valid_until": subscription.get("endDate"),
                "startDate": subscription.get("startDate"),
                "updatedAt": subscription.get("updatedAt")
            }
        
        return {
            "plan": "free",
            "status": "active",
            "valid_until": None
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get subscription: {str(e)}")
        return {
            "plan": "free",
            "status": "active",
            "valid_until": None
        }

@router.post("/webhook")
async def lemonsqueezy_webhook(request: Request):
    """
    Handle LemonSqueezy webhooks
    
    Events:
    - order_created
    - subscription_created
    - subscription_updated
    - subscription_cancelled
    - subscription_expired
    """
    try:
        # Get raw body
        body = await request.body()
        signature = request.headers.get("X-Signature", "")
        
        # Verify signature
        if LEMONSQUEEZY_WEBHOOK_SECRET:
            expected_signature = hmac.new(
                LEMONSQUEEZY_WEBHOOK_SECRET.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.error(f"❌ Invalid signature: {signature}")
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse payload
        import json
        payload = json.loads(body)
        
        event_name = payload.get("meta", {}).get("event_name")
        logger.info(f"📦 LemonSqueezy webhook: {event_name}")
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        
        if event_name == "order_created":
            await handle_order_created(payload)
        elif event_name == "subscription_created":
            await handle_subscription_created(payload)
        elif event_name == "subscription_updated":
            await handle_subscription_updated(payload)
        elif event_name == "subscription_cancelled":
            await handle_subscription_cancelled(payload)
        elif event_name == "subscription_expired":
            await handle_subscription_expired(payload)
        else:
            logger.warning(f"⚠️ Unhandled event: {event_name}")
        
        return {"status": "success", "event": event_name}
        
    except Exception as e:
        logger.error(f"❌ Webhook error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def update_user_subscription(user_id: str, tier: str, status: str, ends_at: str = None):
    """Update user subscription in Firebase"""
    try:
        ref = db.reference(f'user_subscriptions/{user_id}', url=FIREBASE_DATABASE_URL)
        
        subscription_data = {
            "tier": tier,
            "status": status,
            "startDate": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }
        
        if ends_at:
            subscription_data["endDate"] = ends_at
        
        ref.set(subscription_data)
        logger.info(f"✅ Updated subscription: {user_id} → {tier} ({status})")
        
    except Exception as e:
        logger.error(f"❌ Failed to update subscription: {str(e)}")
        raise

async def get_user_id_by_email(email: str) -> Optional[str]:
    """Get user ID from Firebase by email"""
    try:
        users_ref = db.reference('users', url=FIREBASE_DATABASE_URL)
        users = users_ref.get()
        
        if users:
            for user_id, user_data in users.items():
                if user_data.get('email') == email:
                    logger.info(f"✅ Found user: {email} → {user_id}")
                    return user_id
        
        logger.warning(f"⚠️ User not found: {email}")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error finding user: {str(e)}")
        return None

async def handle_order_created(payload: dict):
    """Handle new order"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        variant_id = str(attributes.get("first_order_item", {}).get("variant_id", ""))
        
        plan = VARIANT_MAP.get(variant_id, "free")
        
        logger.info(f"✅ Order created: {user_email} → {plan} (variant: {variant_id})")
        
        user_id = await get_user_id_by_email(user_email)
        
        if user_id:
            await update_user_subscription(user_id, plan, "active")
        else:
            logger.error(f"❌ User not found: {user_email}")
        
    except Exception as e:
        logger.error(f"❌ Error in order_created: {str(e)}", exc_info=True)

async def handle_subscription_created(payload: dict):
    """Handle subscription creation"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        variant_id = str(attributes.get("variant_id", ""))
        status = attributes.get("status", "active")
        ends_at = attributes.get("ends_at")
        
        plan = VARIANT_MAP.get(variant_id, "free")
        
        logger.info(f"🔄 Subscription created: {user_email} → {plan} ({status})")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            await update_user_subscription(user_id, plan, status, ends_at)
        
    except Exception as e:
        logger.error(f"❌ Error in subscription_created: {str(e)}", exc_info=True)

async def handle_subscription_updated(payload: dict):
    """Handle subscription update"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        variant_id = str(attributes.get("variant_id", ""))
        status = attributes.get("status", "active")
        ends_at = attributes.get("ends_at")
        
        plan = VARIANT_MAP.get(variant_id, "free")
        
        logger.info(f"📝 Subscription updated: {user_email} → {plan} ({status})")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            await update_user_subscription(user_id, plan, status, ends_at)
        
    except Exception as e:
        logger.error(f"❌ Error in subscription_updated: {str(e)}", exc_info=True)

async def handle_subscription_cancelled(payload: dict):
    """Handle subscription cancellation"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        ends_at = attributes.get("ends_at")
        
        logger.info(f"❌ Subscription cancelled: {user_email}")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            ref = db.reference(f'user_subscriptions/{user_id}', url=FIREBASE_DATABASE_URL)
            current = ref.get()
            if current:
                ref.update({
                    "status": "cancelled",
                    "endDate": ends_at,
                    "updatedAt": datetime.utcnow().isoformat()
                })
        
    except Exception as e:
        logger.error(f"❌ Error in subscription_cancelled: {str(e)}", exc_info=True)

async def handle_subscription_expired(payload: dict):
    """Handle subscription expiration"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        
        logger.info(f"⏰ Subscription expired: {user_email}")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            await update_user_subscription(user_id, "free", "expired")
        
    except Exception as e:
        logger.error(f"❌ Error in subscription_expired: {str(e)}", exc_info=True)