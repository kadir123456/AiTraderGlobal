import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TradingSignal {
  signal: 'BUY' | 'SELL';
  exchange: string;
  symbol: string;
  price: number;
  ema9: number;
  ema21: number;
  interval: string;
  user_id: string;
  timestamp: string;
}

interface SignalMessage {
  type: 'signal' | 'connection' | 'status' | 'ping' | 'pong';
  data?: TradingSignal;
  status?: string;
  message?: string;
  timestamp: string;
}

const WS_URL = import.meta.env.VITE_API_URL?.replace('https://', 'wss://').replace('http://', 'ws://') || 'ws://localhost:8000';
const WS_ENDPOINT = `${WS_URL}/ws/signals`;

export const useTradingSignals = () => {
  const { user } = useAuth();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [latestSignal, setLatestSignal] = useState<TradingSignal | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!user) {
      console.log('⚠️ User not logged in, skipping WebSocket connection');
      return;
    }

    try {
      console.log('🔌 Connecting to WebSocket:', WS_ENDPOINT);
      setConnectionStatus('connecting');

      const ws = new WebSocket(WS_ENDPOINT);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Clear any existing ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        // Send ping every 25 seconds (backend sends every 30s, we respond faster)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send('ping');
              console.debug('📡 Sent ping');
            } catch (error) {
              console.error('❌ Failed to send ping:', error);
            }
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          // Handle simple pong response (string)
          if (event.data === 'pong') {
            console.debug('📡 Received pong');
            return;
          }

          // Parse JSON messages
          const message: SignalMessage = JSON.parse(event.data);

          console.log('📨 WebSocket message received:', message.type);

          // Handle ping from server
          if (message.type === 'ping') {
            console.debug('📡 Received server ping, sending pong');
            ws.send('pong');
            return;
          }

          // Handle pong from server
          if (message.type === 'pong') {
            console.debug('📡 Received pong from server');
            return;
          }

          // Handle trading signal
          if (message.type === 'signal' && message.data) {
            const signal: TradingSignal = {
              ...message.data,
              timestamp: message.timestamp
            };

            console.log('🚨 New trading signal:', signal);

            setLatestSignal(signal);
            setSignals(prev => [signal, ...prev].slice(0, 50)); // Keep last 50 signals
          } 
          // Handle connection confirmation
          else if (message.type === 'connection') {
            console.log('✅ Connection confirmed:', message.message);
          }
          // Handle status updates
          else if (message.type === 'status') {
            console.log('📊 Status update:', message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Only reconnect if not a normal closure (code 1000) and user is still logged in
        if (event.code !== 1000 && user && reconnectAttemptsRef.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [user]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected'); // Normal closure
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  const clearSignals = useCallback(() => {
    setSignals([]);
    setLatestSignal(null);
  }, []);

  // Auto-connect when user logs in
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    signals,
    latestSignal,
    connectionStatus,
    connect,
    disconnect,
    clearSignals,
  };
};
