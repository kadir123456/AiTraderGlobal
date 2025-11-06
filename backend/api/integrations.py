"""
Exchange Integration Health Check API
Provides health status for all exchange connections
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime
import asyncio
import logging

from backend.auth import get_current_user
from backend.firebase_admin import get_user_api_keys, get_all_user_exchanges

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/integrations", tags=["integrations"])


async def check_exchange_health(
    exchange: str,
    api_key: str,
    api_secret: str,
    passphrase: str = ""
) -> Dict:
    """
    Check health of a single exchange connection
    Returns: {exchange, connected, last_ping, error}
    """
    result = {
        "exchange": exchange,
        "connected": False,
        "last_ping": None,
        "error": None,
        "response_time_ms": None
    }

    try:
        start_time = datetime.utcnow()

        if exchange == "binance":
            from backend.services import binance_service
            # Try to fetch server time (lightweight endpoint)
            await binance_service.get_balance(api_key, api_secret, is_futures=True)

        elif exchange == "bybit":
            from backend.services import bybit_service
            await bybit_service.get_balance(api_key, api_secret, is_futures=True)

        elif exchange == "okx":
            from backend.services import okx_service
            await okx_service.get_balance(api_key, api_secret, is_futures=True, passphrase=passphrase)

        elif exchange == "kucoin":
            from backend.services import kucoin_service
            await kucoin_service.get_balance(api_key, api_secret, is_futures=True, passphrase=passphrase)

        elif exchange == "mexc":
            from backend.services import mexc_service
            await mexc_service.get_balance(api_key, api_secret, is_futures=True)

        else:
            result["error"] = f"Exchange {exchange} not supported"
            return result

        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds() * 1000

        result["connected"] = True
        result["last_ping"] = datetime.utcnow().isoformat()
        result["response_time_ms"] = round(response_time, 2)

    except Exception as e:
        logger.error(f"Health check failed for {exchange}: {str(e)}")
        result["error"] = str(e)
        result["last_ping"] = datetime.utcnow().isoformat()

    return result


@router.get("/health")
async def get_integrations_health(current_user: dict = Depends(get_current_user)):
    """
    Get health status for all user's connected exchanges

    Returns:
    {
        "timestamp": "2025-11-06T...",
        "user_id": "...",
        "exchanges": [
            {
                "exchange": "binance",
                "connected": true,
                "last_ping": "2025-11-06T...",
                "error": null,
                "response_time_ms": 234
            },
            ...
        ],
        "summary": {
            "total": 5,
            "connected": 4,
            "failed": 1
        }
    }
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("id")

        # Get all user's exchanges from Firebase
        user_exchanges = get_all_user_exchanges(user_id)

        if not user_exchanges:
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "exchanges": [],
                "summary": {
                    "total": 0,
                    "connected": 0,
                    "failed": 0
                },
                "message": "No exchanges configured. Please add API keys in Settings."
            }

        # Check health for each exchange in parallel
        health_checks = []
        for exchange_data in user_exchanges:
            exchange_name = exchange_data["id"]

            # Get API keys from Firebase
            api_keys = get_user_api_keys(user_id, exchange_name)

            if api_keys:
                health_checks.append(
                    check_exchange_health(
                        exchange_name,
                        api_keys.get("api_key", ""),
                        api_keys.get("api_secret", ""),
                        api_keys.get("passphrase", "")
                    )
                )

        # Execute all health checks concurrently
        results = await asyncio.gather(*health_checks, return_exceptions=True)

        # Process results
        exchange_statuses = []
        connected_count = 0
        failed_count = 0

        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Health check exception: {result}")
                failed_count += 1
            elif isinstance(result, dict):
                exchange_statuses.append(result)
                if result.get("connected"):
                    connected_count += 1
                else:
                    failed_count += 1

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "exchanges": exchange_statuses,
            "summary": {
                "total": len(exchange_statuses),
                "connected": connected_count,
                "failed": failed_count
            }
        }

    except Exception as e:
        logger.error(f"Error in integrations health check: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check integrations health: {str(e)}"
        )


@router.get("/health/{exchange}")
async def get_single_exchange_health(
    exchange: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get health status for a specific exchange
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("id")
        exchange = exchange.lower()

        # Get API keys from Firebase
        api_keys = get_user_api_keys(user_id, exchange)

        if not api_keys:
            raise HTTPException(
                status_code=404,
                detail=f"API keys not configured for {exchange}"
            )

        # Check health
        result = await check_exchange_health(
            exchange,
            api_keys.get("api_key", ""),
            api_keys.get("api_secret", ""),
            api_keys.get("passphrase", "")
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking {exchange} health: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check {exchange} health: {str(e)}"
        )


@router.post("/test-connection")
async def test_exchange_connection(
    exchange: str,
    api_key: str,
    api_secret: str,
    passphrase: str = ""
):
    """
    Test exchange connection without saving (for setup/validation)
    Public endpoint for testing before adding keys
    """
    try:
        exchange = exchange.lower()

        result = await check_exchange_health(
            exchange,
            api_key,
            api_secret,
            passphrase
        )

        return result

    except Exception as e:
        logger.error(f"Error testing {exchange} connection: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test connection: {str(e)}"
        )
