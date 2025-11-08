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

LEMONSQUEEZY_WEBHOOK_SECRET = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL")

class CheckoutSession(BaseModel):
    variant_id: str
    email: str
    custom_data: Optional[dict] = None

class SubscriptionInfo(BaseModel):
    plan: str
    status: str
    valid_until: Optional[str] = None

@router.get("/subscription")
async def get_subscription(current_user = Depends(get_current_user)):
    """Get user's current subscription from Firebase"""
    try:
        user_id = current_user.get("user_id")
        
        # Fetch from Firebase: user_subscriptions/{user_id}
        ref = db.reference(f'user_subscriptions/{user_id}', url=FIREBASE_DATABASE_URL)
        subscription = ref.get()
        
        if subscription and isinstance(subscription, dict):
            return {
                "plan": subscription.get("tier", "free"),
                "status": subscription.get("status", "active"),
                "valid_until": subscription.get("endDate"),
                "startDate": subscription.get("startDate")
            }
        
        return {
            "plan": "free",
            "status": "active",
            "valid_until": None
        }
        
    except Exception as e:
        logger.error(f"Failed to get subscription: {str(e)}")
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
    - order_created: New subscription
    - subscription_created: Recurring subscription
    - subscription_updated: Plan change
    - subscription_cancelled: Cancellation
    - subscription_expired: Expiration
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
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse payload
        import json
        payload = json.loads(body)
        
        event_name = payload.get("meta", {}).get("event_name")
        logger.info(f"📦 LemonSqueezy webhook: {event_name}")
        
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
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def update_user_subscription(user_id: str, tier: str, status: str):
    """Update user subscription in Firebase"""
    try:
        ref = db.reference(f'user_subscriptions/{user_id}', url=FIREBASE_DATABASE_URL)
        
        subscription_data = {
            "tier": tier,
            "status": status,
            "startDate": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }
        
        ref.set(subscription_data)
        logger.info(f"✅ Updated subscription for {user_id}: {tier} ({status})")
        
    except Exception as e:
        logger.error(f"❌ Failed to update subscription: {str(e)}")
        raise

async def get_user_id_by_email(email: str) -> Optional[str]:
    """Get user ID from Firebase by email"""
    try:
        # Search in users collection
        users_ref = db.reference('users', url=FIREBASE_DATABASE_URL)
        users = users_ref.get()
        
        if users:
            for user_id, user_data in users.items():
                if user_data.get('email') == email:
                    return user_id
        
        logger.warning(f"⚠️ User not found with email: {email}")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error finding user by email: {str(e)}")
        return None

async def handle_order_created(payload: dict):
    """Handle new order/subscription"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        variant_id = attributes.get("first_order_item", {}).get("variant_id")
        
        # Determine plan based on variant_id
        plan = get_plan_from_variant(variant_id)
        
        logger.info(f"✅ New subscription: {user_email} -> {plan}")
        
        # Get user ID from email
        user_id = await get_user_id_by_email(user_email)
        
        if user_id:
            await update_user_subscription(user_id, plan, "active")
        else:
            logger.error(f"❌ Could not find user ID for email: {user_email}")
        
    except Exception as e:
        logger.error(f"Error handling order_created: {str(e)}")

async def handle_subscription_created(payload: dict):
    """Handle recurring subscription creation"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        variant_id = attributes.get("variant_id")
        status = attributes.get("status")
        
        plan = get_plan_from_variant(variant_id)
        
        logger.info(f"🔄 Subscription created: {user_email} -> {plan} ({status})")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            await update_user_subscription(user_id, plan, status)
        
    except Exception as e:
        logger.error(f"Error handling subscription_created: {str(e)}")

async def handle_subscription_updated(payload: dict):
    """Handle subscription update (plan change, renewal)"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        variant_id = attributes.get("variant_id")
        status = attributes.get("status")
        
        plan = get_plan_from_variant(variant_id)
        
        logger.info(f"📝 Subscription updated: {user_email} -> {plan} ({status})")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            await update_user_subscription(user_id, plan, status)
        
    except Exception as e:
        logger.error(f"Error handling subscription_updated: {str(e)}")

async def handle_subscription_cancelled(payload: dict):
    """Handle subscription cancellation"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        
        logger.info(f"❌ Subscription cancelled: {user_email}")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            # Keep current plan but mark as cancelled
            ref = db.reference(f'user_subscriptions/{user_id}', url=FIREBASE_DATABASE_URL)
            current = ref.get()
            if current:
                ref.update({"status": "cancelled"})
        
    except Exception as e:
        logger.error(f"Error handling subscription_cancelled: {str(e)}")

async def handle_subscription_expired(payload: dict):
    """Handle subscription expiration"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        
        logger.info(f"⏰ Subscription expired: {user_email}")
        
        user_id = await get_user_id_by_email(user_email)
        if user_id:
            # Downgrade to free immediately
            await update_user_subscription(user_id, "free", "expired")
        
    except Exception as e:
        logger.error(f"Error handling subscription_expired: {str(e)}")

def get_plan_from_variant(variant_id: str) -> str:
    """Map LemonSqueezy variant ID to plan name"""
    variant_map = {
        "1075011": "pro",        # Pro Monthly (999 TRY / 29.99 USD)
        "1075030": "enterprise",  # Enterprise Monthly (3499 TRY / 99.99 USD)
    }
    
    return variant_map.get(str(variant_id), "free")