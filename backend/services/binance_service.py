import hmac
import hashlib
import time
from typing import Dict, List, Optional
import httpx
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)

class BinanceService:
    SPOT_BASE_URL = "https://api.binance.com"
    FUTURES_BASE_URL = "https://fapi.binance.com"
    
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        
    def _generate_signature(self, params: Dict) -> str:
        """Generate HMAC SHA256 signature"""
        query_string = urlencode(params)
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def _get_base_url(self, is_futures: bool) -> str:
        return self.FUTURES_BASE_URL if is_futures else self.SPOT_BASE_URL
    
    async def get_balance(self, is_futures: bool = False) -> Dict:
        """Get account balance"""
        try:
            base_url = self._get_base_url(is_futures)
            endpoint = "/fapi/v2/account" if is_futures else "/api/v3/account"
            
            params = {
                "timestamp": int(time.time() * 1000)
            }
            params["signature"] = self._generate_signature(params)
            
            headers = {
                "X-MBX-APIKEY": self.api_key,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    params=params,
                    headers=headers
                )

                # Handle 418 IP ban specifically
                if response.status_code == 418:
                    raise Exception(
                        "Binance IP restriction detected. Your server's IP may be blocked. "
                        "Try: 1) Use a VPS with different IP, 2) Enable Binance IP whitelist, "
                        "3) Contact Binance support, or 4) Wait 24 hours for auto-unblock."
                    )

                response.raise_for_status()
                data = response.json()
                
                if is_futures:
                    # Futures balance
                    total_balance = float(data.get("totalWalletBalance", 0))
                    available_balance = float(data.get("availableBalance", 0))
                    return {
                        "total": total_balance,
                        "available": available_balance,
                        "currency": "USDT"
                    }
                else:
                    # Spot balance - return USDT balance
                    for balance in data.get("balances", []):
                        if balance["asset"] == "USDT":
                            return {
                                "total": float(balance["free"]) + float(balance["locked"]),
                                "available": float(balance["free"]),
                                "currency": "USDT"
                            }
                    return {"total": 0, "available": 0, "currency": "USDT"}
                    
        except Exception as e:
            raise Exception(f"Binance balance error: {str(e)}")
    
    async def get_current_price(self, symbol: str, is_futures: bool = False) -> float:
        """Get current market price"""
        try:
            base_url = self._get_base_url(is_futures)
            endpoint = "/fapi/v1/ticker/price" if is_futures else "/api/v3/ticker/price"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    params={"symbol": symbol}
                )
                response.raise_for_status()
                data = response.json()
                return float(data["price"])
                
        except Exception as e:
            raise Exception(f"Binance price error: {str(e)}")
    
    async def get_symbol_info(self, symbol: str, is_futures: bool = False) -> Dict:
        """Get symbol trading rules (lot size, price precision, etc.)"""
        try:
            base_url = self._get_base_url(is_futures)
            endpoint = "/fapi/v1/exchangeInfo" if is_futures else "/api/v3/exchangeInfo"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{base_url}{endpoint}")
                response.raise_for_status()
                data = response.json()
                
                # Find symbol info
                for s in data.get("symbols", []):
                    if s["symbol"] == symbol:
                        # Extract filters
                        lot_size_filter = next((f for f in s["filters"] if f["filterType"] == "LOT_SIZE"), None)
                        price_filter = next((f for f in s["filters"] if f["filterType"] == "PRICE_FILTER"), None)
                        
                        return {
                            "symbol": symbol,
                            "status": s.get("status"),
                            "baseAsset": s.get("baseAsset"),
                            "quoteAsset": s.get("quoteAsset"),
                            "minQty": float(lot_size_filter.get("minQty", 0)) if lot_size_filter else 0,
                            "maxQty": float(lot_size_filter.get("maxQty", 0)) if lot_size_filter else 0,
                            "stepSize": float(lot_size_filter.get("stepSize", 0)) if lot_size_filter else 0,
                            "tickSize": float(price_filter.get("tickSize", 0)) if price_filter else 0,
                            "pricePrecision": s.get("pricePrecision", 2),
                            "quantityPrecision": s.get("quantityPrecision", 3),
                        }
                
                raise Exception(f"Symbol {symbol} not found")
                
        except Exception as e:
            raise Exception(f"Binance symbol info error: {str(e)}")
    
    def _round_quantity(self, quantity: float, step_size: float) -> float:
        """Round quantity to match exchange's step size"""
        if step_size == 0:
            return round(quantity, 8)
        
        precision = 0
        temp_step = step_size
        while temp_step < 1:
            temp_step *= 10
            precision += 1
        
        return round(quantity - (quantity % step_size), precision)
    
    async def create_order(
        self,
        symbol: str,
        side: str,
        amount: float,
        leverage: int = 1,
        is_futures: bool = False,
        tp_percentage: float = 0,
        sl_percentage: float = 0
    ) -> Dict:
        """Create market order with optional TP/SL"""
        try:
            base_url = self._get_base_url(is_futures)
            headers = {"X-MBX-APIKEY": self.api_key}
            
            logger.info(f"[BINANCE] Creating order: {side} {amount} USDT worth of {symbol}")
            logger.info(f"[BINANCE] Futures: {is_futures}, Leverage: {leverage}x")
            
            # ✅ 1. GET CURRENT PRICE
            current_price = await self.get_current_price(symbol, is_futures)
            logger.info(f"[BINANCE] Current price: {current_price:.4f} USDT")
            
            # ✅ 2. GET SYMBOL INFO FOR PRECISION
            symbol_info = await self.get_symbol_info(symbol, is_futures)
            step_size = symbol_info.get("stepSize", 0.001)
            min_qty = symbol_info.get("minQty", 0)
            base_asset = symbol_info.get("baseAsset", "coins")
            
            # ✅ 3. CALCULATE QUANTITY (USDT -> Coin amount)
            quantity = amount / current_price
            logger.info(f"[BINANCE] Raw quantity: {quantity:.8f} {base_asset}")
            
            # ✅ 4. ROUND QUANTITY TO STEP SIZE
            quantity = self._round_quantity(quantity, step_size)
            logger.info(f"[BINANCE] Rounded quantity: {quantity:.8f} (step: {step_size})")
            
            # ✅ 5. VALIDATE MINIMUM QUANTITY
            if quantity < min_qty:
                raise Exception(
                    f"Order quantity {quantity} is below minimum {min_qty} for {symbol}. "
                    f"Increase order amount (minimum ~{min_qty * current_price:.2f} USDT)"
                )
            
            if is_futures:
                # Set leverage first
                leverage_params = {
                    "symbol": symbol,
                    "leverage": leverage,
                    "timestamp": int(time.time() * 1000)
                }
                leverage_params["signature"] = self._generate_signature(leverage_params)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    lev_response = await client.post(
                        f"{base_url}/fapi/v1/leverage",
                        data=leverage_params,
                        headers=headers
                    )
                    lev_response.raise_for_status()
                    logger.info(f"[BINANCE] Leverage set to {leverage}x")
                
                # ✅ Create futures market order with CORRECT QUANTITY
                order_params = {
                    "symbol": symbol,
                    "side": side.upper(),
                    "type": "MARKET",
                    "quantity": quantity,  # ✅ NOW USING COIN AMOUNT, NOT USD
                    "timestamp": int(time.time() * 1000)
                }
                order_params["signature"] = self._generate_signature(order_params)
                
                logger.info(f"[BINANCE] Sending order: {order_params}")
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}/fapi/v1/order",
                        data=order_params,
                        headers=headers
                    )
                    
                    # ✅ DETAILED ERROR LOGGING
                    if response.status_code != 200:
                        error_data = response.json() if response.text else {}
                        logger.error(f"[BINANCE ERROR] Status: {response.status_code}")
                        logger.error(f"[BINANCE ERROR] Response: {error_data}")
                        logger.error(f"[BINANCE ERROR] Message: {error_data.get('msg', 'Unknown error')}")
                        response.raise_for_status()
                    
                    order_result = response.json()
                    logger.info(f"[BINANCE] Order created: {order_result.get('orderId')}")
                
                # Get entry price
                entry_price = float(order_result.get("avgPrice", 0))
                if entry_price == 0:
                    entry_price = current_price
                
                # Create TP/SL orders if specified
                tp_order_id = None
                sl_order_id = None
                
                if tp_percentage > 0:
                    tp_price = entry_price * (1 + tp_percentage / 100) if side.upper() == "BUY" else entry_price * (1 - tp_percentage / 100)
                    tp_order_id = await self._create_tp_sl_order(symbol, "TAKE_PROFIT_MARKET", quantity, tp_price, side, is_futures)
                    logger.info(f"[BINANCE] TP order created at {tp_price:.2f} USDT: {tp_order_id}")
                
                if sl_percentage > 0:
                    sl_price = entry_price * (1 - sl_percentage / 100) if side.upper() == "BUY" else entry_price * (1 + sl_percentage / 100)
                    sl_order_id = await self._create_tp_sl_order(symbol, "STOP_MARKET", quantity, sl_price, side, is_futures)
                    logger.info(f"[BINANCE] SL order created at {sl_price:.2f} USDT: {sl_order_id}")
                
                return {
                    **order_result,
                    "tp_order_id": tp_order_id,
                    "sl_order_id": sl_order_id,
                    "entry_price": entry_price,
                    "quantity": quantity
                }
            else:
                # ✅ Spot order with correct quantity
                order_params = {
                    "symbol": symbol,
                    "side": side.upper(),
                    "type": "MARKET",
                    "quantity": quantity,  # ✅ NOW USING COIN AMOUNT
                    "timestamp": int(time.time() * 1000)
                }
                order_params["signature"] = self._generate_signature(order_params)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}/api/v3/order",
                        data=order_params,
                        headers=headers
                    )
                    
                    if response.status_code != 200:
                        error_data = response.json() if response.text else {}
                        logger.error(f"[BINANCE ERROR] Status: {response.status_code}")
                        logger.error(f"[BINANCE ERROR] Response: {error_data}")
                        response.raise_for_status()
                    
                    order_result = response.json()
                    logger.info(f"[BINANCE] Spot order created: {order_result.get('orderId')}")
                    return order_result
                     
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.text else {}
            logger.error(f"[BINANCE ERROR] HTTP {e.response.status_code}: {error_detail}")
            raise Exception(f"Binance order error: {error_detail.get('msg', str(e))}")
        except Exception as e:
            logger.error(f"[BINANCE ERROR] Order failed: {str(e)}")
            raise Exception(f"Binance order error: {str(e)}")
    
    async def _create_tp_sl_order(self, symbol: str, order_type: str, quantity: float, trigger_price: float, original_side: str, is_futures: bool) -> Optional[str]:
        """Create TP or SL order for futures"""
        try:
            base_url = self._get_base_url(is_futures)
            
            # Close side is opposite of open side
            close_side = "SELL" if original_side.upper() == "BUY" else "BUY"
            
            # Get symbol info for price precision
            symbol_info = await self.get_symbol_info(symbol, is_futures)
            tick_size = symbol_info.get("tickSize", 0.01)
            
            # Round trigger price
            trigger_price = round(trigger_price / tick_size) * tick_size
            
            params = {
                "symbol": symbol,
                "side": close_side,
                "type": order_type,
                "quantity": quantity,
                "stopPrice": trigger_price,
                "workingType": "MARK_PRICE",
                "timestamp": int(time.time() * 1000)
            }
            
            params["signature"] = self._generate_signature(params)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/fapi/v1/order",
                    data=params,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                return str(result.get("orderId"))
                
        except Exception as e:
            logger.error(f"[BINANCE ERROR] TP/SL order failed: {str(e)}")
            return None
    
    async def close_position(self, symbol: str, is_futures: bool = False) -> Dict:
        """Close position by creating opposite market order"""
        try:
            logger.info(f"[BINANCE] Closing position: {symbol}")
            
            if not is_futures:
                raise Exception("Spot doesn't have positions to close")
            
            # Get current position
            positions = await self.get_positions(is_futures)
            position = next((p for p in positions if p["symbol"] == symbol), None)
            
            if not position:
                raise Exception(f"No open position found for {symbol}")
            
            # Create opposite order
            close_side = "SELL" if position["side"] == "LONG" else "BUY"
            amount = position["amount"]
            
            base_url = self._get_base_url(is_futures)
            params = {
                "symbol": symbol,
                "side": close_side,
                "type": "MARKET",
                "quantity": amount,
                "timestamp": int(time.time() * 1000)
            }
            params["signature"] = self._generate_signature(params)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/fapi/v1/order",
                    data=params,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"[BINANCE] Position closed: {result.get('orderId')}")
                
                # Cancel all open orders for this symbol
                await self.cancel_all_orders(symbol, is_futures)
                
                return result
                
        except Exception as e:
            logger.error(f"[BINANCE ERROR] Close position failed: {str(e)}")
            raise Exception(f"Binance close position error: {str(e)}")
    
    async def cancel_all_orders(self, symbol: str, is_futures: bool = False) -> bool:
        """Cancel all open orders for a symbol (including orphan TP/SL)"""
        try:
            logger.info(f"[BINANCE] Cancelling all orders for {symbol}")
            
            base_url = self._get_base_url(is_futures)
            endpoint = "/fapi/v1/allOpenOrders" if is_futures else "/api/v3/openOrders"
            
            params = {
                "symbol": symbol,
                "timestamp": int(time.time() * 1000)
            }
            params["signature"] = self._generate_signature(params)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{base_url}{endpoint}",
                    params=params,
                    headers=headers
                )
                response.raise_for_status()
                logger.info(f"[BINANCE] All orders cancelled for {symbol}")
                return True
                
        except Exception as e:
            logger.error(f"[BINANCE ERROR] Cancel orders failed: {str(e)}")
            return False
    
    async def get_positions(self, is_futures: bool = False) -> List[Dict]:
        """Get open positions"""
        try:
            if not is_futures:
                # Spot doesn't have positions concept
                return []
            
            base_url = self._get_base_url(is_futures)
            params = {
                "timestamp": int(time.time() * 1000)
            }
            params["signature"] = self._generate_signature(params)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{base_url}/fapi/v2/positionRisk",
                    params=params,
                    headers=headers
                )
                response.raise_for_status()
                positions = response.json()
                
                # Filter only positions with non-zero amount
                active_positions = []
                for pos in positions:
                    position_amt = float(pos.get("positionAmt", 0))
                    if position_amt != 0:
                        active_positions.append({
                            "symbol": pos["symbol"],
                            "side": "LONG" if position_amt > 0 else "SHORT",
                            "amount": abs(position_amt),
                            "entry_price": float(pos["entryPrice"]),
                            "current_price": float(pos["markPrice"]),
                            "unrealized_pnl": float(pos["unRealizedProfit"]),
                            "leverage": int(pos["leverage"])
                        })
                
                return active_positions
                
        except Exception as e:
            raise Exception(f"Binance positions error: {str(e)}")


