import hmac
import hashlib
import time
from typing import Dict, List, Optional
import httpx
from urllib.parse import urlencode

class MEXCService:
    SPOT_BASE_URL = "https://api.mexc.com"
    FUTURES_BASE_URL = "https://contract.mexc.com"
    
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
            
            if is_futures:
                endpoint = "/api/v1/private/account/assets"
                params = {
                    "timestamp": int(time.time() * 1000)
                }
                params["signature"] = self._generate_signature(params)
                
                headers = {
                    "ApiKey": self.api_key,
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{base_url}{endpoint}",
                        params=params,
                        headers=headers
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    if data["success"]:
                        for asset in data["data"]:
                            if asset["currency"] == "USDT":
                                return {
                                    "total": float(asset["equity"]),
                                    "available": float(asset["availableBalance"]),
                                    "currency": "USDT"
                                }
                        return {"total": 0, "available": 0, "currency": "USDT"}
                    else:
                        raise Exception(f"MEXC API error: {data.get('message', 'Unknown error')}")
            else:
                endpoint = "/api/v3/account"
                params = {
                    "timestamp": int(time.time() * 1000)
                }
                params["signature"] = self._generate_signature(params)
                
                headers = {
                    "X-MEXC-APIKEY": self.api_key
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{base_url}{endpoint}",
                        params=params,
                        headers=headers
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    for balance in data.get("balances", []):
                        if balance["asset"] == "USDT":
                            return {
                                "total": float(balance["free"]) + float(balance["locked"]),
                                "available": float(balance["free"]),
                                "currency": "USDT"
                            }
                    return {"total": 0, "available": 0, "currency": "USDT"}
                    
        except Exception as e:
            raise Exception(f"MEXC balance error: {str(e)}")
    
    async def get_current_price(self, symbol: str, is_futures: bool = False) -> float:
        """Get current market price"""
        try:
            base_url = self._get_base_url(is_futures)
            
            if is_futures:
                endpoint = "/api/v1/contract/ticker"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{base_url}{endpoint}",
                        params={"symbol": symbol}
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    if data["success"]:
                        return float(data["data"]["lastPrice"])
                    else:
                        raise Exception(f"Price not found for {symbol}")
            else:
                endpoint = "/api/v3/ticker/price"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{base_url}{endpoint}",
                        params={"symbol": symbol}
                    )
                    response.raise_for_status()
                    data = response.json()
                    return float(data["price"])
                    
        except Exception as e:
            raise Exception(f"MEXC price error: {str(e)}")
    
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
                # Set leverage
                leverage_endpoint = "/api/v1/private/position/leverage"
                leverage_params = {
                    "symbol": symbol,
                    "leverage": leverage,
                    "timestamp": int(time.time() * 1000)
                }
                leverage_params["signature"] = self._generate_signature(leverage_params)
                
                headers = {
                    "ApiKey": self.api_key,
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    await client.post(
                        f"{base_url}{leverage_endpoint}",
                        json=leverage_params,
                        headers=headers
                    )
                
                # Create futures order
                order_endpoint = "/api/v1/private/order/submit"
                open_type = 1 if side == "BUY" else 2  # 1=open long, 2=open short
                
                order_params = {
                    "symbol": symbol,
                    "price": 0,  # Market order
                    "vol": amount,
                    "side": side,
                    "type": 5,  # Market order type
                    "openType": open_type,
                    "timestamp": int(time.time() * 1000)
                }
                order_params["signature"] = self._generate_signature(order_params)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}{order_endpoint}",
                        json=order_params,
                        headers=headers
                    )
                    response.raise_for_status()
                    return response.json()
            else:
                # Spot order
                endpoint = "/api/v3/order"
                params = {
                    "symbol": symbol,
                    "side": side,
                    "type": "MARKET",
                    "quantity": amount,
                    "timestamp": int(time.time() * 1000)
                }
                params["signature"] = self._generate_signature(params)
                
                headers = {
                    "X-MEXC-APIKEY": self.api_key
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{base_url}{endpoint}",
                        data=params,
                        headers=headers
                    )
                    response.raise_for_status()
                    return response.json()
                    
        except Exception as e:
            raise Exception(f"MEXC order error: {str(e)}")
    
    async def get_positions(self, is_futures: bool = False) -> List[Dict]:
        """Get open positions"""
        try:
            if not is_futures:
                return []
            
            base_url = self._get_base_url(is_futures)
            endpoint = "/api/v1/private/position/list/position_list"
            
            params = {
                "timestamp": int(time.time() * 1000)
            }
            params["signature"] = self._generate_signature(params)
            
            headers = {
                "ApiKey": self.api_key,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    params=params,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["success"]:
                    active_positions = []
                    for pos in data["data"]:
                        hold_vol = float(pos.get("holdVol", 0))
                        if hold_vol > 0:
                            active_positions.append({
                                "symbol": pos["symbol"],
                                "side": "LONG" if pos["positionType"] == 1 else "SHORT",
                                "amount": hold_vol,
                                "entry_price": float(pos["openAvgPrice"]),
                                "current_price": float(pos["fairPrice"]),
                                "unrealized_pnl": float(pos["unrealisedPnl"]),
                                "leverage": int(pos["leverage"])
                            })
                    
                    return active_positions
                else:
                    raise Exception(f"MEXC API error: {data.get('message', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"MEXC positions error: {str(e)}")


async def get_balance(api_key: str, api_secret: str, is_futures: bool = False) -> Dict:
    service = MEXCService(api_key, api_secret)
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
    service = MEXCService(api_key, api_secret)
    return await service.create_order(symbol, side, amount, leverage, is_futures, tp_percentage, sl_percentage)

async def get_positions(api_key: str, api_secret: str, is_futures: bool = False) -> List[Dict]:
    service = MEXCService(api_key, api_secret)
    return await service.get_positions(is_futures)

async def get_current_price(api_key: str, api_secret: str, symbol: str, is_futures: bool = False) -> float:
    service = MEXCService(api_key, api_secret)
    return await service.get_current_price(symbol, is_futures)
