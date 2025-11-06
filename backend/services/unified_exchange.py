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
from typing import Dict, List, Optional, Callable, Union # Union eklendi
from datetime import datetime
from functools import wraps

logger = logging.getLogger(__name__)


class ExchangeError(Exception):
    """Base exception for exchange errors"""
    # DÜZELTME: exchange için Union[str, object] kullanıldı ve içeride güvenli kontrol eklendi.
    # Bu, decoratorden yanlışlıkla 'self' nesnesinin geçirilmesi durumunda çökmeyi önler.
    def __init__(self, exchange: Union[str, object], message: str, original_error: Optional[Exception] = None):
        # Borsa adının string olduğundan emin olun, aksi takdirde "UNKNOWN" olarak ayarlanır.
        exchange_name = str(exchange).lower() if isinstance(exchange, str) else "UNKNOWN"
        
        self.exchange = exchange_name
        self.message = message
        self.original_error = original_error
        
        # self.exchange'i (artık güvenli bir string) kullanarak mesajı oluşturun
        super().__init__(f"[{self.exchange.upper()}] {message}")


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
                        # ExchangeError sınıfındaki düzeltme sayesinde, args[0] 'self' olsa bile 
                        # AttributeError almayacağız.
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
        
        # YENİ: Bakiye önbelleği (cache) ve süresi eklendi.
        # Kullanıcı talebi üzerine, aşırı yüklenmeyi önlemek için önbellek süresi 15 saniyeden 120 saniyeye (2 dakika) çıkarıldı.
        self._balance_cache: Dict[str, Dict] = {}
        self._cache_duration_seconds = 120 # Bakiye verilerini 120 saniye (2 dakika) boyunca önbellekte tut

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
        exchange_name = str(exchange).lower()
        # API anahtarı ve hesap tipine göre önbellek anahtarı oluştur
        cache_key = f"{exchange_name}_{api_key}_{'futures' if is_futures else 'spot'}"

        # 1. Önbellek kontrolü
        cached_data = self._balance_cache.get(cache_key)
        if cached_data:
            cache_timestamp = cached_data.get("timestamp_fetch", 0)
            # Eğer önbellek süresi dolmadıysa, önbellekten dön
            if time.time() - cache_timestamp < self._cache_duration_seconds:
                logger.info(f"Using cached balance for {exchange_name} ({['spot', 'futures'][is_futures]})")
                return cached_data['data']

        # Eğer önbellek yoksa veya süresi dolduysa, API limitini uygula ve sorgula
        await self._rate_limit(exchange)

        try:
            logger.info(f"Fetching balance from {exchange_name} ({['spot', 'futures'][is_futures]})")

            if exchange_name == "binance":
                from backend.services import binance_service
                result = await binance_service.get_balance(api_key, api_secret, is_futures)
                
                # Ham sonucu kaydetmek için logger'ı kullanmaya devam edin
                logger.info(f"Raw balance result from {exchange_name}: {result}")
                
                # Hata ayıklama (print) satırı kaldırıldı.

            elif exchange_name == "bybit":
                from backend.services import bybit_service
                result = await bybit_service.get_balance(api_key, api_secret, is_futures)

            elif exchange_name == "okx":
                from backend.services import okx_service
                result = await okx_service.get_balance(api_key, api_secret, is_futures, passphrase)

            elif exchange_name == "kucoin":
                from backend.services import kucoin_service
                result = await kucoin_service.get_balance(api_key, api_secret, is_futures, passphrase)

            elif exchange_name == "mexc":
                from backend.services import mexc_service
                result = await mexc_service.get_balance(api_key, api_secret, is_futures)

            else:
                raise ExchangeError(exchange_name, f"Unsupported exchange: {exchange_name}")

            # Normalize response
            # Buradaki mantık, binance_service'den gelen normalleştirilmiş formata uymaktadır.
            current_timestamp = datetime.utcnow().isoformat()
            normalized = {
                "exchange": exchange_name,
                "type": "futures" if is_futures else "spot",
                "currency": result.get("currency", "USDT"),
                "total": float(result.get("total", 0)),
                "available": float(result.get("available", 0)),
                "locked": float(result.get("total", 0)) - float(result.get("available", 0)),
                "timestamp": current_timestamp
            }

            logger.info(
                f"Balance fetched from {exchange_name}: "
                f"{normalized['available']:.2f} {normalized['currency']} available"
            )
            
            # 2. Yeni veriyi önbelleğe kaydet
            self._balance_cache[cache_key] = {
                "timestamp_fetch": time.time(),
                "data": normalized
            }

            return normalized

        except ExchangeError:
            raise
        except Exception as e:
            safe_exchange = str(exchange).lower() if exchange else "unknown"
            logger.error(f"Balance fetch failed for {safe_exchange}: {str(e)}")
            raise ExchangeError(safe_exchange, f"Failed to fetch balance: {str(e)}", e)

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
            exchange_name = str(exchange).lower()

            if exchange_name == "binance":
                from backend.services import binance_service
                price = await binance_service.get_current_price(api_key, api_secret, symbol, is_futures)

            elif exchange_name == "bybit":
                from backend.services import bybit_service
                price = await bybit_service.get_current_price(api_key, api_secret, symbol, is_futures)

            elif exchange_name == "okx":
                from backend.services import okx_service
                price = await okx_service.get_current_price(api_key, api_secret, symbol, is_futures, passphrase)

            elif exchange_name == "kucoin":
                from backend.services import kucoin_service
                price = await kucoin_service.get_current_price(api_key, api_secret, symbol, is_futures, passphrase)

            elif exchange_name == "mexc":
                from backend.services import mexc_service
                price = await mexc_service.get_current_price(api_key, api_secret, symbol, is_futures)

            else:
                raise ExchangeError(exchange_name, f"Unsupported exchange: {exchange_name}")

            return {
                "exchange": exchange_name,
                "symbol": symbol,
                "price": float(price),
                "timestamp": datetime.utcnow().isoformat()
            }

        except ExchangeError:
            raise
        except Exception as e:
            safe_exchange = str(exchange).lower() if exchange else "unknown"
            logger.error(f"Price fetch failed for {safe_exchange} {symbol}: {str(e)}")
            raise ExchangeError(safe_exchange, f"Failed to fetch price for {symbol}: {str(e)}", e)

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
            exchange_name = str(exchange).lower()

            if exchange_name == "binance":
                from backend.services import binance_service
                positions = await binance_service.get_positions(api_key, api_secret, is_futures)

            elif exchange_name == "bybit":
                from backend.services import bybit_service
                positions = await bybit_service.get_positions(api_key, api_secret, is_futures)

            elif exchange_name == "okx":
                from backend.services import okx_service
                positions = await okx_service.get_positions(api_key, api_secret, is_futures, passphrase)

            elif exchange_name == "kucoin":
                from backend.services import kucoin_service
                positions = await kucoin_service.get_positions(api_key, api_secret, is_futures, passphrase)

            elif exchange_name == "mexc":
                from backend.services import mexc_service
                positions = await mexc_service.get_positions(api_key, api_secret, is_futures)

            else:
                raise ExchangeError(exchange_name, f"Unsupported exchange: {exchange_name}")

            # Normalize positions
            normalized = []
            for pos in positions:
                normalized.append({
                    "exchange": exchange_name,
                    "symbol": pos.get("symbol"),
                    "side": pos.get("side"),
                    "amount": float(pos.get("amount", 0)),
                    "entry_price": float(pos.get("entry_price", 0)),
                    "current_price": float(pos.get("current_price", 0)),
                    "unrealized_pnl": float(pos.get("unrealized_pnl", 0)),
                    "leverage": int(pos.get("leverage", 1)),
                    "timestamp": datetime.utcnow().isoformat()
                })

            logger.info(f"Fetched {len(normalized)} open positions from {exchange_name}")
            return normalized

        except ExchangeError:
            raise
        except Exception as e:
            safe_exchange = str(exchange).lower() if exchange else "unknown"
            logger.error(f"Positions fetch failed for {safe_exchange}: {str(e)}")
            raise ExchangeError(safe_exchange, f"Failed to fetch positions: {str(e)}", e)


# Singleton instance
unified_exchange = UnifiedExchangeService()
