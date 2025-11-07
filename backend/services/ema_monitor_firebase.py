"""
EMA Signal Monitoring Service - Firebase Integrated
✅ COMPLETE VERSION WITH ALL EXCHANGES
✅ Binance, Bybit, OKX, KuCoin, MEXC support
✅ Auto-trading with EMA 9/21 crossover strategy
✅ WebSocket broadcasting
✅ Firebase persistence
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
import time

from backend.firebase_admin import (
    firebase_initialized,
    get_user_api_keys,
    save_ema_signal
)
from backend.services.trade_manager import trade_manager

logger = logging.getLogger(__name__)


class EMAMonitorFirebase:
    """
    Monitors EMA signals for automated trading with Firebase integration
    
    Features:
    - EMA 9/21 crossover detection
    - Multi-exchange support (5 exchanges)
    - Automatic position opening
    - Signal caching in Firebase
    - WebSocket broadcasting
    """

    def __init__(self):
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        logger.info("🚀 EMAMonitorFirebase initialized")

    async def calculate_ema(
        self,
        exchange_name: str,
        api_key: str,
        api_secret: str,
        symbol: str,
        interval: str,
        period: int,
        passphrase: str = ""
    ) -> Optional[float]:
        """
        Calculate EMA for given parameters using exchange API
        
        Supports: Binance, Bybit, OKX, KuCoin, MEXC
        
        Formula: EMA = (Close - EMA_prev) * multiplier + EMA_prev
        where multiplier = 2 / (period + 1)
        
        Args:
            exchange_name: Exchange name (binance, bybit, okx, kucoin, mexc)
            api_key: API key (not used for public data)
            api_secret: API secret (not used for public data)
            symbol: Trading pair (e.g., BTCUSDT)
            interval: Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d)
            period: EMA period (e.g., 9, 21)
            passphrase: Passphrase for OKX/KuCoin
            
        Returns:
            EMA value as float, or None if error
        """
        try:
            import httpx
            
            exchange_name = exchange_name.lower()
            limit = period + 20  # Get extra candles for accuracy
            
            # ============================================
            # BINANCE FUTURES
            # ============================================
            if exchange_name == "binance":
                url = "https://fapi.binance.com/fapi/v1/klines"
                params = {
                    "symbol": symbol,
                    "interval": interval,
                    "limit": limit
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    candles = response.json()
                
                # Binance format: [open_time, open, high, low, close, volume, ...]
                closes = [float(candle[4]) for candle in candles]
                logger.debug(f"✅ Binance: Fetched {len(closes)} candles for {symbol}")
            
            # ============================================
            # BYBIT V5 API
            # ============================================
            elif exchange_name == "bybit":
                url = "https://api.bybit.com/v5/market/kline"
                params = {
                    "category": "linear",
                    "symbol": symbol,
                    "interval": interval,
                    "limit": limit
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                
                # Bybit format: result.list = [[timestamp, open, high, low, close, volume], ...]
                # IMPORTANT: Bybit returns newest first, so we need to reverse
                candles = data.get("result", {}).get("list", [])
                closes = [float(candle[4]) for candle in candles][::-1]  # Reverse order
                logger.debug(f"✅ Bybit: Fetched {len(closes)} candles for {symbol}")
            
            # ============================================
            # OKX V5 API
            # ============================================
            elif exchange_name == "okx":
                url = "https://www.okx.com/api/v5/market/candles"
                
                # OKX uses different interval format
                interval_map = {
                    "1m": "1m",
                    "5m": "5m",
                    "15m": "15m",
                    "30m": "30m",
                    "1h": "1H",
                    "4h": "4H",
                    "1d": "1D"
                }
                
                params = {
                    "instId": symbol,
                    "bar": interval_map.get(interval, interval),
                    "limit": str(limit)
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                
                # OKX format: data = [[timestamp, open, high, low, close, volume], ...]
                # IMPORTANT: OKX returns newest first, so we need to reverse
                candles = data.get("data", [])
                closes = [float(candle[4]) for candle in candles][::-1]  # Reverse order
                logger.debug(f"✅ OKX: Fetched {len(closes)} candles for {symbol}")
            
            # ============================================
            # KUCOIN FUTURES
            # ============================================
            elif exchange_name == "kucoin":
                url = "https://api-futures.kucoin.com/api/v1/kline/query"
                
                # KuCoin uses granularity in minutes
                interval_map = {
                    "1m": 1,
                    "5m": 5,
                    "15m": 15,
                    "30m": 30,
                    "1h": 60,
                    "4h": 240,
                    "1d": 1440
                }
                
                granularity = interval_map.get(interval, 15)
                
                # Calculate time range
                end_time = int(time.time())
                start_time = end_time - (limit * 60 * granularity)
                
                params = {
                    "symbol": symbol,
                    "granularity": granularity,
                    "from": start_time,
                    "to": end_time
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                
                if data.get("code") == "200000":
                    # KuCoin format: data = [[timestamp, open, high, low, close, volume], ...]
                    candles = data.get("data", [])
                    # Index 2 is close price in KuCoin
                    closes = [float(candle[2]) for candle in candles]
                    logger.debug(f"✅ KuCoin: Fetched {len(closes)} candles for {symbol}")
                else:
                    logger.error(f"❌ KuCoin API error: {data.get('msg')}")
                    return None
            
            # ============================================
            # MEXC FUTURES
            # ============================================
            elif exchange_name == "mexc":
                url = "https://contract.mexc.com/api/v1/contract/kline"
                
                # MEXC uses specific interval strings
                interval_map = {
                    "1m": "Min1",
                    "5m": "Min5",
                    "15m": "Min15",
                    "30m": "Min30",
                    "1h": "Min60",
                    "4h": "Hour4",
                    "1d": "Day1"
                }
                
                params = {
                    "symbol": symbol,
                    "interval": interval_map.get(interval, "Min15"),
                    "limit": limit
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                
                if data.get("success"):
                    # MEXC format: data.klines = [[timestamp, open, close, high, low, volume], ...]
                    candles = data.get("data", {}).get("klines", [])
                    # Index 2 is close price in MEXC
                    closes = [float(candle[2]) for candle in candles]
                    logger.debug(f"✅ MEXC: Fetched {len(closes)} candles for {symbol}")
                else:
                    logger.error(f"❌ MEXC API error: {data.get('message')}")
                    return None
            
            else:
                logger.error(f"❌ Unsupported exchange: {exchange_name}")
                return None
            
            # ============================================
            # EMA CALCULATION (UNIFIED FOR ALL EXCHANGES)
            # ============================================
            if len(closes) < period:
                logger.warning(
                    f"⚠️ Not enough data to calculate EMA{period} for {exchange_name} {symbol}: "
                    f"got {len(closes)}, need {period}"
                )
                return None
            
            # Simple EMA calculation
            multiplier = 2 / (period + 1)
            ema = closes[0]  # Start with first close price
            
            for close in closes[1:]:
                ema = (close - ema) * multiplier + ema
            
            logger.debug(
                f"💹 {exchange_name.upper()} {symbol} EMA{period}: {ema:.2f} "
                f"(from {len(closes)} candles)"
            )
            
            return ema
        
        except httpx.HTTPStatusError as e:
            logger.error(
                f"❌ HTTP error calculating EMA for {exchange_name} {symbol}: "
                f"Status {e.response.status_code}"
            )
            return None
        except httpx.TimeoutException:
            logger.error(f"❌ Timeout calculating EMA for {exchange_name} {symbol}")
            return None
        except Exception as e:
            logger.error(
                f"❌ Unexpected error calculating EMA for {exchange_name} {symbol}: {e}",
                exc_info=True
            )
            return None

    async def get_previous_ema(
        self,
        user_id: str,
        symbol: str,
        interval: str,
        period: int
    ) -> Optional[float]:
        """
        Get previously stored EMA value from Firebase
        
        This is used to detect crossovers by comparing current EMA with previous EMA
        
        Args:
            user_id: User ID
            symbol: Trading pair
            interval: Timeframe
            period: EMA period (9 or 21)
            
        Returns:
            Previous EMA value or None if not found
        """
        try:
            if not firebase_initialized:
                return None

            from firebase_admin import db

            ref = db.reference(f'ema_cache/{user_id}/{symbol}/{interval}/ema{period}')
            data = ref.get()

            if data and isinstance(data, dict):
                value = float(data.get('value', 0))
                timestamp = data.get('timestamp', 0)
                
                # Check if cache is not too old (max 1 hour)
                if time.time() - timestamp < 3600:
                    return value
                else:
                    logger.debug(f"⚠️ Cached EMA{period} for {symbol} is too old, ignoring")
                    return None

            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting previous EMA: {e}")
            return None

    async def store_ema(
        self,
        user_id: str,
        symbol: str,
        interval: str,
        period: int,
        value: float
    ):
        """
        Store EMA value in Firebase for future comparison
        
        Args:
            user_id: User ID
            symbol: Trading pair
            interval: Timeframe
            period: EMA period (9 or 21)
            value: EMA value to store
        """
        try:
            if not firebase_initialized:
                return

            from firebase_admin import db

            ref = db.reference(f'ema_cache/{user_id}/{symbol}/{interval}/ema{period}')
            ref.set({
                'value': value,
                'timestamp': int(time.time())
            })
            
            logger.debug(f"💾 Stored EMA{period} for {symbol}: {value:.2f}")
            
        except Exception as e:
            logger.error(f"❌ Error storing EMA: {e}")

    async def check_ema_signal(
        self,
        user_id: str,
        exchange_name: str,
        api_key: str,
        api_secret: str,
        symbol: str,
        interval: str,
        passphrase: str = ""
    ) -> Optional[Dict]:
        """
        Check for EMA crossover signals using EMA 9 and EMA 21
        
        Strategy:
        - Bullish crossover: EMA9 crosses ABOVE EMA21 → BUY signal
        - Bearish crossover: EMA9 crosses BELOW EMA21 → SELL signal
        
        Args:
            user_id: User ID
            exchange_name: Exchange name
            api_key: API key
            api_secret: API secret
            symbol: Trading pair
            interval: Timeframe
            passphrase: Passphrase for OKX/KuCoin
            
        Returns:
            Signal dictionary or None if no signal/error
        """
        try:
            # Calculate current EMA 9 and EMA 21
            ema9 = await self.calculate_ema(
                exchange_name, api_key, api_secret, symbol, interval, 9, passphrase
            )
            ema21 = await self.calculate_ema(
                exchange_name, api_key, api_secret, symbol, interval, 21, passphrase
            )

            if ema9 is None or ema21 is None:
                logger.debug(f"⚠️ Could not calculate EMAs for {symbol}")
                return None

            # Get previous EMAs to detect crossover
            previous_ema9 = await self.get_previous_ema(user_id, symbol, interval, 9)
            previous_ema21 = await self.get_previous_ema(user_id, symbol, interval, 21)

            # Store current EMAs for next comparison
            await self.store_ema(user_id, symbol, interval, 9, ema9)
            await self.store_ema(user_id, symbol, interval, 21, ema21)

            signal = None

            # Detect crossover only if we have previous values
            if previous_ema9 and previous_ema21:
                # Bullish crossover: EMA9 was below EMA21, now above
                if previous_ema9 < previous_ema21 and ema9 > ema21:
                    signal = 'BUY'
                    logger.info(
                        f"🟢 BULLISH CROSSOVER: {exchange_name.upper()} {symbol} "
                        f"(EMA9: {ema9:.2f} > EMA21: {ema21:.2f})"
                    )
                
                # Bearish crossover: EMA9 was above EMA21, now below
                elif previous_ema9 > previous_ema21 and ema9 < ema21:
                    signal = 'SELL'
                    logger.info(
                        f"🔴 BEARISH CROSSOVER: {exchange_name.upper()} {symbol} "
                        f"(EMA9: {ema9:.2f} < EMA21: {ema21:.2f})"
                    )

            result = {
                'symbol': symbol,
                'interval': interval,
                'exchange': exchange_name,
                'ema9': round(ema9, 2),
                'ema21': round(ema21, 2),
                'signal': signal,
                'price':
