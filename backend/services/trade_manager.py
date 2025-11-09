"""
Trade Manager - Spot Trading Additions

Add these functions to backend/services/trade_manager.py
"""

from typing import Optional, Dict
import time
import logging

logger = logging.getLogger(__name__)


async def create_spot_order(
    self,
    user_id: str,
    exchange: str,
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,  # 'BUY' or 'SELL'
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
    
    Args:
        user_id: User ID
        exchange: Exchange name
        api_key: API key
        api_secret: API secret
        symbol: Trading pair (e.g., BTCUSDT)
        side: 'BUY' or 'SELL'
        amount: Amount in quote currency (USDT)
        tp_percentage: Take profit %
        sl_percentage: Stop loss %
        passphrase: For OKX/KuCoin
        client_order_id: Optional custom order ID
        
    Returns:
        Trade result dictionary
    """
    # Call the main create_order with is_futures=False and leverage=1
    return await self.create_order(
        user_id=user_id,
        exchange=exchange,
        api_key=api_key,
        api_secret=api_secret,
        symbol=symbol,
        side=side,
        amount=amount,
        leverage=1,  # No leverage for spot
        is_futures=False,  # SPOT trading
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
    """
    Close SPOT position (sell the asset you bought)
    
    Args:
        user_id: User ID
        trade_id: Trade ID
        exchange: Exchange name
        api_key: API key
        api_secret: API secret
        symbol: Trading pair
        amount: Amount to sell
        passphrase: For OKX/KuCoin
        
    Returns:
        Close result
    """
    try:
        logger.info(f"🔴 Closing SPOT position: {exchange.upper()} {symbol}")
        
        # For spot, we just need to sell the asset
        result = await self.create_spot_order(
            user_id=user_id,
            exchange=exchange,
            api_key=api_key,
            api_secret=api_secret,
            symbol=symbol,
            side='SELL',  # Sell to close
            amount=amount,
            passphrase=passphrase
        )
        
        # Update trade status
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


# Add this to the existing TradeManager class in create_order method
# to properly handle SPOT vs FUTURES:

"""
In the create_order method, around line 200, update the logging:

if is_futures:
    logger.info(
        f"📝 Creating FUTURES order on {exchange_name.upper()}\n"
        f"   Symbol: {symbol}\n"
        f"   Side: {side.upper()} ({'LONG' if side.upper() == 'BUY' else 'SHORT'})\n"
        f"   Amount: ${amount}\n"
        f"   Leverage: {leverage}x\n"
        f"   Entry Price: ~${entry_price:.2f}"
    )
else:
    logger.info(
        f"📝 Creating SPOT order on {exchange_name.upper()}\n"
        f"   Symbol: {symbol}\n"
        f"   Side: {side.upper()}\n"
        f"   Amount: ${amount}\n"
        f"   Entry Price: ~${entry_price:.2f}"
    )
"""