# ============================================
# MODULE-LEVEL FUNCTIONS (API)
# ============================================

async def get_balance(api_key: str, api_secret: str, is_futures: bool = False) -> Dict:
    service = BinanceService(api_key, api_secret)
    return await service.get_balance(is_futures)

async def create_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    amount: float,
    leverage: int = 1,
    is_futures: bool = False,
    tp_percentage: float = 0,
    sl_percentage: float = 0
) -> Dict:
    service = BinanceService(api_key, api_secret)
    return await service.create_order(symbol, side, amount, leverage, is_futures, tp_percentage, sl_percentage)

async def get_positions(api_key: str, api_secret: str, is_futures: bool = False) -> List[Dict]:
    service = BinanceService(api_key, api_secret)
    return await service.get_positions(is_futures)

async def get_current_price(api_key: str, api_secret: str, symbol: str, is_futures: bool = False) -> float:
    service = BinanceService(api_key, api_secret)
    return await service.get_current_price(symbol, is_futures)

async def close_position(api_key: str, api_secret: str, symbol: str, is_futures: bool = False) -> Dict:
    service = BinanceService(api_key, api_secret)
    return await service.close_position(symbol, is_futures)

async def set_leverage(api_key: str, api_secret: str, symbol: str, leverage: int, is_futures: bool = True) -> bool:
    """
    ✅ SET LEVERAGE - Missing function that was causing the error!
    """
    service = BinanceService(api_key, api_secret)
    
    try:
        if not is_futures:
            logger.warning("Leverage can only be set for futures trading")
            return False
        
        base_url = service.FUTURES_BASE_URL
        params = {
            "symbol": symbol,
            "leverage": leverage,
            "timestamp": int(time.time() * 1000)
        }
        params["signature"] = service._generate_signature(params)
        
        headers = {"X-MBX-APIKEY": api_key}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url}/fapi/v1/leverage",
                data=params,
                headers=headers
            )
            response.raise_for_status()
            logger.info(f"[BINANCE] Leverage set to {leverage}x for {symbol}")
            return True
            
    except Exception as e:
        logger.error(f"[BINANCE ERROR] Set leverage failed: {str(e)}")
        return False

