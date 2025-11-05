import hmac
import hashlib
import time
from typing import Dict, List, Optional
import httpx
import json

class BybitService:
    BASE_URL = "https://api.bybit.com"
    
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        
    def _generate_signature(self, params: str, timestamp: str) -> str:
        """Generate HMAC SHA256 signature for Bybit"""
        param_str = f"{timestamp}{self.api_key}{params}"
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            param_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return signature
    
    async def get_balance(self, is_futures: bool = False) -> Dict:
        """Get account balance"""
        try:
            timestamp = str(int(time.time() * 1000))
            
            # Bybit V5 API - unified account
            endpoint = "/v5/account/wallet-balance"
            params = "5000"  # recv_window
            
            signature = self._generate_signature(params, timestamp)
            
            headers = {
                "X-BAPI-API-KEY": self.api_key,
                "X-BAPI-SIGN": signature,
                "X-BAPI-TIMESTAMP": timestamp,
                "X-BAPI-RECV-WINDOW": "5000"
            }
            
            account_type = "CONTRACT" if is_futures else "SPOT"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}{endpoint}",
                    params={"accountType": account_type},
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["retCode"] == 0:
                    result = data["result"]["list"][0] if data["result"]["list"] else {}
                    coins = result.get("coin", [])
                    
                    # Find USDT balance
                    for coin in coins:
                        if coin["coin"] == "USDT":
                            return {
                                "total": float(coin["walletBalance"]),
                                "available": float(coin["availableToWithdraw"]),
                                "currency": "USDT"
                            }
                    
                    return {"total": 0, "available": 0, "currency": "USDT"}
                else:
                    raise Exception(f"Bybit API error: {data.get('retMsg', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"Bybit balance error: {str(e)}")
    
    async def get_current_price(self, symbol: str, is_futures: bool = False) -> float:
        """Get current market price"""
        try:
            endpoint = "/v5/market/tickers"
            category = "linear" if is_futures else "spot"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}{endpoint}",
                    params={"category": category, "symbol": symbol}
                )
                response.raise_for_status()
                data = response.json()
                
                if data["retCode"] == 0 and data["result"]["list"]:
                    return float(data["result"]["list"][0]["lastPrice"])
                else:
                    raise Exception(f"Price not found for {symbol}")
                    
        except Exception as e:
            raise Exception(f"Bybit price error: {str(e)}")
    
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
            timestamp = str(int(time.time() * 1000))
            
            category = "linear" if is_futures else "spot"
            
            # Set leverage for futures
            if is_futures:
                leverage_payload = {
                    "category": category,
                    "symbol": symbol,
                    "buyLeverage": str(leverage),
                    "sellLeverage": str(leverage)
                }
                leverage_params = json.dumps(leverage_payload)
                leverage_signature = self._generate_signature(leverage_params, timestamp)
                
                headers = {
                    "X-BAPI-API-KEY": self.api_key,
                    "X-BAPI-SIGN": leverage_signature,
                    "X-BAPI-TIMESTAMP": timestamp,
                    "X-BAPI-RECV-WINDOW": "5000",
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    await client.post(
                        f"{self.BASE_URL}/v5/position/set-leverage",
                        json=leverage_payload,
                        headers=headers
                    )
            
            # Create order
            order_payload = {
                "category": category,
                "symbol": symbol,
                "side": side.capitalize(),
                "orderType": "Market",
                "qty": str(amount)
            }
            
            order_params = json.dumps(order_payload)
            timestamp = str(int(time.time() * 1000))
            signature = self._generate_signature(order_params, timestamp)
            
            headers = {
                "X-BAPI-API-KEY": self.api_key,
                "X-BAPI-SIGN": signature,
                "X-BAPI-TIMESTAMP": timestamp,
                "X-BAPI-RECV-WINDOW": "5000",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/v5/order/create",
                    json=order_payload,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
                    
        except Exception as e:
            raise Exception(f"Bybit order error: {str(e)}")
    
    async def get_positions(self, is_futures: bool = False) -> List[Dict]:
        """Get open positions"""
        try:
            if not is_futures:
                return []
            
            timestamp = str(int(time.time() * 1000))
            params = "5000"
            signature = self._generate_signature(params, timestamp)
            
            headers = {
                "X-BAPI-API-KEY": self.api_key,
                "X-BAPI-SIGN": signature,
                "X-BAPI-TIMESTAMP": timestamp,
                "X-BAPI-RECV-WINDOW": "5000"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/v5/position/list",
                    params={"category": "linear", "settleCoin": "USDT"},
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["retCode"] == 0:
                    active_positions = []
                    for pos in data["result"]["list"]:
                        size = float(pos.get("size", 0))
                        if size > 0:
                            active_positions.append({
                                "symbol": pos["symbol"],
                                "side": pos["side"],
                                "amount": size,
                                "entry_price": float(pos["avgPrice"]),
                                "current_price": float(pos["markPrice"]),
                                "unrealized_pnl": float(pos["unrealisedPnl"]),
                                "leverage": int(pos["leverage"])
                            })
                    
                    return active_positions
                else:
                    raise Exception(f"Bybit API error: {data.get('retMsg', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"Bybit positions error: {str(e)}")


async def get_balance(api_key: str, api_secret: str, is_futures: bool = False) -> Dict:
    service = BybitService(api_key, api_secret)
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
    service = BybitService(api_key, api_secret)
    return await service.create_order(symbol, side, amount, leverage, is_futures, tp_percentage, sl_percentage)

async def get_positions(api_key: str, api_secret: str, is_futures: bool = False) -> List[Dict]:
    service = BybitService(api_key, api_secret)
    return await service.get_positions(is_futures)

async def get_current_price(api_key: str, api_secret: str, symbol: str, is_futures: bool = False) -> float:
    service = BybitService(api_key, api_secret)
    return await service.get_current_price(symbol, is_futures)
