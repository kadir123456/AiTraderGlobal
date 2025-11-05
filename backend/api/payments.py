"""
LemonSqueezy Payment Integration
Handles subscription webhooks and plan management
"""
from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional
import hmac
import hashlib
import os
import logging

from backend.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

LEMONSQUEEZY_WEBHOOK_SECRET = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "")

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
    """Get user's current subscription"""
    try:
        user_id = current_user.get("user_id")
        
        # TODO: Fetch from database
        # For now, check Firebase or return default
        from backend.auth import get_user_plan
        plan = await get_user_plan(user_id)
        
        return {
            "plan": plan,
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
        
        # TODO: Update user plan in database
        # await db.update_user_plan(user_email, plan)
        
        # TODO: Send welcome email
        
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
        
        # TODO: Update database
        
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
        
        # TODO: Update database
        
    except Exception as e:
        logger.error(f"Error handling subscription_updated: {str(e)}")

async def handle_subscription_cancelled(payload: dict):
    """Handle subscription cancellation"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        
        logger.info(f"❌ Subscription cancelled: {user_email}")
        
        # TODO: Downgrade to free plan (but keep until expiration)
        
    except Exception as e:
        logger.error(f"Error handling subscription_cancelled: {str(e)}")

async def handle_subscription_expired(payload: dict):
    """Handle subscription expiration"""
    try:
        data = payload.get("data", {})
        attributes = data.get("attributes", {})
        
        user_email = attributes.get("user_email")
        
        logger.info(f"⏰ Subscription expired: {user_email}")
        
        # TODO: Downgrade to free plan immediately
        # await db.update_user_plan_by_email(user_email, "free")
        
    except Exception as e:
        logger.error(f"Error handling subscription_expired: {str(e)}")

def get_plan_from_variant(variant_id: str) -> str:
    """
    Map LemonSqueezy variant ID to plan name
    
    TODO: Replace with your actual variant IDs from LemonSqueezy
    """
    variant_map = {
        # Example IDs - replace with real ones
        "123456": "pro",      # Pro Monthly
        "123457": "pro",      # Pro Yearly
        "123458": "premium",  # Premium Monthly
        "123459": "premium",  # Premium Yearly
    }
    
    return variant_map.get(str(variant_id), "free")
