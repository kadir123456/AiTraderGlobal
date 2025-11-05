import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

export interface Transaction {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  exchange: string;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  fee: number;
  openedAt: string;
  closedAt: string;
  type: 'manual' | 'auto';
}

const API_BASE_URL = 'https://aitraderglobal.onrender.com';

export const useTransactionHistory = (hours: number = 24) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(
          `${API_BASE_URL}/api/bot/transactions`,
          {
            params: { hours },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        // Mock data for development
        setTransactions([
          {
            id: '1',
            symbol: 'BTCUSDT',
            side: 'LONG',
            exchange: 'binance',
            entryPrice: 43250,
            exitPrice: 43890,
            amount: 100,
            leverage: 10,
            pnl: 148,
            pnlPercent: 14.8,
            fee: 2,
            openedAt: new Date(Date.now() - 3600000).toISOString(),
            closedAt: new Date(Date.now() - 1800000).toISOString(),
            type: 'manual',
          },
          {
            id: '2',
            symbol: 'ETHUSDT',
            side: 'SHORT',
            exchange: 'bybit',
            entryPrice: 2280,
            exitPrice: 2250,
            amount: 50,
            leverage: 5,
            pnl: 65.8,
            pnlPercent: 13.16,
            fee: 1.2,
            openedAt: new Date(Date.now() - 7200000).toISOString(),
            closedAt: new Date(Date.now() - 5400000).toISOString(),
            type: 'auto',
          },
          {
            id: '3',
            symbol: 'BNBUSDT',
            side: 'LONG',
            exchange: 'binance',
            entryPrice: 315,
            exitPrice: 310,
            amount: 30,
            leverage: 8,
            pnl: -12,
            pnlPercent: -4.0,
            fee: 0.8,
            openedAt: new Date(Date.now() - 10800000).toISOString(),
            closedAt: new Date(Date.now() - 9000000).toISOString(),
            type: 'manual',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, hours]);

  const refreshTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_BASE_URL}/api/bot/transactions`,
        {
          params: { hours },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return { transactions, loading, refreshTransactions };
};
