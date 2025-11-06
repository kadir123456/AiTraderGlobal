"""
Trade Management Service
Handles order placement with idempotency, TP/SL management, and Firebase storage

Key Features:
- Idempotency keys to prevent duplicate orders
- Automatic TP/SL order placement
- Trade tracking in Firebase
- Position monitoring
"""

import logging
import uuid
import time
from typing import Dict, Optional, List
from datetime import datetime

from backend.firebase_admin import firebase_initialized
from backend.services.unified_exchange import unified_exchange, ExchangeError

logger = logging.getLogger(__name__)


class TradeManager:
    """Manages trade execution and tracking"""

    def __init__(self):
        self.pending_orders = {}  # In-memory cache for pending orders

    def generate_client_order_id(self, user_id: str, symbol: str) -> str:
        """
        Generate unique client order ID for idempotency

        Format: userid_symbol_timestamp_uuid4
        """
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]
        return f"{user_id}_{symbol}_{timestamp}_{unique_id}"

    async def get_trade_by_client_order_id(
        self,
        user_id: str,
        client_order_id: str
    ) -> Optional[Dict]:
        """
        Check if trade already exists by client order ID (idempotency check)
        """
        if not firebase_initialized:
            logger.warning("Firebase not initialized, skipping idempotency check")
            return None

        try:
            from firebase_admin import db

            # Check in Firebase
            ref = db.reference(f'trades/{user_id}')
            trades = ref.order_by_child('client_order_id').equal_to(client_order_id).get()

            if trades:
                trade_id = list(trades.keys())[0]
                trade_data = trades[trade_id]
                trade_data['id'] = trade_id
                logger.info(f"Found existing trade with client_order_id: {client_order_id}")
                return trade_data

            return None

        except Exception as e:
            logger.error(f"Error checking for existing trade: {e}")
            return None

    async def save_trade(self, user_id: str, trade_data: Dict) -> str:
        """
        Save trade to Firebase Realtime Database

        Returns: trade_id
        """
        if not firebase_initialized:
            logger.warning("Firebase not initialized, trade not saved")
            return str(uuid.uuid4())

        try:
            from firebase_admin import db

            # Add metadata
            trade_data['created_at'] = int(time.time())
            trade_data['updated_at'] = int(time.time())
            trade_data['user_id'] = user_id

            # Save to Firebase
            ref = db.reference(f'trades/{user_id}')
            new_trade_ref = ref.push(trade_data)

            trade_id = new_trade_ref.key
            logger.info(f"Trade saved to Firebase: {trade_id}")

            return trade_id

        except Exception as e:
            logger.error(f"Error saving trade to Firebase: {e}")
            return str(uuid.uuid4())

    async def update_trade(self, user_id: str, trade_id: str, updates: Dict) -> bool:
        """Update trade in Firebase"""
        if not firebase_initialized:
            logger.warning("Firebase not initialized, trade not updated")
            return False

        try:
            from firebase_admin import db

            updates['updated_at'] = int(time.time())

            ref = db.reference(f'trades/{user_id}/{trade_id}')
            ref.update(updates)

            logger.info(f"Trade updated: {trade_id}")
            return True

        except Exception as e:
            logger.error(f"Error updating trade: {e}")
            return False

    async def create_order(
        self,
        user_id: str,
        exchange: str,
        api_key: str,
        api_secret: str,
        symbol: str,
        side: str,
        amount: float,
        leverage: int = 10,
        is_futures: bool = True,
        tp_percentage: float = 0,
        sl_percentage: float = 0,
        passphrase: str = "",
        client_order_id: Optional[str] = None
    ) -> Dict:
        """
        Create order with idempotency support

        Returns:
        {
            "trade_id": str,
            "client_order_id": str,
            "exchange_order_id": str,
            "status": "open",
            "symbol": str,
            "side": str,
            "amount": float,
            "entry_price": float,
            "tp_price": float | None,
            "sl_price": float | None,
            "leverage": int,
            "tp_order_id": str | None,
            "sl_order_id": str | None,
            "created_at": int,
            "idempotent": bool (True if order already existed)
        }
        """
        try:
            # Generate client order ID if not provided
            if not client_order_id:
                client_order_id = self.generate_client_order_id(user_id, symbol)

            # Check for existing order (idempotency)
            existing_trade = await self.get_trade_by_client_order_id(user_id, client_order_id)
            if existing_trade:
                logger.info(f"Returning existing trade (idempotent): {existing_trade.get('id')}")
                existing_trade['idempotent'] = True
                return existing_trade

            # Get current price for TP/SL calculation
            price_data = await unified_exchange.get_current_price(
                exchange=exchange,
                symbol=symbol,
                api_key=api_key,
                api_secret=api_secret,
                is_futures=is_futures,
                passphrase=passphrase
            )
            entry_price = price_data['price']

            # Calculate TP/SL prices
            tp_price = None
            sl_price = None

            if tp_percentage > 0:
                if side.upper() == "BUY" or side.upper() == "LONG":
                    tp_price = entry_price * (1 + tp_percentage / 100)
                else:
                    tp_price = entry_price * (1 - tp_percentage / 100)

            if sl_percentage > 0:
                if side.upper() == "BUY" or side.upper() == "LONG":
                    sl_price = entry_price * (1 - sl_percentage / 100)
                else:
                    sl_price = entry_price * (1 + sl_percentage / 100)

            logger.info(
                f"Creating order: {exchange} {symbol} {side} {amount} "
                f"@ ~${entry_price:.2f} (leverage: {leverage}x)"
            )

            # Place order on exchange
            exchange = exchange.lower()
            if exchange == "binance":
                from backend.services import binance_service
                result = await binance_service.create_order(
                    api_key, api_secret, symbol, side, amount,
                    leverage, is_futures, tp_percentage, sl_percentage
                )

            elif exchange == "bybit":
                from backend.services import bybit_service
                result = await bybit_service.create_order(
                    api_key, api_secret, symbol, side, amount,
                    leverage, is_futures, tp_percentage, sl_percentage
                )

            elif exchange == "okx":
                from backend.services import okx_service
                result = await okx_service.create_order(
                    api_key, api_secret, symbol, side, amount,
                    leverage, is_futures, tp_percentage, sl_percentage, passphrase
                )

            elif exchange == "kucoin":
                from backend.services import kucoin_service
                result = await kucoin_service.create_order(
                    api_key, api_secret, symbol, side, amount,
                    leverage, is_futures, tp_percentage, sl_percentage, passphrase
                )

            elif exchange == "mexc":
                from backend.services import mexc_service
                result = await mexc_service.create_order(
                    api_key, api_secret, symbol, side, amount,
                    leverage, is_futures, tp_percentage, sl_percentage
                )

            else:
                raise ExchangeError(exchange, f"Unsupported exchange: {exchange}")

            # Extract exchange order ID
            exchange_order_id = str(result.get('orderId') or result.get('order_id') or result.get('id') or uuid.uuid4())

            # Prepare trade data
            trade_data = {
                "client_order_id": client_order_id,
                "exchange_order_id": exchange_order_id,
                "exchange": exchange,
                "symbol": symbol,
                "side": side.upper(),
                "amount": amount,
                "leverage": leverage,
                "is_futures": is_futures,
                "entry_price": entry_price,
                "tp_price": tp_price,
                "sl_price": sl_price,
                "tp_percentage": tp_percentage,
                "sl_percentage": sl_percentage,
                "tp_order_id": result.get('tp_order_id'),
                "sl_order_id": result.get('sl_order_id'),
                "status": "open",
                "exchange_response": result
            }

            # Save to Firebase
            trade_id = await self.save_trade(user_id, trade_data)

            logger.info(
                f"Order created successfully: {trade_id} "
                f"(exchange order: {exchange_order_id})"
            )

            return {
                "trade_id": trade_id,
                "client_order_id": client_order_id,
                "exchange_order_id": exchange_order_id,
                "status": "open",
                "exchange": exchange,
                "symbol": symbol,
                "side": side.upper(),
                "amount": amount,
                "entry_price": entry_price,
                "tp_price": tp_price,
                "sl_price": sl_price,
                "leverage": leverage,
                "tp_order_id": trade_data.get('tp_order_id'),
                "sl_order_id": trade_data.get('sl_order_id'),
                "created_at": trade_data.get('created_at'),
                "idempotent": False
            }

        except ExchangeError:
            raise
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}", exc_info=True)
            raise ExchangeError(exchange, f"Failed to create order: {str(e)}", e)

    async def get_user_trades(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get user's trades from Firebase

        Args:
            user_id: User ID
            status: Filter by status (open, closed, cancelled)
            limit: Max number of trades to return
        """
        if not firebase_initialized:
            logger.warning("Firebase not initialized, returning empty trades list")
            return []

        try:
            from firebase_admin import db

            ref = db.reference(f'trades/{user_id}')

            if status:
                trades_data = ref.order_by_child('status').equal_to(status).limit_to_last(limit).get()
            else:
                trades_data = ref.limit_to_last(limit).get()

            if not trades_data:
                return []

            # Convert to list
            trades = []
            for trade_id, trade_data in trades_data.items():
                trade_data['id'] = trade_id
                trades.append(trade_data)

            # Sort by created_at descending
            trades.sort(key=lambda x: x.get('created_at', 0), reverse=True)

            logger.info(f"Retrieved {len(trades)} trades for user {user_id}")
            return trades

        except Exception as e:
            logger.error(f"Error getting user trades: {e}")
            return []


# Singleton instance
trade_manager = TradeManager()
