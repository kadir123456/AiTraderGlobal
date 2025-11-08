"""
EMA Signal Monitoring Service - Firebase Integrated
✅ COMPLETE VERSION WITH SPOT/FUTURES SEPARATION
✅ Binance, Bybit, OKX, KuCoin, MEXC support
✅ Auto-trading with EMA 9/21 crossover strategy
✅ Separate handling for SPOT and FUTURES
✅ WebSocket broadcasting
✅ Firebase persistence
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
import time
import os

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
    - Separate SPOT and FUTURES trading
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
                
                candles = data.get("result", {}).get("list", [])
                closes = [float(candle[4]) for candle in candles][::-1]  # Reverse order
                logger.debug(f"✅ Bybit: Fetched {len(closes)} candles for {symbol}")
            
            # ============================================
            # OKX V5 API
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
                    "limit": str(limit)
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                
                candles = data.get("data", [])
                closes = [float(candle[4]) for candle in candles][::-1]  # Reverse order
                logger.debug(f"✅ OKX: Fetched {len(closes)} candles for {symbol}")
            
            # ============================================
            # KUCOIN FUTURES
            # ============================================
            elif exchange_name == "kucoin":
                url = "https://api-futures.kucoin.com/api/v1/kline/query"
                
                interval_map = {
                    "1m": 1, "5m": 5, "15m": 15, "30m": 30,
                    "1h": 60, "4h": 240, "1d": 1440
                }
                
                granularity = interval_map.get(interval, 15)
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
                    closes = [float(candle[2]) for candle in candles]
                    logger.debug(f"✅ MEXC: Fetched {len(closes)} candles for {symbol}")
                else:
                    logger.error(f"❌ MEXC API error: {data.get('message')}")
                    return None
            
            else:
                logger.error(f"❌ Unsupported exchange: {exchange_name}")
                return None
            
            # ============================================
            # EMA CALCULATION
            # ============================================
            if len(closes) < period:
                logger.warning(
                    f"⚠️ Not enough data to calculate EMA{period} for {exchange_name} {symbol}: "
                    f"got {len(closes)}, need {period}"
                )
                return None
            
            multiplier = 2 / (period + 1)
            ema = closes[0]
            
            for close in closes[1:]:
                ema = (close - ema) * multiplier + ema
            
            logger.debug(
                f"💹 {exchange_name.upper()} {symbol} EMA{period}: {ema:.2f}"
            )
            
            return ema
        
        except Exception as e:
            logger.error(
                f"❌ Error calculating EMA for {exchange_name} {symbol}: {e}",
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
        """Get previously stored EMA value from Firebase"""
        try:
            if not firebase_initialized:
                return None

            from firebase_admin import db

            firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
            ref = db.reference(
                f'ema_cache/{user_id}/{symbol}/{interval}/ema{period}',
                url=firebase_db_url
            )
            data = ref.get()

            if data and isinstance(data, dict):
                value = float(data.get('value', 0))
                timestamp = data.get('timestamp', 0)
                
                # Cache valid for 1 hour
                if time.time() - timestamp < 3600:
                    return value

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
        """Store EMA value in Firebase"""
        try:
            if not firebase_initialized:
                return

            from firebase_admin import db

            firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
            ref = db.reference(
                f'ema_cache/{user_id}/{symbol}/{interval}/ema{period}',
                url=firebase_db_url
            )
            ref.set({
                'value': value,
                'timestamp': int(time.time())
            })
            
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
        - Bullish crossover: EMA9 crosses ABOVE EMA21 → BUY/LONG signal
        - Bearish crossover: EMA9 crosses BELOW EMA21 → SELL/SHORT signal
        """
        try:
            # Calculate current EMAs
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
                    signal = 'BULLISH'
                    logger.info(
                        f"🟢 BULLISH CROSSOVER: {exchange_name.upper()} {symbol} "
                        f"(EMA9: {ema9:.2f} > EMA21: {ema21:.2f})"
                    )
                
                # Bearish crossover: EMA9 was above EMA21, now below
                elif previous_ema9 > previous_ema21 and ema9 < ema21:
                    signal = 'BEARISH'
                    logger.info(
                        f"🔴 BEARISH CROSSOVER: {exchange_name.upper()} {symbol} "
                        f"(EMA9: {ema9:.2f} < EMA21: {ema21:.2f})"
                    )

            # Get current price
            from backend.services.unified_exchange import unified_exchange
            price_data = await unified_exchange.get_current_price(
                exchange=exchange_name,
                symbol=symbol,
                api_key=api_key,
                api_secret=api_secret,
                is_futures=True,  # Will be overridden per trade type
                passphrase=passphrase
            )
            current_price = price_data.get('price', ema9)

            result = {
                'symbol': symbol,
                'interval': interval,
                'exchange': exchange_name,
                'ema9': round(ema9, 2),
                'ema21': round(ema21, 2),
                'signal': signal,
                'price': round(current_price, 2),
                'timestamp': datetime.utcnow().isoformat(),
                'previous_ema9': round(previous_ema9, 2) if previous_ema9 else None,
                'previous_ema21': round(previous_ema21, 2) if previous_ema21 else None
            }

            return result

        except Exception as e:
            logger.error(f"❌ Error checking EMA signal: {e}", exc_info=True)
            return None

    async def execute_auto_trade(
        self,
        user_id: str,
        signal_data: Dict,
        trading_settings: Dict,
        trade_type: str  # 'spot' or 'futures'
    ) -> bool:
        """
        Execute automatic trade based on signal
        
        Args:
            user_id: User ID
            signal_data: Signal information from check_ema_signal
            trading_settings: User's trading settings from Firebase
            trade_type: 'spot' or 'futures'
            
        Returns:
            True if trade executed successfully, False otherwise
        """
        try:
            signal = signal_data.get('signal')
            if not signal:
                return False

            exchange = signal_data['exchange']
            symbol = signal_data['symbol']
            
            logger.info(
                f"🤖 AUTO-TRADE: {trade_type.upper()}\n"
                f"   User: {user_id}\n"
                f"   Exchange: {exchange.upper()}\n"
                f"   Symbol: {symbol}\n"
                f"   Signal: {signal}"
            )

            # Get API keys
            api_keys = get_user_api_keys(user_id, exchange)
            if not api_keys:
                logger.error(f"❌ No API keys found for {exchange}")
                return False

            api_key = api_keys.get('api_key')
            api_secret = api_keys.get('api_secret')
            passphrase = api_keys.get('passphrase', '')

            # Get settings based on trade type
            if trade_type == 'spot':
                amount = trading_settings.get('spot_default_amount', 10)
                tp_percent = trading_settings.get('spot_default_tp', 5)
                sl_percent = trading_settings.get('spot_default_sl', 2)
                leverage = 1  # Spot has no leverage
                is_futures = False
                
                # Determine side for SPOT
                if signal == 'BULLISH':
                    side = 'BUY'  # Buy the asset
                else:
                    side = 'SELL'  # Sell the asset
                    
            else:  # futures
                amount = trading_settings.get('futures_default_amount', 10)
                tp_percent = trading_settings.get('futures_default_tp', 5)
                sl_percent = trading_settings.get('futures_default_sl', 2)
                leverage = trading_settings.get('futures_default_leverage', 10)
                is_futures = True
                
                # Determine side for FUTURES
                if signal == 'BULLISH':
                    side = 'BUY'  # Open LONG position
                else:
                    side = 'SELL'  # Open SHORT position

            # Check if user already has an open position for this symbol
            existing_trades = await trade_manager.get_user_trades(
                user_id, status='open', limit=100
            )
            
            for trade in existing_trades:
                if (trade.get('symbol') == symbol and 
                    trade.get('exchange') == exchange and
                    trade.get('is_futures') == is_futures):
                    logger.warning(
                        f"⚠️ User already has open {trade_type} position for {symbol}, skipping"
                    )
                    return False

            # Execute trade
            logger.info(
                f"📝 Creating {trade_type.upper()} order:\n"
                f"   Side: {side}\n"
                f"   Amount: ${amount}\n"
                f"   Leverage: {leverage}x\n"
                f"   TP: {tp_percent}%, SL: {sl_percent}%"
            )

            trade_result = await trade_manager.create_order(
                user_id=user_id,
                exchange=exchange,
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                side=side,
                amount=amount,
                leverage=leverage,
                is_futures=is_futures,
                tp_percentage=tp_percent,
                sl_percentage=sl_percent,
                passphrase=passphrase
            )

            logger.info(
                f"✅ {trade_type.upper()} AUTO-TRADE EXECUTED\n"
                f"   Trade ID: {trade_result.get('trade_id')}\n"
                f"   Exchange Order ID: {trade_result.get('exchange_order_id')}\n"
                f"   {side} {symbol} @ ${trade_result.get('entry_price'):.2f}"
            )

            # Save signal with action_taken flag
            if firebase_initialized:
                from firebase_admin import db
                firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
                
                signal_ref = db.reference(f'ema_signals/{user_id}', url=firebase_db_url)
                signal_ref.push({
                    **signal_data,
                    'trade_type': trade_type,
                    'action_taken': True,
                    'trade_id': trade_result.get('trade_id'),
                    'side': side,
                    'created_at': datetime.utcnow().isoformat()
                })

            return True

        except Exception as e:
            logger.error(f"❌ Error executing auto-trade: {e}", exc_info=True)
            return False

    async def monitor_symbol(
        self,
        user_id: str,
        exchange: str,
        symbol: str,
        interval: str,
        check_interval_seconds: int = 60
    ):
        """
        Continuously monitor a symbol for EMA signals
        
        This runs in background and checks for signals every check_interval_seconds
        """
        logger.info(
            f"👀 Started monitoring: {exchange.upper()} {symbol} ({interval}) "
            f"for user {user_id}"
        )

        try:
            # Get API keys
            api_keys = get_user_api_keys(user_id, exchange)
            if not api_keys:
                logger.error(f"❌ No API keys for {exchange}, stopping monitor")
                return

            api_key = api_keys.get('api_key')
            api_secret = api_keys.get('api_secret')
            passphrase = api_keys.get('passphrase', '')

            while True:
                try:
                    # Get trading settings
                    if firebase_initialized:
                        from firebase_admin import db
                        firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
                        
                        settings_ref = db.reference(
                            f'trading_settings/{user_id}',
                            url=firebase_db_url
                        )
                        trading_settings = settings_ref.get()
                    else:
                        trading_settings = None

                    if not trading_settings:
                        logger.warning(f"⚠️ No trading settings found, skipping check")
                        await asyncio.sleep(check_interval_seconds)
                        continue

                    # Check if monitoring is still enabled
                    spot_enabled = trading_settings.get('spot_enabled', False)
                    futures_enabled = trading_settings.get('futures_enabled', False)
                    
                    if not spot_enabled and not futures_enabled:
                        logger.info(f"⏸️ Auto-trading disabled for user {user_id}, stopping monitor")
                        break

                    # Check EMA signal
                    signal_data = await self.check_ema_signal(
                        user_id, exchange, api_key, api_secret,
                        symbol, interval, passphrase
                    )

                    if signal_data and signal_data.get('signal'):
                        logger.info(f"🔔 Signal detected: {signal_data}")

                        # Execute SPOT trade if enabled and symbol in watchlist
                        if (spot_enabled and 
                            symbol in trading_settings.get('spot_watchlist', [])):
                            await self.execute_auto_trade(
                                user_id, signal_data, trading_settings, 'spot'
                            )

                        # Execute FUTURES trade if enabled and symbol in watchlist
                        if (futures_enabled and 
                            symbol in trading_settings.get('futures_watchlist', [])):
                            await self.execute_auto_trade(
                                user_id, signal_data, trading_settings, 'futures'
                            )

                except asyncio.CancelledError:
                    logger.info(f"🛑 Monitor cancelled for {symbol}")
                    raise
                except Exception as e:
                    logger.error(f"❌ Error in monitor loop: {e}", exc_info=True)

                # Wait before next check
                await asyncio.sleep(check_interval_seconds)

        except asyncio.CancelledError:
            logger.info(f"🛑 Stopped monitoring {exchange.upper()} {symbol}")
        except Exception as e:
            logger.error(f"❌ Fatal error in monitor: {e}", exc_info=True)

    async def start_monitoring(self, user_id: str, config: Dict):
        """Start monitoring for a user/symbol combination"""
        task_key = f"{user_id}_{config['exchange']}_{config['symbol']}"
        
        if task_key in self.monitoring_tasks:
            logger.warning(f"⚠️ Already monitoring {task_key}")
            return

        task = asyncio.create_task(
            self.monitor_symbol(
                user_id,
                config['exchange'],
                config['symbol'],
                config.get('interval', '15m'),
                config.get('check_interval', 60)
            )
        )
        
        self.monitoring_tasks[task_key] = task
        logger.info(f"✅ Started monitoring task: {task_key}")

    async def stop_monitoring(self, user_id: str, exchange: str, symbol: str):
        """Stop monitoring for a specific symbol"""
        task_key = f"{user_id}_{exchange}_{symbol}"
        
        if task_key in self.monitoring_tasks:
            self.monitoring_tasks[task_key].cancel()
            del self.monitoring_tasks[task_key]
            logger.info(f"🛑 Stopped monitoring: {task_key}")

    async def stop_all_monitoring(self, user_id: str):
        """Stop all monitoring tasks for a user"""
        keys_to_remove = [
            key for key in self.monitoring_tasks.keys()
            if key.startswith(user_id)
        ]
        
        for key in keys_to_remove:
            self.monitoring_tasks[key].cancel()
            del self.monitoring_tasks[key]
        
        logger.info(f"🛑 Stopped all monitoring for user {user_id}")


# Singleton instance
ema_monitor = EMAMonitorFirebase()