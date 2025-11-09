"""
Auto-Trading Manager Service
✅ Monitors user settings and starts/stops EMA monitors automatically
✅ Runs in background
✅ Syncs with Firebase in real-time
"""

import asyncio
import logging
from typing import Dict, Set
import os

from backend.services.ema_monitor_firebase import ema_monitor
from backend.firebase_admin import firebase_initialized, get_user_api_keys

logger = logging.getLogger(__name__)


class AutoTradingManager:
    """
    Manages auto-trading monitoring for all users
    
    Features:
    - Monitors trading_settings in Firebase
    - Automatically starts/stops EMA monitors
    - Handles SPOT and FUTURES separately
    - Runs continuously in background
    """
    
    def __init__(self):
        self.running = False
        self.active_monitors: Set[str] = set()  # Set of "user_id_symbol" keys
        self.check_interval = 30  # Check settings every 30 seconds
        
    async def sync_user_monitors(self, user_id: str, settings: Dict):
        """
        Sync monitors for a single user based on their settings
        """
        try:
            exchange = settings.get('exchange', 'binance')
            interval = settings.get('interval', '15m')
            
            spot_enabled = settings.get('spot_enabled', False)
            futures_enabled = settings.get('futures_enabled', False)
            
            spot_watchlist = settings.get('spot_watchlist', [])
            futures_watchlist = settings.get('futures_watchlist', [])
            
            # Get API keys
            api_keys = get_user_api_keys(user_id, exchange)
            if not api_keys:
                logger.warning(f"⚠️ No API keys for user {user_id}, skipping")
                return
            
            # Combine all symbols that need monitoring
            symbols_to_monitor = set()
            if spot_enabled:
                symbols_to_monitor.update(spot_watchlist)
            if futures_enabled:
                symbols_to_monitor.update(futures_watchlist)
            
            logger.info(
                f"👤 User {user_id}: {len(symbols_to_monitor)} symbols to monitor\n"
                f"   Spot: {spot_enabled} ({len(spot_watchlist)} symbols)\n"
                f"   Futures: {futures_enabled} ({len(futures_watchlist)} symbols)"
            )
            
            # Start monitors for each symbol
            for symbol in symbols_to_monitor:
                monitor_key = f"{user_id}_{symbol}"
                
                if monitor_key not in self.active_monitors:
                    logger.info(f"🚀 Starting monitor: {exchange.upper()} {symbol} for user {user_id}")
                    
                    await ema_monitor.start_monitoring(user_id, {
                        'exchange': exchange,
                        'symbol': symbol,
                        'interval': interval,
                        'check_interval': 60  # Check every minute
                    })
                    
                    self.active_monitors.add(monitor_key)
            
            # Stop monitors for symbols no longer in watchlist
            user_monitors = [
                key for key in self.active_monitors 
                if key.startswith(f"{user_id}_")
            ]
            
            for monitor_key in user_monitors:
                symbol = monitor_key.split('_', 1)[1]
                
                if symbol not in symbols_to_monitor:
                    logger.info(f"🛑 Stopping monitor: {symbol} for user {user_id}")
                    
                    symbol_only = monitor_key.replace(f"{user_id}_", "")
                    await ema_monitor.stop_monitoring(user_id, exchange, symbol_only)
                    
                    self.active_monitors.discard(monitor_key)
                    
        except Exception as e:
            logger.error(f"❌ Error syncing monitors for user {user_id}: {e}", exc_info=True)
    
    async def check_all_users(self):
        """
        Check all users' trading settings and sync monitors
        """
        try:
            if not firebase_initialized:
                logger.warning("⚠️ Firebase not initialized, skipping check")
                return
            
            from firebase_admin import db
            firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
            
            # Get all trading settings
            settings_ref = db.reference('trading_settings', url=firebase_db_url)
            all_settings = settings_ref.get()
            
            if not all_settings:
                logger.debug("📭 No trading settings found")
                return
            
            logger.info(f"🔍 Checking {len(all_settings)} users for auto-trading")
            
            active_users = 0
            
            for user_id, settings in all_settings.items():
                spot_enabled = settings.get('spot_enabled', False)
                futures_enabled = settings.get('futures_enabled', False)
                
                if spot_enabled or futures_enabled:
                    active_users += 1
                    await self.sync_user_monitors(user_id, settings)
                else:
                    # Stop all monitors for this user
                    user_monitors = [
                        key for key in self.active_monitors 
                        if key.startswith(f"{user_id}_")
                    ]
                    
                    if user_monitors:
                        logger.info(f"⏸️ Auto-trading disabled for user {user_id}, stopping all monitors")
                        await ema_monitor.stop_all_monitoring(user_id)
                        
                        for key in user_monitors:
                            self.active_monitors.discard(key)
            
            logger.info(
                f"📊 Auto-Trading Status:\n"
                f"   Active Users: {active_users}\n"
                f"   Total Monitors: {len(self.active_monitors)}\n"
                f"   Monitor Keys: {list(self.active_monitors)[:5]}..."  # Show first 5
            )
            
        except Exception as e:
            logger.error(f"❌ Error checking all users: {e}", exc_info=True)
    
    async def run(self):
        """
        Main loop - continuously monitors and syncs
        """
        logger.info("🚀 Auto-Trading Manager started")
        logger.info(f"   Check interval: {self.check_interval}s")
        
        self.running = True
        
        while self.running:
            try:
                await self.check_all_users()
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                logger.info("🛑 Auto-Trading Manager cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in main loop: {e}", exc_info=True)
                await asyncio.sleep(self.check_interval)
        
        logger.info("🛑 Auto-Trading Manager stopped")
    
    async def start(self):
        """Start the manager in background"""
        if not self.running:
            asyncio.create_task(self.run())
            logger.info("✅ Auto-Trading Manager task created")
    
    async def stop(self):
        """Stop the manager and all monitors"""
        logger.info("🛑 Stopping Auto-Trading Manager...")
        self.running = False
        
        # Stop all active monitors
        if self.active_monitors:
            logger.info(f"🛑 Stopping {len(self.active_monitors)} active monitors")
            
            # Get unique user IDs
            user_ids = set(key.split('_')[0] for key in self.active_monitors)
            
            for user_id in user_ids:
                await ema_monitor.stop_all_monitoring(user_id)
        
        self.active_monitors.clear()
        logger.info("✅ Auto-Trading Manager stopped")


# Global instance
auto_trading_manager = AutoTradingManager()