async def get_market_info(api_key: str, api_secret: str, symbol: str, is_futures: bool = True) -> Dict:
    """
    ✅ GET MARKET INFO - This is the missing getMarket function!
    Returns min/max lot size, price precision, etc.
    """
    service = BinanceService(api_key, api_secret)
    return await service.get_symbol_info(symbol, is_futures)

async def open_position(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    amount: float,
    leverage: int = 10,
    take_profit: float = None,
    stop_loss: float = None,
    is_futures: bool = True
) -> Dict:
    """
    ✅ OPEN POSITION - Wrapper for create_order with better naming
    
    Args:
        api_key: API key
        api_secret: API secret
        symbol: Trading pair (e.g., BTCUSDT)
        side: BUY, SELL, LONG, or SHORT
        amount: Amount in USDT
        leverage: Leverage (default: 10)
        take_profit: Take profit percentage (e.g., 5 for 5%)
        stop_loss: Stop loss percentage (e.g., 2 for 2%)
        is_futures: True for futures trading
    
    Returns:
        Order result dictionary
    """
    # Normalize side
    if side.upper() == "LONG":
        side = "BUY"
    elif side.upper() == "SHORT":
        side = "SELL"
    
    # Use create_order function
    return await create_order(
        api_key=api_key,
        api_secret=api_secret,
        symbol=symbol,
        side=side,
        amount=amount,
        leverage=leverage,
        is_futures=is_futures,
        tp_percentage=take_profit or 0,
        sl_percentage=stop_loss or 0
    )