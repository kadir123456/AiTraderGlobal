# backend/services/ema_monitor_firebase.py - FIXED & COMPLETE

"""
EMA Signal Monitoring Service - Firebase Integrated
✅ TÜM BORSALAR DESTEKLENİYOR: Binance, Bybit, OKX, KuCoin, MEXC
✅ Otomatik Al-Sat
✅ Özel Stratejiler (EMA 9/21 kesişimi)
✅ Arbitraj için hazır (fiyat karşılaştırma)
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
    """Monitors EMA signals for automated trading with Firebase integration"""

    def __init__(self):
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}

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
        ✅ TÜM BORSALAR İÇİN EMA HESAPLAMA
        Desteklenen: Binance, Bybit, OKX, KuCoin, MEXC
        
        Formula: EMA = (Close - EMA_prev) * multiplier + EMA_prev
        Multiplier = 2 / (period + 1)
        """
        try:
            import httpx
            
            exchange_name = exchange_name.lower()
            limit = period + 20  # Extra candles for accuracy
            
            # ============================================
            # BINANCE
            # ============================================
            if exchange_name == "binance":
                url = "https://fapi.binance.com/fapi/v1/klines"
                params = {"symbol": symbol, "interval": interval, "limit": limit}
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    candles = response.json()
                
                closes = [float(candle[4]) for candle in candles]
            
            # ============================================
            # BYBIT
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
                
                candles = data.get("result", {}).get("list", [])
                closes = [float(candle[4]) for candle in candles][::-1]  # Reverse!
            
            # ============================================
            # OKX
            # ============================================
            elif exchange_name == "okx":
                url = "https://www.okx.com/api/v5/market/candles"
                interval_map = {
                    "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m",
                    "1h": "1H", "4h": "4H", "1d": "1D"
                }
                params = {
                    "instId": symbol,
                    "bar": interval_map.get(interval, interval),
                    "limit": limit
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                
                candles = data.get("data", [])
                closes = [float(candle[4]) for candle in candles][::-1]  # Reverse!
            
            # ============================================
            # KUCOIN (✅ YENİ!)
            # ============================================
            elif exchange_name == "kucoin":
                url = "https://api-futures.kucoin.com/api/v1/kline/query"
                # KuCoin interval: 1, 5, 15, 30, 60, 120, 240, 480, 720, 1440 (minutes)
                interval_map = {
                    "1m": 1, "5m": 5, "15m": 15, "30m": 30,
                    "1h": 60, "4h": 240, "1d": 1440
                }
                granularity = interval_map.get(interval, 15)
                
                # Time range
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
                    candles = data.get("data", [])
                    # KuCoin format: [time, open, high, low, close, volume]
                    closes = [float(candle[2]) for candle in candles]  # Index 2 = close
                else:
                    logger.error(f"KuCoin API error: {data.get('msg')}")
                    return None
            
            # ============================================
            # MEXC (✅ YENİ!)
            # ============================================
            elif exchange_name == "mexc":
                url = "https://contract.mexc.com/api/v1/contract/kline"
                # MEXC interval: Min1, Min5, Min15, Min30, Min60, Hour4, Day1
                interval_map = {
                    "1m": "Min1", "5m": "Min5", "15m": "Min15", "30m": "Min30",
                    "1h": "Min60", "4h": "Hour4", "1d": "Day1"
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
                    candles = data.get("data", {}).get("klines", [])
                    # MEXC format: [timestamp, open, high, low, close, volume, ...]
                    closes = [float(candle[2]) for candle in candles]  # Index 2 = close
                else:
                    logger.error(f"MEXC API error: {data.get('message')}")
                    return None
            
            else:
                logger.error(f"❌ Unsupported exchange: {exchange_name}")
                return None
            
            # ============================================
            # EMA CALCULATION (ALL EXCHANGES)
            # ============================================
            if len(closes) < period:
                logger.warning(f"Not enough data for {exchange_name}: got {len(closes)}, need {period}")
                return None
            
            multiplier = 2 / (period + 1)
            ema = closes[0]
            
            for close in closes[1:]:
                ema = (close - ema) * multiplier + ema
            
            logger.debug(f"✅ {exchange_name.upper()} EMA{period} for {symbol}: {ema:.2f}")
            return ema
        
        except Exception as e:
            logger.error(f"❌ Error calculating EMA for {exchange_name}: {e}")
            return None

    async def get_previous_ema(self, user_id: str, symbol: str, interval: str, period: int) -> Optional[float]:
        """Get previously stored EMA value from Firebase"""
        try:
            if not firebase_initialized:
                return None

            from firebase_admin import db

            ref = db.reference(f'ema_cache/{user_id}/{symbol}/{interval}/ema{period}')
            data = ref.get()

            if data and isinstance(data, dict):
                return float(data.get('value', 0))

            return None
        except Exception as e:
            logger.error(f"Error getting previous EMA: {e}")
            return None

    async def store_ema(self, user_id: str, symbol: str, interval: str, period: int, value: float):
        """Store EMA value in Firebase for future comparison"""
        try:
            if not firebase_initialized:
                return

            from firebase_admin import db

            ref = db.reference(f'ema_cache/{user_id}/{symbol}/{interval}/ema{period}')
            ref.set({
                'value': value,
                'timestamp': int(time.time())
            })
        except Exception as e:
            logger.error(f"Error storing EMA: {e}")

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
        ✅ ÖZEL STRATEJİ: EMA 9/21 Kesişimi
        - Bullish: EMA9 crosses above EMA21 → BUY
        - Bearish: EMA9 crosses below EMA21 → SELL
        """
        try:
            # Calculate EMA 9 and EMA 21
            ema9 = await self.calculate_ema(
                exchange_name, api_key, api_secret, symbol, interval, 9, passphrase
            )
            ema21 = await self.calculate_ema(
                exchange_name, api_key, api_secret, symbol, interval, 21, passphrase
            )

            if ema9 is None or ema21 is None:
                return None

            # Get previous EMAs to detect crossover
            previous_ema9 = await self.get_previous_ema(user_id, symbol, interval, 9)
            previous_ema21 = await self.get_previous_ema(user_id, symbol, interval, 21)

            # Store current EMAs
            await self.store_ema(user_id, symbol, interval, 9, ema9)
            await self.store_ema(user_id, symbol, interval, 21, ema21)

            signal = None

            # Bullish crossover: EMA9 crosses above EMA21
            if previous_ema9 and previous_ema21:
                if previous_ema9 < previous_ema21 and ema9 > ema21:
                    signal = 'BUY'
                # Bearish crossover: EMA9 crosses below EMA21
                elif previous_ema9 > previous_ema21 and ema9 < ema21:
                    signal = 'SELL'

            result = {
                'symbol': symbol,
                'interval': interval,
                'exchange': exchange_name,
                'ema9': round(ema9, 2),
                'ema21': round(ema21, 2),
                'signal': signal,
                'price': ema9,
                'timestamp': datetime.utcnow().isoformat()
            }

            # Save signal to Firebase if there's a crossover
            if signal:
                logger.info(f"🚨 EMA Signal: {exchange_name.upper()} {symbol} {signal} (EMA9: {ema9:.2f}, EMA21: {ema21:.2f})")
                save_ema_signal(user_id, {
                    'symbol': symbol,
                    'signal_type': signal,
                    'ema9': ema9,
                    'ema21': ema21,
                    'price': ema9,
                    'exchange': exchange_name,
                    'interval': interval
                })

                # Broadcast signal via WebSocket
                try:
                    from backend.websocket_manager import connection_manager
                    await connection_manager.broadcast_signal({
                        'signal': signal,
                        'exchange': exchange_name,
                        'symbol': symbol,
                        'price': round(ema9, 2),
                        'ema9': round(ema9, 2),
                        'ema21': round(ema21, 2),
                        'interval': interval,
                        'user_id': user_id
                    })
                    logger.info(f"📡 Signal broadcasted to all clients")
                except Exception as e:
                    logger.error(f"Failed to broadcast signal: {e}")

            return result

        except Exception as e:
            logger.error(f"Error checking EMA signal: {e}")
            return None

    async def auto_open_position(self, user_id: str, signal: Dict, user_settings: Dict):
        """
        ✅ OTOMATTK AL-SAT
        Automatically open position based on signal using TradeManager
        """
        try:
            symbol = signal['symbol']
            side = signal['signal']  # BUY or SELL
            exchange_name = user_settings.get('exchange')

            # Get user's API keys from Firebase
            api_keys = get_user_api_keys(user_id, exchange_name)
            if not api_keys:
                logger.error(f"No API keys found for {exchange_name}")
                return None

            # Get trading settings
            amount = user_settings.get('default_amount', 10)
            leverage = user_settings.get('default_leverage', 10)
            tp_percent = user_settings.get('default_tp', 5)
            sl_percent = user_settings.get('default_sl', 2)

            logger.info(
                f"🤖 Auto-opening {side} position: {symbol} "
                f"(amount: ${amount}, leverage: {leverage}x, TP: {tp_percent}%, SL: {sl_percent}%)"
            )

            # Use TradeManager to place order with idempotency
            order_result = await trade_manager.create_order(
                user_id=user_id,
                exchange=exchange_name,
                api_key=api_keys.get('api_key'),
                api_secret=api_keys.get('api_secret'),
                symbol=symbol,
                side=side,
                amount=amount,
                leverage=leverage,
                is_futures=True,
                tp_percentage=tp_percent,
                sl_percentage=sl_percent,
                passphrase=api_keys.get('passphrase', '')
            )

            logger.info(f"✅ Position opened: {order_result.get('trade_id')}")

            # Update signal
