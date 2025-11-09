"""
Trade Manager Service
Handles all trading operations including SPOT and FUTURES
"""

from typing import Optional, Dict, List
import time
import logging
import uuid
from datetime import datetime

from backend.firebase_admin import db, firebase_initialized
from backend.services.unified_exchange import unified_exchange

logger = logging.getLogger(__name__)


class TradeManager:
    """Manages trading operations across multiple exchanges"""
    
    def __init__(self):
        self.db = db
        logger.info("✅ TradeManager initialized")
    
    async def create_order(
        self,
        user_id: str,
        exchange: str,
        api_key: str,
        api_secret: str,
        symbol: str,
        side: str,
        amount: float,
        leverage: int = 1,
        is_futures: bool = True,
        tp_percentage: float = 0,
        sl_percentage: float = 0,
        passphrase: str = "",
        client_order_id: Optional[str] = None
    ) -> Dict:
        """
        Create order (SPOT or FUTURES)
        
        Args:
            user_id: User ID
            exchange: Exchange name (binance, bybit, etc.)
            api_key: API key
            api_secret: API secret
            symbol: Trading pair (e.g., BTCUSDT)
            side: 'BUY' or 'SELL'
            amount: Amount in USD
            leverage: Leverage (1 for spot, >1 for futures)
            is_futures: True for futures, False for spot
            tp_percentage: Take profit percentage
            sl_percentage: Stop loss percentage
            passphrase: Passphrase for OKX/KuCoin
            client_order_id: Custom order ID
            
        Returns:
            Trade result dictionary
        """
        try:
            trade_id = client_order_id or f"trade_{user_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            # Get current price
            price_data = await unified_exchange.get_current_price(
                exchange=exchange,
                symbol=symbol,
                api_key=api_key,
                api_secret=api_secret,
                is_futures=is_futures,
                passphrase=passphrase
            )
            entry_price = price_data.get('price', 0)
            
            if entry_price == 0:
                raise Exception("Failed to get current price")
            
            # Log order details
            trade_type = "FUTURES" if is_futures else "SPOT"
            logger.info(
                f"📝 Creating {trade_type} order on {exchange.upper()}\n"
                f"   Symbol: {symbol}\n"
                f"   Side: {side}\n"
                f"   Amount: ${amount}\n"
                f"   Leverage: {leverage}x\n"
                f"   Entry Price: ~${entry_price:.2f}"
            )
            
            # Calculate quantity
            quantity = amount / entry_price
            
            # Place order via unified exchange
            order_result = await unified_exchange.place_order(
                exchange=exchange,
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                side=side,
                quantity=quantity,
                is_futures=is_futures,
                leverage=leverage,
                passphrase=passphrase
            )
            
            # Calculate TP/SL prices
            tp_price = None
            sl_price = None
            
            if tp_percentage > 0:
                if side == 'BUY':
                    tp_price = entry_price * (1 + tp_percentage / 100)
                else:
                    tp_price = entry_price * (1 - tp_percentage / 100)
            
            if sl_percentage > 0:
                if side == 'BUY':
                    sl_price = entry_price * (1 - sl_percentage / 100)
                else:
                    sl_price = entry_price * (1 + sl_percentage / 100)
            
            # Save trade to Firebase
            trade_data = {
                'trade_id': trade_id,
                'user_id': user_id,
                'exchange': exchange,
                'symbol': symbol,
                'side': side,
                'entry_price': entry_price,
                'quantity': quantity,
                'amount': amount,
                'leverage': leverage,
                'is_futures': is_futures,
                'tp_price': tp_price,
                'sl_price': sl_price,
                'tp_percentage': tp_percentage,
                'sl_percentage': sl_percentage,
                'status': 'open',
                'exchange_order_id': order_result.get('order_id'),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if firebase_initialized:
                ref = db.reference(f'trades/{user_id}/{trade_id}')
                ref.set(trade_data)
            
            logger.info(f"✅ Order placed successfully: {trade_id}")
            
            return {
                'success': True,
                'trade_id': trade_id,
                'exchange_order_id': order_result.get('order_id'),
                'entry_price': entry_price,
                'quantity': quantity,
                **trade_data
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating order: {e}", exc_info=True)
            raise
    
    async def create_spot_order(
        self,
        user_id: str,
        exchange: str,
        api_key: str,
        api_secret: str,
        symbol: str,
        side: str,
        amount: float,
        tp_percentage: float = 0,
        sl_percentage: float = 0,
        passphrase: str = "",
        client_order_id: Optional[str] = None
    ) -> Dict:
        """
        Create SPOT order (Buy/Sell asset directly)
        
        SPOT Logic:
        - BUY: Purchase the asset (e.g., buy BTC with USDT)
        - SELL: Sell the asset you own
        """
        return await self.create_order(
            user_id=user_id,
            exchange=exchange,
            api_key=api_key,
            api_secret=api_secret,
            symbol=symbol,
            side=side,
            amount=amount,
            leverage=1,
            is_futures=False,
            tp_percentage=tp_percentage,
            sl_percentage=sl_percentage,
            passphrase=passphrase,
            client_order_id=client_order_id
        )
    
    async def close_spot_position(
        self,
        user_id: str,
        trade_id: str,
        exchange: str,
        api_key: str,
        api_secret: str,
        symbol: str,
        amount: float,
        passphrase: str = ""
    ) -> Dict:
        """Close SPOT position (sell the asset you bought)"""
        try:
            logger.info(f"🔴 Closing SPOT position: {exchange.upper()} {symbol}")
            
            result = await self.create_spot_order(
                user_id=user_id,
                exchange=exchange,
                api_key=api_key,
                api_secret=api_secret,
                symbol=symbol,
                side='SELL',
                amount=amount,
                passphrase=passphrase
            )
            
            await self.update_trade(user_id, trade_id, {
                "status": "closed",
                "closed_at": int(time.time()),
                "close_order_id": result.get('exchange_order_id')
            })
            
            logger.info(f"✅ SPOT position closed: {symbol}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error closing SPOT position: {e}", exc_info=True)
            raise
    
    async def update_trade(self, user_id: str, trade_id: str, data: Dict):
        """Update trade in Firebase"""
        try:
            if firebase_initialized:
                ref = db.reference(f'trades/{user_id}/{trade_id}')
                ref.update({
                    **data,
                    'updated_at': datetime.utcnow().isoformat()
                })
                logger.info(f"✅ Trade updated: {trade_id}")
        except Exception as e:
            logger.error(f"❌ Error updating trade: {e}", exc_info=True)
    
    async def get_user_trades(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get user's trades from Firebase"""
        try:
            if not firebase_initialized:
                return []
            
            ref = db.reference(f'trades/{user_id}')
            trades = ref.get()
            
            if not trades:
                return []
            
            result = []
            for trade_id, trade_data in trades.items():
                if status is None or trade_data.get('status') == status:
                    result.append({
                        'trade_id': trade_id,
                        **trade_data
                    })
            
            # Sort by created_at descending
            result.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            return result[:limit]
            
        except Exception as e:
            logger.error(f"❌ Error getting trades: {e}", exc_info=True)
            return []


# Singleton instance
trade_manager = TradeManager()