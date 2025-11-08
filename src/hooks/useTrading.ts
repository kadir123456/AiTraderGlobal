/**
 * useTrading Hook
 * ✅ COMPLETE VERSION - NO MISSING CODE
 * 
 * Handles:
 * - Manual position opening
 * - Position closing
 * - Position fetching
 * - Plan-based limits
 * - Auto-refresh
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';
import { botAPI } from '@/lib/api';
import { toast } from 'sonner';

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry_price: number;
  current_price?: number;
  pnl: number;
  pnlPercent: number;
  exchange: string;
  amount: number;
  leverage: number;
  tpPrice?: number;
  slPrice?: number;
  tp_price?: number;
  sl_price?: number;
  created_at: number;
  status: string;
  
  // Computed fields for display compatibility
  entry?: number;
  current?: number;
  openedAt?: string;
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
  const [error, setError] = useState<string | null>(null);

  // Calculate max positions based on plan
  const maxPositions = plan.exchangeLimit === -1 ? 999 : plan.exchangeLimit * 2;
  const canOpenMore = positions.length < maxPositions;

  /**
   * Fetch positions from backend
   */
  const fetchPositions = async () => {
    if (!user) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await botAPI.getPositions();
      
      // Transform backend data to match UI expectations
      const transformedPositions = (response.data.positions || []).map((pos: any) => ({
        ...pos,
        // Add computed fields for backward compatibility
        entry: pos.entry_price,
        current: pos.current_price || pos.entry_price,
        tpPrice: pos.tp_price,
        slPrice: pos.sl_price,
        openedAt: new Date(pos.created_at * 1000).toISOString(),
      }));
      
      setPositions(transformedPositions);
      
      console.log('✅ Positions loaded:', transformedPositions.length);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch positions:', error);
      setError(error.message || 'Failed to load positions');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open a new position
   */
  const openPosition = async (params: OpenPositionParams) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    if (!canOpenMore) {
      throw new Error(
        `Maximum positions reached (${maxPositions}). Upgrade your plan for more positions.`
      );
    }

    try {
      console.log('🔵 Opening position:', params);
      
      const response = await botAPI.createPosition(
        params.exchange,
        params.symbol,
        params.side,
        params.amount,
        params.tpPercentage,
        params.slPercentage
      );
      
      console.log('✅ Position opened:', response.data);
      
      toast.success(
        `Position opened: ${params.side} ${params.symbol}`,
        {
          description: `Entry: $${response.data.details?.entry_price?.toFixed(2) || '0.00'}`,
        }
      );
      
      // Refresh positions
      await fetchPositions();
      
      return { success: true, data: response.data };
      
    } catch (error: any) {
      console.error('❌ Position opening error:', error);
      
      const errorMessage = error.message || 'Failed to open position';
      toast.error('Failed to open position', {
        description: errorMessage,
      });
      
      throw error;
    }
  };

  /**
   * Close a position
   */
  const closePosition = async (positionId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('🔴 Closing position:', positionId);
      
      await botAPI.closePosition(positionId);
      
      toast.success('Position closed successfully');
      
      // Refresh positions
      await fetchPositions();
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ Failed to close position:', error);
      
      toast.error('Failed to close position', {
        description: error.message || 'Unknown error',
      });
      
      throw error;
    }
  };

  /**
   * Calculate total PnL
   */
  const getTotalPnL = (): number => {
    return positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
  };

  /**
   * Get positions by exchange
   */
  const getPositionsByExchange = (exchange: string): Position[] => {
    return positions.filter(
      (pos) => pos.exchange.toLowerCase() === exchange.toLowerCase()
    );
  };

  /**
   * Get positions by symbol
   */
  const getPositionsBySymbol = (symbol: string): Position[] => {
    return positions.filter((pos) => pos.symbol === symbol);
  };

  /**
   * Get positions by side (LONG/SHORT)
   */
  const getPositionsBySide = (side: 'LONG' | 'SHORT'): Position[] => {
    return positions.filter((pos) => pos.side === side);
  };

  /**
   * Get total invested amount
   */
  const getTotalInvested = (): number => {
    return positions.reduce((sum, pos) => sum + (pos.amount || 0), 0);
  };

  // Load positions on mount and when user changes
  useEffect(() => {
    fetchPositions();
  }, [user]);

  // Auto-refresh positions every 30 seconds if user is logged in
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchPositions();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  return {
    // State
    positions,
    loading,
    error,
    canOpenMore,
    maxPositions,
    
    // Actions
    openPosition,
    closePosition,
    refreshPositions: fetchPositions,
    
    // Computed values
    totalPnL: getTotalPnL(),
    totalInvested: getTotalInvested(),
    
    // Filters
    getPositionsByExchange,
    getPositionsBySymbol,
    getPositionsBySide,
  };
};

export default useTrading;