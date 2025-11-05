"""
EMA Signal Monitoring Service
Monitors EMA crossovers and triggers automated trading
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional
import ccxt.async_support as ccxt

logger = logging.getLogger(__name__)

class EMAMonitor:
    """Monitors EMA signals for automated trading"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.exchanges: Dict[str, ccxt.Exchange] = {}
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        
    async def initialize_exchange(self, exchange_name: str, api_key: str, api_secret: str):
        """Initialize exchange connection"""
        try:
            exchange_class = getattr(ccxt, exchange_name.lower())
            exchange = exchange_class({
                'apiKey': api_key,
                'secret': api_secret,
                'enableRateLimit': True,  # Critical for avoiding bans
                'rateLimit': 1200,  # 50 requests per minute
            })
            
            self.exchanges[exchange_name] = exchange
            logger.info(f"Initialized {exchange_name} exchange")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize {exchange_name}: {e}")
            return False
    
    async def calculate_ema(self, exchange_name: str, symbol: str, interval: str, period: int) -> Optional[float]:
        """Calculate EMA for given parameters"""
        try:
            exchange = self.exchanges.get(exchange_name)
            if not exchange:
                return None
            
            # Fetch OHLCV data
            ohlcv = await exchange.fetch_ohlcv(symbol, interval, limit=period + 20)
            
            if len(ohlcv) < period:
                return None
            
            # Calculate EMA
            closes = [candle[4] for candle in ohlcv]  # Close prices
            
            # Simple EMA calculation
            multiplier = 2 / (period + 1)
            ema = closes[0]
            
            for close in closes[1:]:
                ema = (close * multiplier) + (ema * (1 - multiplier))
            
            return ema
            
        except Exception as e:
            logger.error(f"Error calculating EMA: {e}")
            return None
    
    async def check_ema_signal(self, user_id: str, exchange_name: str, symbol: str, interval: str) -> Optional[Dict]:
        """Check for EMA crossover signals"""
        try:
            # Calculate EMA 9 and EMA 21
            ema9 = await self.calculate_ema(exchange_name, symbol, interval, 9)
            ema21 = await self.calculate_ema(exchange_name, symbol, interval, 21)
            
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
            
            return {
                'symbol': symbol,
                'interval': interval,
                'ema9': round(ema9, 2),
                'ema21': round(ema21, 2),
                'signal': signal,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error checking EMA signal: {e}")
            return None
    
    async def get_previous_ema(self, user_id: str, symbol: str, interval: str, period: int) -> Optional[float]:
        """Get previously stored EMA value"""
        # Implementation depends on your database structure
        # This is a placeholder
        return None
    
    async def store_ema(self, user_id: str, symbol: str, interval: str, period: int, value: float):
        """Store EMA value for future comparison"""
        # Implementation depends on your database structure
        # This is a placeholder
        pass
    
    async def auto_open_position(self, user_id: str, signal: Dict, user_settings: Dict):
        """Automatically open position based on signal"""
        try:
            symbol = signal['symbol']
            side = 'LONG' if signal['signal'] == 'BUY' else 'SHORT'
            
            # Get user's trading settings
            amount = user_settings.get('default_amount', 10)
            leverage = user_settings.get('default_leverage', 10)
            tp_percent = user_settings.get('default_tp', 5)
            sl_percent = user_settings.get('default_sl', 2)
            
            # Calculate position size
            position_size = amount * leverage
            
            # Get current price
            exchange_name = user_settings.get('exchange')
            exchange = self.exchanges.get(exchange_name)
            
            if not exchange:
                logger.error(f"Exchange {exchange_name} not initialized")
                return None
            
            ticker = await exchange.fetch_ticker(symbol)
            entry_price = ticker['last']
            
            # Calculate TP/SL prices
            if side == 'LONG':
                tp_price = entry_price * (1 + tp_percent / 100)
                sl_price = entry_price * (1 - sl_percent / 100)
            else:
                tp_price = entry_price * (1 - tp_percent / 100)
                sl_price = entry_price * (1 + sl_percent / 100)
            
            # Open position on exchange
            order_params = {
                'symbol': symbol,
                'type': 'market',
                'side': 'buy' if side == 'LONG' else 'sell',
                'amount': position_size / entry_price,
                'params': {
                    'leverage': leverage,
                }
            }
            
            order = await exchange.create_order(**order_params)
            
            # Store position in database
            position_data = {
                'user_id': user_id,
                'symbol': symbol,
                'side': side,
                'entry_price': entry_price,
                'amount': amount,
                'leverage': leverage,
                'tp_price': tp_price,
                'sl_price': sl_price,
                'exchange': exchange_name,
                'order_id': order['id'],
                'status': 'open',
                'opened_at': datetime.utcnow().isoformat()
            }
            
            # Save to database (implementation needed)
            await self.save_position(position_data)
            
            logger.info(f"Auto-opened {side} position for {symbol} at {entry_price}")
            
            # Start monitoring this position for TP/SL
            await self.monitor_position(position_data)
            
            return position_data
            
        except Exception as e:
            logger.error(f"Error auto-opening position: {e}")
            return None
    
    async def monitor_position(self, position: Dict):
        """Monitor position for TP/SL triggers"""
        try:
            symbol = position['symbol']
            exchange_name = position['exchange']
            exchange = self.exchanges.get(exchange_name)
            
            if not exchange:
                return
            
            while True:
                # Get current price
                ticker = await exchange.fetch_ticker(symbol)
                current_price = ticker['last']
                
                # Check TP/SL
                side = position['side']
                tp_price = position['tp_price']
                sl_price = position['sl_price']
                
                should_close = False
                reason = None
                
                if side == 'LONG':
                    if current_price >= tp_price:
                        should_close = True
                        reason = 'TP'
                    elif current_price <= sl_price:
                        should_close = True
                        reason = 'SL'
                else:  # SHORT
                    if current_price <= tp_price:
                        should_close = True
                        reason = 'TP'
                    elif current_price >= sl_price:
                        should_close = True
                        reason = 'SL'
                
                if should_close:
                    await self.close_position(position, current_price, reason)
                    break
                
                # Check every 5 seconds (adjust based on needs)
                await asyncio.sleep(5)
                
        except Exception as e:
            logger.error(f"Error monitoring position: {e}")
    
    async def close_position(self, position: Dict, close_price: float, reason: str):
        """Close position and calculate P&L"""
        try:
            exchange_name = position['exchange']
            exchange = self.exchanges.get(exchange_name)
            
            if not exchange:
                return
            
            # Close order
            symbol = position['symbol']
            side = 'sell' if position['side'] == 'LONG' else 'buy'
            amount = position['amount'] * position['leverage'] / close_price
            
            order = await exchange.create_order(
                symbol=symbol,
                type='market',
                side=side,
                amount=amount
            )
            
            # Calculate P&L
            entry_price = position['entry_price']
            position_size = position['amount'] * position['leverage']
            
            if position['side'] == 'LONG':
                pnl = (close_price - entry_price) / entry_price * position_size
            else:
                pnl = (entry_price - close_price) / entry_price * position_size
            
            pnl_percent = (pnl / position['amount']) * 100
            
            # Update position in database
            await self.update_position_closed(
                position['id'],
                close_price,
                pnl,
                pnl_percent,
                reason
            )
            
            logger.info(f"Closed position {position['id']} at {close_price}, P&L: ${pnl:.2f} ({reason})")
            
        except Exception as e:
            logger.error(f"Error closing position: {e}")
    
    async def save_position(self, position_data: Dict):
        """Save position to database"""
        # Implementation needed based on your database
        pass
    
    async def update_position_closed(self, position_id: str, close_price: float, pnl: float, pnl_percent: float, reason: str):
        """Update closed position in database"""
        # Implementation needed based on your database
        pass
    
    async def start_monitoring_user(self, user_id: str, user_settings: Dict):
        """Start monitoring signals for a user"""
        if user_id in self.monitoring_tasks:
            logger.warning(f"Already monitoring user {user_id}")
            return
        
        task = asyncio.create_task(self._monitor_loop(user_id, user_settings))
        self.monitoring_tasks[user_id] = task
        logger.info(f"Started monitoring for user {user_id}")
    
    async def stop_monitoring_user(self, user_id: str):
        """Stop monitoring signals for a user"""
        if user_id in self.monitoring_tasks:
            task = self.monitoring_tasks[user_id]
            task.cancel()
            del self.monitoring_tasks[user_id]
            logger.info(f"Stopped monitoring for user {user_id}")
    
    async def _monitor_loop(self, user_id: str, user_settings: Dict):
        """Main monitoring loop for a user"""
        try:
            while True:
                # Get user's watchlist
                watchlist = user_settings.get('watchlist', [])
                interval = user_settings.get('interval', '15m')
                exchange_name = user_settings.get('exchange')
                
                for symbol in watchlist:
                    # Check signal
                    signal = await self.check_ema_signal(user_id, exchange_name, symbol, interval)
                    
                    if signal and signal['signal'] in ['BUY', 'SELL']:
                        # Check if auto-trading is enabled
                        if user_settings.get('auto_trading', False):
                            await self.auto_open_position(user_id, signal, user_settings)
                    
                    # Rate limiting - wait between checks
                    await asyncio.sleep(2)
                
                # Wait for next interval check
                # For 15m interval, check every 5 minutes
                interval_map = {
                    '15m': 300,  # 5 minutes
                    '30m': 600,  # 10 minutes
                    '1h': 1200,  # 20 minutes
                    '4h': 3600,  # 1 hour
                    '1d': 7200,  # 2 hours
                }
                
                wait_time = interval_map.get(interval, 300)
                await asyncio.sleep(wait_time)
                
        except asyncio.CancelledError:
            logger.info(f"Monitoring cancelled for user {user_id}")
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
    
    async def cleanup(self):
        """Cleanup all resources"""
        # Cancel all monitoring tasks
        for task in self.monitoring_tasks.values():
            task.cancel()
        
        # Close all exchange connections
        for exchange in self.exchanges.values():
            await exchange.close()
        
        logger.info("EMA Monitor cleaned up")
