import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Balance {
  exchange: string;
  type: 'spot' | 'futures';
  totalBalance: number;
  availableBalance: number;
  usedBalance: number;
  currency: string;
  loading: boolean;
  error?: string;
}

const API_BASE_URL = 'https://aitraderglobal.onrender.com';

export const useBalance = (exchanges: string[], isFutures: boolean = true) => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || exchanges.length === 0) {
      setBalances([]);
      setLoading(false);
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      const results: Balance[] = [];

      for (const exchange of exchanges) {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.get(
            `${API_BASE_URL}/api/bot/balance/${exchange}`,
            {
              params: { is_futures: isFutures },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          results.push({
            exchange: exchange,
            type: isFutures ? 'futures' : 'spot',
            totalBalance: response.data.total_balance || 0,
            availableBalance: response.data.available_balance || 0,
            usedBalance: response.data.used_balance || 0,
            currency: response.data.currency || 'USDT',
            loading: false,
          });
        } catch (error: any) {
          console.error(`❌ Failed to fetch balance for ${exchange}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            detail: error.response?.data?.detail,
            message: error.message,
            fullError: error
          });

          const errorMessage = error.response?.data?.detail
            || error.response?.data?.message
            || error.message
            || 'Bakiye alınamadı. API anahtarlarınızı kontrol edin.';

          results.push({
            exchange: exchange,
            type: isFutures ? 'futures' : 'spot',
            totalBalance: 0,
            availableBalance: 0,
            usedBalance: 0,
            currency: 'USDT',
            loading: false,
            error: errorMessage,
          });
        }
      }

      setBalances(results);
      setLoading(false);
    };

    fetchBalances();
  }, [user, exchanges, isFutures]);

  const refreshBalances = async () => {
    if (!user || exchanges.length === 0) return;
    
    setLoading(true);
    const results: Balance[] = [];

    for (const exchange of exchanges) {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(
          `${API_BASE_URL}/api/bot/balance/${exchange}`,
          {
            params: { is_futures: isFutures },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        results.push({
          exchange: exchange,
          type: isFutures ? 'futures' : 'spot',
          totalBalance: response.data.total_balance || 0,
          availableBalance: response.data.available_balance || 0,
          usedBalance: response.data.used_balance || 0,
          currency: response.data.currency || 'USDT',
          loading: false,
        });
      } catch (error: any) {
        console.error(`❌ Failed to refresh balance for ${exchange}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          detail: error.response?.data?.detail,
          message: error.message,
          fullError: error
        });

        const errorMessage = error.response?.data?.detail
          || error.response?.data?.message
          || error.message
          || 'Bakiye alınamadı. API anahtarlarınızı kontrol edin.';

        results.push({
          exchange: exchange,
          type: isFutures ? 'futures' : 'spot',
          totalBalance: 0,
          availableBalance: 0,
          usedBalance: 0,
          currency: 'USDT',
          loading: false,
          error: errorMessage,
        });
      }
    }

    setBalances(results);
    setLoading(false);
  };

  return { balances, loading, refreshBalances };
};
