"""
Unified Exchange Service
Provides a consistent interface for all exchange operations with:
- Retry logic with exponential backoff
- Rate limiting
- Error normalization
- Logging
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Callable
from datetime import datetime
from functools import wraps

logger = logging.getLogger(__name__)


class ExchangeError(Exception):
    """Base exception for exchange errors"""
    def __init__(self, exchange: str, message: str, original_error: Optional[Exception] = None):
        self.exchange = exchange
        self.message = message
        self.original_error = original_error
        super().__init__(f"[{exchange.upper()}] {message}")


class RateLimitError(ExchangeError):
    """Rate limit exceeded"""
    pass


class AuthenticationError(ExchangeError):
    """Invalid API credentials"""
    pass


class InsufficientBalanceError(ExchangeError):
    """Insufficient balance for operation"""
    pass


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    exponential_base: float = 2.0,
    max_delay: float = 60.0
):
    """
    Decorator for retrying async functions with exponential backoff
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    error_msg = str(e).lower()

                    # Don't retry on authentication errors
                    if any(x in error_msg for x in ['invalid', 'unauthorized', 'forbidden', 'api key']):
                        raise AuthenticationError(
                            exchange=args[0] if args else "unknown",
                            message=f"Authentication failed: {str(e)}",
                            original_error=e
                        )

                    # Check if it's a rate limit error
                    is_rate_limit = any(x in error_msg for x in ['429', 'rate limit', 'too many requests'])

                    if attempt < max_retries:
                        wait_time = min(delay, max_delay)
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}. "
                            f"Retrying in {wait_time:.2f}s..."
                        )
                        await asyncio.sleep(wait_time)
                        delay *= exponential_base
                    else:
                        if is_rate_limit:
                            raise RateLimitError(
                                exchange=args[0] if args else "unknown",
                                message=f"Rate limit exceeded after {max_retries} retries",
                                original_error=e
                            )
                        raise ExchangeError(
                            exchange=args[0] if args else "unknown",
                            message=f"Operation failed after {max_retries} retries: {str(e)}",
                            original_error=e
                        )

            raise last_exception

        return wrapper
    return decorator


