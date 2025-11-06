"""
EMA Signal Monitoring Service - Firebase Integrated
Monitors EMA crossovers and triggers automated trading with Firebase persistence
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
        Calculate EMA for given parameters using exchange API

        Uses simple EMA formula: EMA = (Close - EMA_prev) * multiplier + EMA_prev
        where multiplier = 2 / (period + 1)
        """
        try:
            from backend.services.unified_exchange import unified_exchange
            import httpx

            # Fetch OHLCV data
            exchange_name = exchange_name.lower()
            limit = period + 20  # Get extra candles for accuracy

            # Fetch candles from exchange
            if exchange_name == "binance":
                url = f"https://fapi.binance.com/fapi/v1/klines"
                params = {"symbol": symbol, "interval": interval, "limit": limit}

            elif exchange_name == "bybit":
                url = f"https://api.bybit.com/v5/market/kline"
                params = {"category": "linear", "symbol": symbol, "interval": interval, "limit": limit}

            elif exchange_name == "okx":
                url = f"https://www.okx.com/api/v5/market/candles"
                # OKX uses different interval format
                interval_map = {"15m": "15m", "1h": "1H", "4h": "4H", "1d": "1D"}
                params = {"instId": symbol, "bar": interval_map.get(interval, interval), "limit": limit}

            else:
                # For KuCoin and MEXC, use similar approaches
                logger.warning(f"OHLCV fetch not yet optimized for {exchange_name}, using default")
                return None

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                candles = response.json()

            # Parse candles based on exchange format
            if exchange_name == "binance":
                closes = [float(candle[4]) for candle in candles]  # Close price
            elif exchange_name == "bybit":
                closes = [float(candle[4]) for candle in candles.get("result", {}).get("list", [])][::-1]
            elif exchange_name == "okx":
                closes = [float(candle[4]) for candle in candles.get("data", [])][::-1]
            else:
                closes = []

            if len(closes) < period:
                logger.warning(f"Not enough data to calculate EMA{period}: got {len(closes)}, need {period}")
                return None

            # Calculate EMA
            multiplier = 2 / (period + 1)
            ema = closes[0]  # Start with first close

            for close in closes[1:]:
                ema = (close - ema) * multiplier + ema

            logger.debug(f"Calculated EMA{period} for {symbol}: {ema:.2f}")
            return ema

        except Exception as e:
            logger.error(f"Error calculating EMA: {e}")
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
        """Check for EMA crossover signals"""
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
                'price': ema9,  # Approximate current price
                'timestamp': datetime.utcnow().isoformat()
            }

            # Save signal to Firebase if there's a crossover
            if signal:
                logger.info(f"EMA Signal detected: {symbol} {signal} (EMA9: {ema9:.2f}, EMA21: {ema21:.2f})")
                save_ema_signal(user_id, {
                    'symbol': symbol,
                    'signal_type': signal,
                    'ema9': ema9,
                    'ema21': ema21,
                    'price': ema9,
                    'exchange': exchange_name,
                    'interval': interval
                })

            return result

        except Exception as e:
            logger.error(f"Error checking EMA signal: {e}")
            return None

    async def auto_open_position(self, user_id: str, signal: Dict, user_settings: Dict):
        """Automatically open position based on signal using TradeManager"""
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
                f"Auto-opening {side} position: {symbol} "
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

            logger.info(f"Position opened: {order_result.get('trade_id')}")

            # Update signal as acted upon
            if signal.get('id'):
                try:
                    from firebase_admin import db
                    ref = db.reference(f'signals/{signal["id"]}')
                    ref.update({
                        'action_taken': True,
                        'trade_id': order_result.get('trade_id'),
                        'action_timestamp': int(time.time())
                    })
                except Exception as e:
                    logger.error(f"Error updating signal: {e}")

            return order_result

        except Exception as e:
            logger.error(f"Error auto-opening position: {e}")
            return None

    async def start_monitoring_user(self, user_id: str, user_settings: Dict):
        """Start monitoring signals for a user"""
        if user_id in self.monitoring_tasks:
            logger.warning(f"Already monitoring user {user_id}")
            return

        task = asyncio.create_task(self._monitor_loop(user_id, user_settings))
        self.monitoring_tasks[user_id] = task
        logger.info(f"Started EMA monitoring for user {user_id}")

    async def stop_monitoring_user(self, user_id: str):
        """Stop monitoring signals for a user"""
        if user_id in self.monitoring_tasks:
            task = self.monitoring_tasks[user_id]
            task.cancel()
            del self.monitoring_tasks[user_id]
            logger.info(f"Stopped EMA monitoring for user {user_id}")

    async def _monitor_loop(self, user_id: str, user_settings: Dict):
        """Main monitoring loop for a user"""
        try:
            exchange_name = user_settings.get('exchange')
            api_keys = get_user_api_keys(user_id, exchange_name)

            if not api_keys:
                logger.error(f"No API keys found for {exchange_name}, cannot monitor")
                return

            while True:
                # Get user's watchlist
                watchlist = user_settings.get('watchlist', [])
                interval = user_settings.get('interval', '15m')

                for symbol in watchlist:
                    try:
                        # Check signal
                        signal = await self.check_ema_signal(
                            user_id,
                            exchange_name,
                            api_keys.get('api_key'),
                            api_keys.get('api_secret'),
                            symbol,
                            interval,
                            api_keys.get('passphrase', '')
                        )

                        if signal and signal.get('signal') in ['BUY', 'SELL']:
                            # Check if auto-trading is enabled
                            if user_settings.get('enabled', False):
                                await self.auto_open_position(user_id, signal, user_settings)

                    except Exception as e:
                        logger.error(f"Error checking {symbol}: {e}")

                    # Rate limiting - wait between checks
                    await asyncio.sleep(2)

                # Wait for next interval check
                interval_map = {
                    '15m': 300,  # 5 minutes
                    '30m': 600,  # 10 minutes
                    '1h': 1200,  # 20 minutes
                    '4h': 3600,  # 1 hour
                    '1d': 7200,  # 2 hours
                }

                wait_time = interval_map.get(interval, 300)
                logger.info(f"Waiting {wait_time}s until next check for user {user_id}")
                await asyncio.sleep(wait_time)

        except asyncio.CancelledError:
            logger.info(f"Monitoring cancelled for user {user_id}")
        except Exception as e:
            logger.error(f"Error in monitoring loop for user {user_id}: {e}")

    async def cleanup(self):
        """Cleanup all resources"""
        # Cancel all monitoring tasks
        for user_id, task in list(self.monitoring_tasks.items()):
            task.cancel()
            logger.info(f"Cancelled monitoring for user {user_id}")

        self.monitoring_tasks.clear()
        logger.info("EMA Monitor cleaned up")


# Singleton instance
ema_monitor_firebase = EMAMonitorFirebase()
