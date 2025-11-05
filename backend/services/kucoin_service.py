import hmac
import hashlib
import base64
import time
from typing import Dict, List, Optional
import httpx
import json

class KuCoinService:
    SPOT_BASE_URL = "https://api.kucoin.com"
    FUTURES_BASE_URL = "https://api-futures.kucoin.com"
    
    def __init__(self, api_key: str, api_secret: str, passphrase: str = ""):
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        
    def _generate_signature(self, timestamp: str, method: str, endpoint: str, body: str = "") -> tuple:
        """Generate HMAC SHA256 signature for KuCoin"""
        str_to_sign = timestamp + method + endpoint + body
        signature = base64.b64encode(
            hmac.new(
                self.api_secret.encode('utf-8'),
                str_to_sign.encode('utf-8'),
                hashlib.sha256
            ).digest()
        ).decode()
        
        passphrase = base64.b64encode(
            hmac.new(
                self.api_secret.encode('utf-8'),
                self.passphrase.encode('utf-8'),
                hashlib.sha256
            ).digest()
        ).decode()
        
        return signature, passphrase
    
    def _get_base_url(self, is_futures: bool) -> str:
        return self.FUTURES_BASE_URL if is_futures else self.SPOT_BASE_URL
    
    async def get_balance(self, is_futures: bool = False) -> Dict:
        """Get account balance"""
        try:
            base_url = self._get_base_url(is_futures)
            timestamp = str(int(time.time() * 1000))
            method = "GET"
            endpoint = "/api/v1/account-overview" if is_futures else "/api/v1/accounts"
            
            signature, passphrase = self._generate_signature(timestamp, method, endpoint)
            
            headers = {
                "KC-API-KEY": self.api_key,
                "KC-API-SIGN": signature,
                "KC-API-TIMESTAMP": timestamp,
                "KC-API-PASSPHRASE": passphrase,
                "KC-API-KEY-VERSION": "2"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["code"] == "200000":
                    if is_futures:
                        account_data = data["data"]
                        return {
                            "total": float(account_data.get("accountEquity", 0)),
                            "available": float(account_data.get("availableBalance", 0)),
                            "currency": "USDT"
                        }
                    else:
                        # Find USDT balance in spot
                        for account in data["data"]:
                            if account["currency"] == "USDT" and account["type"] == "trade":
                                return {
                                    "total": float(account["balance"]),
                                    "available": float(account["available"]),
                                    "currency": "USDT"
                                }
                        return {"total": 0, "available": 0, "currency": "USDT"}
                else:
                    raise Exception(f"KuCoin API error: {data.get('msg', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"KuCoin balance error: {str(e)}")
    
    async def get_current_price(self, symbol: str, is_futures: bool = False) -> float:
        """Get current market price"""
        try:
            base_url = self._get_base_url(is_futures)
            endpoint = "/api/v1/ticker" if is_futures else "/api/v1/market/orderbook/level1"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    params={"symbol": symbol}
                )
                response.raise_for_status()
                data = response.json()
                
                if data["code"] == "200000":
                    if is_futures:
                        return float(data["data"]["price"])
                    else:
                        return float(data["data"]["price"])
                else:
                    raise Exception(f"Price not found for {symbol}")
                    
        except Exception as e:
            raise Exception(f"KuCoin price error: {str(e)}")
    
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
            timestamp = str(int(time.time() * 1000))
            method = "POST"
            
            if is_futures:
                # Set leverage
                leverage_endpoint = "/api/v1/position"
                leverage_body = json.dumps({
                    "symbol": symbol,
                    "leverage": leverage
                })
                
                leverage_signature, passphrase = self._generate_signature(
                    timestamp, method, leverage_endpoint, leverage_body
                )
                
                headers = {
                    "KC-API-KEY": self.api_key,
                    "KC-API-SIGN": leverage_signature,
                    "KC-API-TIMESTAMP": timestamp,
                    "KC-API-PASSPHRASE": passphrase,
                    "KC-API-KEY-VERSION": "2",
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    await client.post(
                        f"{base_url}{leverage_endpoint}",
                        content=leverage_body,
                        headers=headers
                    )
                
                # Create futures order
                order_endpoint = "/api/v1/orders"
                order_body = json.dumps({
                    "clientOid": str(int(time.time() * 1000)),
                    "side": side.lower(),
                    "symbol": symbol,
                    "type": "market",
                    "size": int(amount)
                })
            else:
                # Create spot order
                order_endpoint = "/api/v1/orders"
                order_body = json.dumps({
                    "clientOid": str(int(time.time() * 1000)),
                    "side": side.lower(),
                    "symbol": symbol,
                    "type": "market",
                    "size": str(amount)
                })
            
            timestamp = str(int(time.time() * 1000))
            signature, passphrase = self._generate_signature(timestamp, method, order_endpoint, order_body)
            
            headers = {
                "KC-API-KEY": self.api_key,
                "KC-API-SIGN": signature,
                "KC-API-TIMESTAMP": timestamp,
                "KC-API-PASSPHRASE": passphrase,
                "KC-API-KEY-VERSION": "2",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}{order_endpoint}",
                    content=order_body,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
                    
        except Exception as e:
            raise Exception(f"KuCoin order error: {str(e)}")
    
    async def get_positions(self, is_futures: bool = False) -> List[Dict]:
        """Get open positions"""
        try:
            if not is_futures:
                return []
            
            base_url = self._get_base_url(is_futures)
            timestamp = str(int(time.time() * 1000))
            method = "GET"
            endpoint = "/api/v1/positions"
            
            signature, passphrase = self._generate_signature(timestamp, method, endpoint)
            
            headers = {
                "KC-API-KEY": self.api_key,
                "KC-API-SIGN": signature,
                "KC-API-TIMESTAMP": timestamp,
                "KC-API-PASSPHRASE": passphrase,
                "KC-API-KEY-VERSION": "2"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{base_url}{endpoint}",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["code"] == "200000":
                    active_positions = []
                    for pos in data["data"]:
                        current_qty = float(pos.get("currentQty", 0))
                        if current_qty != 0:
                            active_positions.append({
                                "symbol": pos["symbol"],
                                "side": "LONG" if current_qty > 0 else "SHORT",
                                "amount": abs(current_qty),
                                "entry_price": float(pos["avgEntryPrice"]),
                                "current_price": float(pos["markPrice"]),
                                "unrealized_pnl": float(pos["unrealisedPnl"]),
                                "leverage": int(pos["realLeverage"])
                            })
                    
                    return active_positions
                else:
                    raise Exception(f"KuCoin API error: {data.get('msg', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"KuCoin positions error: {str(e)}")


async def get_balance(api_key: str, api_secret: str, is_futures: bool = False, passphrase: str = "") -> Dict:
    service = KuCoinService(api_key, api_secret, passphrase)
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
    sl_percentage: float = 0,
    passphrase: str = ""
) -> Dict:
    service = KuCoinService(api_key, api_secret, passphrase)
    return await service.create_order(symbol, side, amount, leverage, is_futures, tp_percentage, sl_percentage)

async def get_positions(api_key: str, api_secret: str, is_futures: bool = False, passphrase: str = "") -> List[Dict]:
    service = KuCoinService(api_key, api_secret, passphrase)
    return await service.get_positions(is_futures)

async def get_current_price(api_key: str, api_secret: str, symbol: str, is_futures: bool = False, passphrase: str = "") -> float:
    service = KuCoinService(api_key, api_secret, passphrase)
    return await service.get_current_price(symbol, is_futures)
