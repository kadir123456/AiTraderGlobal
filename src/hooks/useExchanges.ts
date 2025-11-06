import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { exchangeAPI } from '@/lib/api';

interface Exchange {
  id: string;
  name: string;
  status: 'connected' | 'error';
  addedAt: string;
  lastChecked: string;
}

interface AddExchangeParams {
  name: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
}

export const useExchanges = () => {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);

  // Exchange limits per plan: Free = 1, Pro = unlimited, Enterprise = unlimited
  const exchangeLimit = tier === 'free' ? 1 : -1; // -1 means unlimited
  const canAddMore = exchangeLimit === -1 || exchanges.length < exchangeLimit;

  useEffect(() => {
    if (!user) {
      setExchanges([]);
      setLoading(false);
      return;
    }

    const fetchExchanges = async () => {
      try {
        const response = await exchangeAPI.getApiKeys();
        setExchanges(response.data.exchanges || []);
      } catch (error) {
        console.error('Failed to fetch exchanges:', error);
        setExchanges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExchanges();
  }, [user]);

  const addExchange = async ({ name, apiKey, apiSecret, passphrase }: AddExchangeParams) => {
    if (!user) throw new Error('User not authenticated');

    // Check exchange limit before adding
    if (!canAddMore) {
      throw new Error(`Exchange limit reached. Your ${tier} plan allows ${exchangeLimit} exchange${exchangeLimit === 1 ? '' : 's'}.`);
    }

    await exchangeAPI.addApiKey(name, apiKey, apiSecret, passphrase);
    const response = await exchangeAPI.getApiKeys();
    setExchanges(response.data.exchanges || []);
    return { success: true };
  };

  const removeExchange = async (exchangeId: string) => {
    if (!user) throw new Error('User not authenticated');
    await exchangeAPI.removeApiKey(exchangeId);
    const response = await exchangeAPI.getApiKeys();
    setExchanges(response.data.exchanges || []);
    return { success: true };
  };

  return { exchanges, loading, addExchange, removeExchange, canAddMore, exchangeLimit };
};
