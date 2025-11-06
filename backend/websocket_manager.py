"""
WebSocket Manager for Broadcasting Trading Signals
Handles 1000+ concurrent connections efficiently with keep-alive
"""
import asyncio
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and broadcasts signals to all connected clients"""

    def __init__(self):
        # Active WebSocket connections
        self.active_connections: Set[WebSocket] = set()
        
        # Keep-alive tasks for each connection
        self.keep_alive_tasks: Dict[WebSocket, asyncio.Task] = {}

        # Statistics
        self.total_connections = 0
        self.total_broadcasts = 0

        logger.info("🚀 WebSocket ConnectionManager initialized")

    async def connect(self, websocket: WebSocket) -> None:
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.total_connections += 1

        logger.info(f"✅ New WebSocket connection. Active: {len(self.active_connections)}, Total: {self.total_connections}")

        # Send welcome message
        await self.send_personal_message({
            "type": "connection",
            "status": "connected",
            "message": "Connected to EMA Navigator signal stream",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Start keep-alive task for this connection
        task = asyncio.create_task(self._keep_alive(websocket))
        self.keep_alive_tasks[websocket] = task

    async def _keep_alive(self, websocket: WebSocket) -> None:
        """Send periodic ping to keep connection alive"""
        try:
            while websocket in self.active_connections:
                await asyncio.sleep(30)  # Ping every 30 seconds
                
                if websocket in self.active_connections:
                    try:
                        await websocket.send_json({
                            "type": "ping",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        logger.debug(f"📡 Sent ping to client")
                    except Exception as e:
                        logger.error(f"Ping failed: {e}")
                        break
                        
        except asyncio.CancelledError:
            logger.debug("Keep-alive task cancelled")
        except Exception as e:
            logger.error(f"Keep-alive error: {e}")
        finally:
            if websocket in self.active_connections:
                await self.disconnect(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove WebSocket connection"""
        self.active_connections.discard(websocket)
        
        # Cancel keep-alive task
        if websocket in self.keep_alive_tasks:
            task = self.keep_alive_tasks.pop(websocket)
            if not task.done():
                task.cancel()
                
        logger.info(f"❌ WebSocket disconnected. Active: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket) -> None:
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            await self.disconnect(websocket)

    async def broadcast_signal(self, signal: Dict[str, Any]) -> None:
        """
        Broadcast trading signal to ALL connected clients
        This is the core function for scalability
        """
        if not self.active_connections:
            logger.debug("No active connections to broadcast to")
            return

        self.total_broadcasts += 1

        # Add metadata
        broadcast_message = {
            "type": "signal",
            "data": signal,
            "timestamp": datetime.utcnow().isoformat(),
            "broadcast_id": self.total_broadcasts
        }

        logger.info(f"📡 Broadcasting signal to {len(self.active_connections)} clients: {signal.get('signal')} {signal.get('symbol')} @ {signal.get('exchange')}")

        # Broadcast to all connections concurrently
        disconnected = set()

        for connection in self.active_connections.copy():
            try:
                await connection.send_json(broadcast_message)
            except WebSocketDisconnect:
                disconnected.add(connection)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            await self.disconnect(connection)

        logger.info(f"✅ Broadcast completed. Sent to {len(self.active_connections) - len(disconnected)} clients")

    async def broadcast_status(self, status: Dict[str, Any]) -> None:
        """Broadcast system status updates"""
        message = {
            "type": "status",
            "data": status,
            "timestamp": datetime.utcnow().isoformat()
        }

        disconnected = set()
        for connection in self.active_connections.copy():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting status: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            await self.disconnect(connection)

    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "active_connections": len(self.active_connections),
            "total_connections": self.total_connections,
            "total_broadcasts": self.total_broadcasts,
            "keep_alive_tasks": len(self.keep_alive_tasks)
        }


# Global singleton instance
connection_manager = ConnectionManager()
