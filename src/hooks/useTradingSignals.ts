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
  type: 'signal' | 'connection' | 'status';
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

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        ws.addEventListener('close', () => {
          clearInterval(pingInterval);
        });
      };

      ws.onmessage = (event) => {
        try {
          // Handle pong response
          if (event.data === 'pong') {
            return;
          }

          const message: SignalMessage = JSON.parse(event.data);

          console.log('📨 WebSocket message received:', message.type);

          if (message.type === 'signal' && message.data) {
            const signal: TradingSignal = {
              ...message.data,
              timestamp: message.timestamp
            };

            console.log('🚨 New trading signal:', signal);

            setLatestSignal(signal);
            setSignals(prev => [signal, ...prev].slice(0, 50)); // Keep last 50 signals
          } else if (message.type === 'connection') {
            console.log('✅ Connection confirmed:', message.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
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

        // Reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 10) {
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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
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
