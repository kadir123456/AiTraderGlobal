import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get, set, update } from 'firebase/database';
import { database } from '@/lib/firebase';

export interface TradingSettings {
  // Spot settings
  spot_enabled: boolean;
  spot_watchlist: string[];
  spot_default_amount: number;
  spot_default_tp: number;
  spot_default_sl: number;
  
  // Futures settings
  futures_enabled: boolean;
  futures_watchlist: string[];
  futures_default_amount: number;
  futures_default_leverage: number;
  futures_default_tp: number;
  futures_default_sl: number;
  
  // Common settings
  interval: string;
  exchange: string;
  
  // Legacy settings (for backward compatibility)
  defaultTP?: number;
  defaultSL?: number;
  riskPerTrade?: number;
  maxPositions?: number;
  defaultLeverage?: number;
}

const DEFAULT_SETTINGS: TradingSettings = {
  // Spot defaults
  spot_enabled: false,
  spot_watchlist: [],
  spot_default_amount: 10,
  spot_default_tp: 5,
  spot_default_sl: 2,
  
  // Futures defaults
  futures_enabled: false,
  futures_watchlist: [],
  futures_default_amount: 10,
  futures_default_leverage: 10,
  futures_default_tp: 5,
  futures_default_sl: 2,
  
  // Common defaults
  interval: '15m',
  exchange: 'binance',
  
  // Legacy defaults
  defaultTP: 2.0,
  defaultSL: 1.0,
  riskPerTrade: 2.0,
  maxPositions: 3,
  defaultLeverage: 10,
};

export const useTradingSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TradingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        // ✅ FIXED: Use trading_settings/{user_id} path
        const settingsRef = ref(database, `trading_settings/${user.uid}`);
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('✅ Trading settings loaded:', data);
          
          // Merge with defaults to ensure all fields exist
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data
          });
        } else {
          console.log('⚠️ No trading settings found, using defaults');
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('❌ Failed to fetch trading settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<TradingSettings>) => {
    if (!user) {
      console.error('❌ Cannot update settings: User not logged in');
      return;
    }

    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      // ✅ FIXED: Use trading_settings/{user_id} path
      const settingsRef = ref(database, `trading_settings/${user.uid}`);
      await update(settingsRef, {
        ...updated,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Trading settings updated successfully');
    } catch (error) {
      console.error('❌ Failed to update trading settings:', error);
      throw error;
    }
  };

  const enableSpotTrading = async (enabled: boolean) => {
    await updateSettings({ spot_enabled: enabled });
  };

  const enableFuturesTrading = async (enabled: boolean) => {
    await updateSettings({ futures_enabled: enabled });
  };

  const addToSpotWatchlist = async (symbol: string) => {
    if (!settings.spot_watchlist.includes(symbol)) {
      await updateSettings({
        spot_watchlist: [...settings.spot_watchlist, symbol]
      });
    }
  };

  const addToFuturesWatchlist = async (symbol: string) => {
    if (!settings.futures_watchlist.includes(symbol)) {
      await updateSettings({
        futures_watchlist: [...settings.futures_watchlist, symbol]
      });
    }
  };

  const removeFromSpotWatchlist = async (symbol: string) => {
    await updateSettings({
      spot_watchlist: settings.spot_watchlist.filter(s => s !== symbol)
    });
  };

  const removeFromFuturesWatchlist = async (symbol: string) => {
    await updateSettings({
      futures_watchlist: settings.futures_watchlist.filter(s => s !== symbol)
    });
  };

  return {
    settings,
    loading,
    updateSettings,
    enableSpotTrading,
    enableFuturesTrading,
    addToSpotWatchlist,
    addToFuturesWatchlist,
    removeFromSpotWatchlist,
    removeFromFuturesWatchlist,
  };
};