class UnifiedExchangeService:
    """Unified interface for all exchange operations"""

    def __init__(self):
        self._last_request_time: Dict[str, float] = {}
        self._min_request_interval = 0.1  # 100ms between requests

    async def _rate_limit(self, exchange: str):
        """Apply rate limiting between requests"""
        now = time.time()
        last_time = self._last_request_time.get(exchange, 0)
        time_since_last = now - last_time

        if time_since_last < self._min_request_interval:
            await asyncio.sleep(self._min_request_interval - time_since_last)

        self._last_request_time[exchange] = time.time()

    @retry_with_backoff(max_retries=3)
    async def get_balance(
        self,
        exchange: str,
        api_key: str,
        api_secret: str,
        is_futures: bool = True,
        passphrase: str = ""
    ) -> Dict:
        """
        Get account balance with unified response format

        Returns:
        {
            "exchange": str,
            "type": "futures" | "spot",
            "currency": "USDT",
            "total": float,
            "available": float,
            "locked": float,
            "timestamp": str (ISO)
        }
        """
        await self._rate_limit(exchange)

        try:
            exchange = exchange.lower()
            logger.info(f"Fetching balance from {exchange} ({['spot', 'futures'][is_futures]})")

            if exchange == "binance":
                from backend.services import binance_service
                result = await binance_service.get_balance(api_key, api_secret, is_futures)

            elif exchange == "bybit":
                from backend.services import bybit_service
                result = await bybit_service.get_balance(api_key, api_secret, is_futures)

            elif exchange == "okx":
                from backend.services import okx_service
                result = await okx_service.get_balance(api_key, api_secret, is_futures, passphrase)

            elif exchange == "kucoin":
                from backend.services import kucoin_service
                result = await kucoin_service.get_balance(api_key, api_secret, is_futures, passphrase)

            elif exchange == "mexc":
                from backend.services import mexc_service
                result = await mexc_service.get_balance(api_key, api_secret, is_futures)

            else:
                raise ExchangeError(exchange, f"Unsupported exchange: {exchange}")

            # Normalize response
            normalized = {
                "exchange": exchange,
                "type": "futures" if is_futures else "spot",
                "currency": result.get("currency", "USDT"),
                "total": float(result.get("total", 0)),
                "available": float(result.get("available", 0)),
                "locked": float(result.get("total", 0)) - float(result.get("available", 0)),
                "timestamp": datetime.utcnow().isoformat()
            }

            logger.info(
                f"Balance fetched from {exchange}: "
                f"{normalized['available']:.2f} {normalized['currency']} available"
            )

            return normalized

        except ExchangeError:
            raise
        except Exception as e:
            exchange_name = exchange if isinstance(exchange, str) else "unknown"
            logger.error(f"Balance fetch failed for {exchange_name}: {str(e)}")
            raise ExchangeError(exchange_name, f"Failed to fetch balance: {str(e)}", e)

    @retry_with_backoff(max_retries=3)
    async def get_current_price(
        self,
        exchange: str,
        symbol: str,
        api_key: str = "",
        api_secret: str = "",
        is_futures: bool = True,
        passphrase: str = ""
    ) -> Dict:
        """
        Get current market price

        Returns:
        {
            "exchange": str,
            "symbol": str,
            "price": float,
            "timestamp": str (ISO)
        }
        """
        await self._rate_limit(exchange)

        try:
            exchange = exchange.lower()

            if exchange == "binance":
                from backend.services import binance_service
                price = await binance_service.get_current_price(api_key, api_secret, symbol, is_futures)

            elif exchange == "bybit":
                from backend.services import bybit_service
                price = await bybit_service.get_current_price(api_key, api_secret, symbol, is_futures)

            elif exchange == "okx":
                from backend.services import okx_service
                price = await okx_service.get_current_price(api_key, api_secret, symbol, is_futures, passphrase)

            elif exchange == "kucoin":
                from backend.services import kucoin_service
                price = await kucoin_service.get_current_price(api_key, api_secret, symbol, is_futures, passphrase)

            elif exchange == "mexc":
                from backend.services import mexc_service
                price = await mexc_service.get_current_price(api_key, api_secret, symbol, is_futures)

            else:
                raise ExchangeError(exchange, f"Unsupported exchange: {exchange}")

            return {
                "exchange": exchange,
                "symbol": symbol,
                "price": float(price),
                "timestamp": datetime.utcnow().isoformat()
            }

        except ExchangeError:
            raise
        except Exception as e:
            logger.error(f"Price fetch failed for {exchange} {symbol}: {str(e)}")
            raise ExchangeError(exchange, f"Failed to fetch price for {symbol}: {str(e)}", e)

    @retry_with_backoff(max_retries=2)
    async def get_positions(
        self,
        exchange: str,
        api_key: str,
        api_secret: str,
        is_futures: bool = True,
        passphrase: str = ""
    ) -> List[Dict]:
        """
        Get open positions with unified format

        Returns list of:
        {
            "exchange": str,
            "symbol": str,
            "side": "LONG" | "SHORT",
            "amount": float,
            "entry_price": float,
            "current_price": float,
            "unrealized_pnl": float,
            "leverage": int,
            "timestamp": str (ISO)
        }
        """
        await self._rate_limit(exchange)

        try:
            exchange = exchange.lower()

            if exchange == "binance":
                from backend.services import binance_service
                positions = await binance_service.get_positions(api_key, api_secret, is_futures)

            elif exchange == "bybit":
                from backend.services import bybit_service
                positions = await bybit_service.get_positions(api_key, api_secret, is_futures)

            elif exchange == "okx":
                from backend.services import okx_service
                positions = await okx_service.get_positions(api_key, api_secret, is_futures, passphrase)

            elif exchange == "kucoin":
                from backend.services import kucoin_service
                positions = await kucoin_service.get_positions(api_key, api_secret, is_futures, passphrase)

            elif exchange == "mexc":
                from backend.services import mexc_service
                positions = await mexc_service.get_positions(api_key, api_secret, is_futures)

            else:
                raise ExchangeError(exchange, f"Unsupported exchange: {exchange}")

            # Normalize positions
            normalized = []
            for pos in positions:
                normalized.append({
                    "exchange": exchange,
                    "symbol": pos.get("symbol"),
                    "side": pos.get("side"),
                    "amount": float(pos.get("amount", 0)),
                    "entry_price": float(pos.get("entry_price", 0)),
                    "current_price": float(pos.get("current_price", 0)),
                    "unrealized_pnl": float(pos.get("unrealized_pnl", 0)),
                    "leverage": int(pos.get("leverage", 1)),
                    "timestamp": datetime.utcnow().isoformat()
                })

            logger.info(f"Fetched {len(normalized)} open positions from {exchange}")
            return normalized

        except ExchangeError:
            raise
        except Exception as e:
            logger.error(f"Positions fetch failed for {exchange}: {str(e)}")
            raise ExchangeError(exchange, f"Failed to fetch positions: {str(e)}", e)


# Singleton instance
unified_exchange = UnifiedExchangeService()
