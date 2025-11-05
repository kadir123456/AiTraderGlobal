import hmac
import hashlib
import base64
import time
from typing import Dict, List, Optional
import httpx
import json
from datetime import datetime

class OKXService:
    BASE_URL = "https://www.okx.com"
    
    def __init__(self, api_key: str, api_secret: str, passphrase: str = ""):
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        
    def _generate_signature(self, timestamp: str, method: str, request_path: str, body: str = "") -> str:
        """Generate HMAC SHA256 signature for OKX"""
        message = timestamp + method + request_path + body
        mac = hmac.new(
            self.api_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        )
        return base64.b64encode(mac.digest()).decode()
    
    async def get_balance(self, is_futures: bool = False) -> Dict:
        """Get account balance"""
        try:
            timestamp = datetime.utcnow().isoformat("T", "milliseconds") + "Z"
            method = "GET"
            request_path = "/api/v5/account/balance"
            
            signature = self._generate_signature(timestamp, method, request_path)
            
            headers = {
                "OK-ACCESS-KEY": self.api_key,
                "OK-ACCESS-SIGN": signature,
                "OK-ACCESS-TIMESTAMP": timestamp,
                "OK-ACCESS-PASSPHRASE": self.passphrase,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}{request_path}",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["code"] == "0":
                    details = data["data"][0]["details"]
                    for detail in details:
                        if detail["ccy"] == "USDT":
                            return {
                                "total": float(detail["eq"]),
                                "available": float(detail["availBal"]),
                                "currency": "USDT"
                            }
                    
                    return {"total": 0, "available": 0, "currency": "USDT"}
                else:
                    raise Exception(f"OKX API error: {data.get('msg', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"OKX balance error: {str(e)}")
    
    async def get_current_price(self, symbol: str, is_futures: bool = False) -> float:
        """Get current market price"""
        try:
            # OKX uses instId format like BTC-USDT-SWAP for futures
            inst_type = "SWAP" if is_futures else "SPOT"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/api/v5/market/ticker",
                    params={"instId": symbol}
                )
                response.raise_for_status()
                data = response.json()
                
                if data["code"] == "0" and data["data"]:
                    return float(data["data"][0]["last"])
                else:
                    raise Exception(f"Price not found for {symbol}")
                    
        except Exception as e:
            raise Exception(f"OKX price error: {str(e)}")
    
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
            timestamp = datetime.utcnow().isoformat("T", "milliseconds") + "Z"
            method = "POST"
            
            # Set leverage for futures
            if is_futures:
                leverage_path = "/api/v5/account/set-leverage"
                leverage_body = json.dumps({
                    "instId": symbol,
                    "lever": str(leverage),
                    "mgnMode": "cross"
                })
                
                leverage_signature = self._generate_signature(timestamp, method, leverage_path, leverage_body)
                
                headers = {
                    "OK-ACCESS-KEY": self.api_key,
                    "OK-ACCESS-SIGN": leverage_signature,
                    "OK-ACCESS-TIMESTAMP": timestamp,
                    "OK-ACCESS-PASSPHRASE": self.passphrase,
                    "Content-Type": "application/json"
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    await client.post(
                        f"{self.BASE_URL}{leverage_path}",
                        content=leverage_body,
                        headers=headers
                    )
            
            # Create order
            request_path = "/api/v5/trade/order"
            order_body = {
                "instId": symbol,
                "tdMode": "cross" if is_futures else "cash",
                "side": "buy" if side == "BUY" else "sell",
                "ordType": "market",
                "sz": str(amount)
            }
            
            body_str = json.dumps(order_body)
            timestamp = datetime.utcnow().isoformat("T", "milliseconds") + "Z"
            signature = self._generate_signature(timestamp, method, request_path, body_str)
            
            headers = {
                "OK-ACCESS-KEY": self.api_key,
                "OK-ACCESS-SIGN": signature,
                "OK-ACCESS-TIMESTAMP": timestamp,
                "OK-ACCESS-PASSPHRASE": self.passphrase,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}{request_path}",
                    content=body_str,
                    headers=headers
                )
                response.raise_for_status()
                return response.json()
                    
        except Exception as e:
            raise Exception(f"OKX order error: {str(e)}")
    
    async def get_positions(self, is_futures: bool = False) -> List[Dict]:
        """Get open positions"""
        try:
            if not is_futures:
                return []
            
            timestamp = datetime.utcnow().isoformat("T", "milliseconds") + "Z"
            method = "GET"
            request_path = "/api/v5/account/positions"
            
            signature = self._generate_signature(timestamp, method, request_path)
            
            headers = {
                "OK-ACCESS-KEY": self.api_key,
                "OK-ACCESS-SIGN": signature,
                "OK-ACCESS-TIMESTAMP": timestamp,
                "OK-ACCESS-PASSPHRASE": self.passphrase,
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}{request_path}",
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                
                if data["code"] == "0":
                    active_positions = []
                    for pos in data["data"]:
                        pos_amt = float(pos.get("pos", 0))
                        if pos_amt != 0:
                            active_positions.append({
                                "symbol": pos["instId"],
                                "side": "LONG" if pos["posSide"] == "long" else "SHORT",
                                "amount": abs(pos_amt),
                                "entry_price": float(pos["avgPx"]),
                                "current_price": float(pos["markPx"]),
                                "unrealized_pnl": float(pos["upl"]),
                                "leverage": int(pos["lever"])
                            })
                    
                    return active_positions
                else:
                    raise Exception(f"OKX API error: {data.get('msg', 'Unknown error')}")
                    
        except Exception as e:
            raise Exception(f"OKX positions error: {str(e)}")


async def get_balance(api_key: str, api_secret: str, is_futures: bool = False, passphrase: str = "") -> Dict:
    service = OKXService(api_key, api_secret, passphrase)
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
    service = OKXService(api_key, api_secret, passphrase)
    return await service.create_order(symbol, side, amount, leverage, is_futures, tp_percentage, sl_percentage)

async def get_positions(api_key: str, api_secret: str, is_futures: bool = False, passphrase: str = "") -> List[Dict]:
    service = OKXService(api_key, api_secret, passphrase)
    return await service.get_positions(is_futures)

async def get_current_price(api_key: str, api_secret: str, symbol: str, is_futures: bool = False, passphrase: str = "") -> float:
    service = OKXService(api_key, api_secret, passphrase)
    return await service.get_current_price(symbol, is_futures)
