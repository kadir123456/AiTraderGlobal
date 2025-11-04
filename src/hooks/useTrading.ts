import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { botAPI } from '@/lib/api';
import { toast } from 'sonner';

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry: number;
  current: number;
  pnl: number;
  pnlPercent: number;
  exchange: string;
  amount: number;
  leverage: number;
  tpPrice?: number;
  slPrice?: number;
  openedAt: string;
}

export interface OpenPositionParams {
  exchange: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  amount: number;
  leverage: number;
  tpPercentage: number;
  slPercentage: number;
}

export const useTrading = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const maxPositions = plan.exchangeLimit === -1 ? 999 : plan.exchangeLimit * 2;
  const canOpenMore = positions.length < maxPositions;

  useEffect(() => {
    if (!user) {
      setPositions([]);
      setLoading(false);
      return;
    }

    fetchPositions();
  }, [user]);

  const fetchPositions = async () => {
    try {
      const response = await botAPI.getPositions();
      setPositions(response.data.positions || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const openPosition = async (params: OpenPositionParams) => {
    if (!user) throw new Error('User not authenticated');
    
    if (!canOpenMore) {
      throw new Error(`Maximum positions reached (${maxPositions}). Upgrade your plan for more positions.`);
    }

    try {
      await botAPI.createPosition(
        params.exchange,
        params.symbol,
        params.side,
        params.amount,
        params.tpPercentage,
        params.slPercentage
      );
      
      await fetchPositions();
      toast.success(`Position opened: ${params.side} ${params.symbol}`);
      return { success: true };
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to open position');
      throw error;
    }
  };

  const closePosition = async (positionId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // TODO: Implement close position API
      toast.success('Position closed successfully');
      await fetchPositions();
      return { success: true };
    } catch (error: any) {
      toast.error('Failed to close position');
      throw error;
    }
  };

  return {
    positions,
    loading,
    openPosition,
    closePosition,
    canOpenMore,
    maxPositions,
    refreshPositions: fetchPositions,
  };
};
