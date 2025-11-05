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
                "X-MBX-APIKEY": self.api_key
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    params=params,
                    headers=headers
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
        """Create market order"""
        try:
            base_url = self._get_base_url(is_futures)
            
            if is_futures:
                # Set leverage first
                leverage_params = {
                    "symbol": symbol,
                    "leverage": leverage,
                    "timestamp": int(time.time() * 1000)
                }
                leverage_params["signature"] = self._generate_signature(leverage_params)
                
                headers = {"X-MBX-APIKEY": self.api_key}
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    await client.post(
                        f"{base_url}/fapi/v1/leverage",
                        data=leverage_params,
                        headers=headers
                    )
                
                # Create futures order
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
                    return response.json()
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
                
                headers = {"X-MBX-APIKEY": self.api_key}
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}/api/v3/order",
                        data=order_params,
                        headers=headers
                    )
                    response.raise_for_status()
                    return response.json()
                    
        except Exception as e:
            raise Exception(f"Binance order error: {str(e)}")
    
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
