import hmac
import hashlib
import time
from typing import Dict, List, Optional
import httpx
from urllib.parse import urlencode

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
            
            print(f"[BINANCE] Creating order: {side} {amount} {symbol}")
            print(f"[BINANCE] Futures: {is_futures}, Leverage: {leverage}x")
            
            if is_futures:
                # Set leverage first
                leverage_params = {
                    "symbol": symbol,
                    "leverage": leverage,
                    "timestamp": int(time.time() * 1000)
                }
                leverage_params["signature"] = self._generate_signature(leverage_params)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    await client.post(
                        f"{base_url}/fapi/v1/leverage",
                        data=leverage_params,
                        headers=headers
                    )
                    print(f"[BINANCE] Leverage set to {leverage}x")
                
                # Create futures market order
                order_params = {
                    "symbol": symbol,
                    "side": side,
                    "type": "MARKET",
                    "quantity": amount,
                    "timestamp": int(time.time() * 1000)
                }
                order_params["signature"] = self._generate_signature(order_params)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}/fapi/v1/order",
                        data=order_params,
                        headers=headers
                    )
                    response.raise_for_status()
                    order_result = response.json()
                    print(f"[BINANCE] Order created: {order_result.get('orderId')}")
                
                # Get entry price
                entry_price = float(order_result.get("avgPrice", 0))
                if entry_price == 0:
                    entry_price = await self.get_current_price(symbol, is_futures)
                
                # Create TP/SL orders if specified
                tp_order_id = None
                sl_order_id = None
                
                if tp_percentage > 0:
                    tp_price = entry_price * (1 + tp_percentage / 100) if side == "BUY" else entry_price * (1 - tp_percentage / 100)
                    tp_order_id = await self._create_tp_sl_order(symbol, "TAKE_PROFIT_MARKET", amount, tp_price, side, is_futures)
                    print(f"[BINANCE] TP order created at {tp_price}: {tp_order_id}")
                
                if sl_percentage > 0:
                    sl_price = entry_price * (1 - sl_percentage / 100) if side == "BUY" else entry_price * (1 + sl_percentage / 100)
                    sl_order_id = await self._create_tp_sl_order(symbol, "STOP_MARKET", amount, sl_price, side, is_futures)
                    print(f"[BINANCE] SL order created at {sl_price}: {sl_order_id}")
                
                return {
                    **order_result,
                    "tp_order_id": tp_order_id,
                    "sl_order_id": sl_order_id,
                    "entry_price": entry_price
                }
            else:
                # Spot order
                order_params = {
                    "symbol": symbol,
                    "side": side,
                    "type": "MARKET",
                    "quantity": amount,
                    "timestamp": int(time.time() * 1000)
                }
                order_params["signature"] = self._generate_signature(order_params)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}/api/v3/order",
                        data=order_params,
                        headers=headers
                    )
                    response.raise_for_status()
                    order_result = response.json()
                    print(f"[BINANCE] Spot order created: {order_result.get('orderId')}")
                    return order_result
                     
        except Exception as e:
            print(f"[BINANCE ERROR] Order failed: {str(e)}")
            raise Exception(f"Binance order error: {str(e)}")
    
    async def _create_tp_sl_order(self, symbol: str, order_type: str, amount: float, trigger_price: float, original_side: str, is_futures: bool) -> Optional[str]:
        """Create TP or SL order for futures"""
        try:
            base_url = self._get_base_url(is_futures)
            
            # Close side is opposite of open side
            close_side = "SELL" if original_side == "BUY" else "BUY"
            
            params = {
                "symbol": symbol,
                "side": close_side,
                "type": order_type,
                "quantity": amount,
                "stopPrice": round(trigger_price, 2),
                "timestamp": int(time.time() * 1000)
            }
            
            if order_type == "TAKE_PROFIT_MARKET":
                params["workingType"] = "MARK_PRICE"
            else:
                params["workingType"] = "MARK_PRICE"
            
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
            print(f"[BINANCE ERROR] TP/SL order failed: {str(e)}")
            return None
    
    async def close_position(self, symbol: str, is_futures: bool = False) -> Dict:
        """Close position by creating opposite market order"""
        try:
            print(f"[BINANCE] Closing position: {symbol}")
            
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
                print(f"[BINANCE] Position closed: {result.get('orderId')}")
                
                # Cancel all open orders for this symbol
                await self.cancel_all_orders(symbol, is_futures)
                
                return result
                
        except Exception as e:
            print(f"[BINANCE ERROR] Close position failed: {str(e)}")
            raise Exception(f"Binance close position error: {str(e)}")
    
    async def cancel_all_orders(self, symbol: str, is_futures: bool = False) -> bool:
        """Cancel all open orders for a symbol (including orphan TP/SL)"""
        try:
            print(f"[BINANCE] Cancelling all orders for {symbol}")
            
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
                print(f"[BINANCE] All orders cancelled for {symbol}")
                return True
                
        except Exception as e:
            print(f"[BINANCE ERROR] Cancel orders failed: {str(e)}")
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
