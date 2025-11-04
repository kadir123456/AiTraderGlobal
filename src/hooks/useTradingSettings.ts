import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';

export interface TradingSettings {
  defaultTP: number;
  defaultSL: number;
  riskPerTrade: number;
  maxPositions: number;
  defaultLeverage: number;
}

const DEFAULT_SETTINGS: TradingSettings = {
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
        const settingsRef = ref(database, `users/${user.uid}/settings`);
        const snapshot = await get(settingsRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setSettings({
            defaultTP: data.defaultTP || DEFAULT_SETTINGS.defaultTP,
            defaultSL: data.defaultSL || DEFAULT_SETTINGS.defaultSL,
            riskPerTrade: data.riskPerTrade || DEFAULT_SETTINGS.riskPerTrade,
            maxPositions: data.maxPositions || DEFAULT_SETTINGS.maxPositions,
            defaultLeverage: data.defaultLeverage || DEFAULT_SETTINGS.defaultLeverage,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<TradingSettings>) => {
    if (!user) return;

    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      const settingsRef = ref(database, `users/${user.uid}/settings`);
      await set(settingsRef, {
        ...updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  return { settings, loading, updateSettings };
};
