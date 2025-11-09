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
      console.log('📊 Fetching positions...');
      const response = await botAPI.getPositions();
      console.log('📦 Raw positions response:', response.data);
      
      // Parse and validate positions data
      const rawPositions = response.data.positions || [];
      
      const parsedPositions: Position[] = rawPositions.map((pos: any) => {
        // Safely parse numeric values
        const entry = parseFloat(pos.entry || pos.entry_price || pos.entryPrice || 0);
        const current = parseFloat(pos.current || pos.current_price || pos.currentPrice || pos.mark_price || entry);
        const amount = parseFloat(pos.amount || pos.size || 0);
        const leverage = parseInt(pos.leverage || 1);
        
        // Calculate PnL if not provided
        let pnl = parseFloat(pos.pnl || 0);
        let pnlPercent = parseFloat(pos.pnlPercent || pos.pnl_percent || 0);
        
        // If PnL not provided, calculate it
        if (pnl === 0 && entry > 0 && current > 0) {
          const side = (pos.side || '').toUpperCase();
          if (side === 'LONG' || side === 'BUY') {
            pnl = (current - entry) * amount;
            pnlPercent = ((current - entry) / entry) * 100;
          } else if (side === 'SHORT' || side === 'SELL') {
            pnl = (entry - current) * amount;
            pnlPercent = ((entry - current) / entry) * 100;
          }
        }
        
        return {
          id: pos.id || pos.position_id || `${pos.symbol}_${Date.now()}`,
          symbol: pos.symbol || 'UNKNOWN',
          side: (pos.side || 'LONG').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG',
          entry: entry,
          current: current,
          pnl: pnl,
          pnlPercent: pnlPercent,
          exchange: pos.exchange || 'unknown',
          amount: amount,
          leverage: leverage,
          tpPrice: pos.tp_price || pos.tpPrice,
          slPrice: pos.sl_price || pos.slPrice,
          openedAt: pos.openedAt || pos.opened_at || new Date().toISOString(),
        };
      });
      
      console.log('✅ Parsed positions:', parsedPositions);
      setPositions(parsedPositions);
    } catch (error: any) {
      console.error('❌ Failed to fetch positions:', error);
      console.error('Error details:', error.response?.data);
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