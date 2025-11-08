/**
 * AutoTradingToggle Component
 * ✅ COMPLETE VERSION - NO MISSING CODE
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, AlertCircle, TrendingUp, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useExchanges } from '@/hooks/useExchanges';
import { useAuth } from '@/contexts/AuthContext';
import { botAPI } from '@/lib/api';
import { toast } from 'sonner';

const AutoTradingToggle: React.FC = () => {
  const { tier, plan, canAccessFeature } = useSubscription();
  const { exchanges } = useExchanges();
  const { user } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('futures');
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [availableCoins, setAvailableCoins] = useState<string[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const canAccess = canAccessFeature && (canAccessFeature as any)('autoTrading');

  // Auto-select first exchange
  useEffect(() => {
    if (exchanges.length > 0 && !selectedExchangeId) {
      setSelectedExchangeId(exchanges[0].id);
    }
  }, [exchanges, selectedExchangeId]);

  // Load coins when exchange changes
  useEffect(() => {
    const loadSymbols = async () => {
      if (!selectedExchangeId) return;

      const ex = exchanges.find((e) => e.id === selectedExchangeId);
      if (!ex) return;

      setLoadingCoins(true);
      try {
        // Check if exchange already has symbols
        if ((ex as any).symbols && (ex as any).symbols.length > 0) {
          setAvailableCoins((ex as any).symbols.map((s: any) => s.symbol));
          return;
        }

        // Fetch from API
        const resp = await botAPI.getExchangeMarkets(ex.name.toLowerCase());
        if (resp?.data?.markets) {
          setAvailableCoins(resp.data.markets.map((m: any) => m.symbol));
        }
      } catch (err) {
        console.warn('Failed to load markets, using defaults:', err);
        // Fallback to popular coins
        setAvailableCoins([
          'BTCUSDT',
          'ETHUSDT',
          'BNBUSDT',
          'SOLUSDT',
          'XRPUSDT',
          'ADAUSDT',
          'DOGEUSDT',
          'AVAXUSDT',
        ]);
      } finally {
        setLoadingCoins(false);
      }
    };

    loadSymbols();
  }, [selectedExchangeId, exchanges]);

  // Load current auto-trading settings and status
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        const [settingsResp, statusResp] = await Promise.all([
          botAPI.getAutoTradingSettings(),
          botAPI.getAutoTradingStatus(),
        ]);

        const settings = settingsResp.data;
        if (settings) {
          setEnabled(settings.enabled || false);
          if (settings.watchlist && settings.watchlist.length > 0) {
            setSelectedCoin(settings.watchlist[0]);
          }
          if (settings.exchange) {
            const exchange = exchanges.find(
              (e) => e.name.toLowerCase() === settings.exchange.toLowerCase()
            );
            if (exchange) {
              setSelectedExchangeId(exchange.id);
            }
          }
        }

        setStatus(statusResp.data);
      } catch (err) {
        console.error('Failed to load auto-trading settings:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadSettings();
  }, [user, exchanges]);

  // Refresh status every 30 seconds
  useEffect(() => {
    if (!user || !enabled) return;

    const interval = setInterval(async () => {
      try {
        const statusResp = await botAPI.getAutoTradingStatus();
        setStatus(statusResp.data);
      } catch (err) {
        console.error('Failed to refresh status:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, enabled]);

  /**
   * Toggle auto-trading on/off
   */
  const handleToggle = async () => {
    if (!canAccess) {
      toast.error(
        `Auto-trading requires an active Pro or Enterprise plan. Your current plan: ${tier}`
      );
      return;
    }

    if (!selectedCoin) {
      toast.error('Please select a coin first');
      return;
    }

    if (!selectedExchangeId) {
      toast.error('Please select an exchange first');
      return;
    }

    setLoading(true);
    
    try {
      const ex = exchanges.find((e) => e.id === selectedExchangeId);
      if (!ex) {
        throw new Error('Exchange not found');
      }

      const newState = !enabled;

      const payload = {
        enabled: newState,
        exchange: ex.name.toLowerCase(),
        market: marketType,
        symbol: selectedCoin,
      };

      console.log('🔵 Updating auto-trading settings:', payload);

      const response = await botAPI.setAutoTrading(payload);

      console.log('✅ Auto-trading settings updated:', response.data);

      setEnabled(newState);
      
      // Refresh status
      const statusResp = await botAPI.getAutoTradingStatus();
      setStatus(statusResp.data);
      
      toast.success(
        newState ? 'Auto-trading enabled' : 'Auto-trading disabled',
        {
          description: newState
            ? `Monitoring ${selectedCoin} on ${ex.name}`
            : 'All monitoring stopped',
        }
      );
    } catch (err: any) {
      console.error('❌ Failed to update auto-trading:', err);
      
      const errorMessage = err.message || 'Failed to update auto-trading';
      toast.error('Auto-trading update failed', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Emergency stop button
   */
  const handleEmergencyStop = async () => {
    setLoading(true);
    
    try {
      await botAPI.stopAutoTrading();
      
      setEnabled(false);
      setStatus(null);
      
      toast.success('Auto-trading stopped immediately', {
        description: 'All monitoring has been halted',
      });
    } catch (err) {
      console.error('Failed to stop auto-trading:', err);
      toast.error('Failed to stop auto-trading');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (exchanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Auto Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect an exchange first to use auto-trading.
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4 w-full"
            onClick={() => (window.location.href = '/settings')}
          >
            Go to Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Auto Trading
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading || !canAccess}
            />
            <span
              className={`text-sm font-medium flex items-center gap-1 ${
                enabled ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {enabled ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  ON
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  OFF
                </>
              )}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Plan Warning */}
        {!canAccess && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Auto-trading requires an active Pro or Enterprise plan.
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => (window.location.href = '/#pricing')}
              >
                Upgrade Plan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Market Type Selection */}
        <div className="space-y-2">
          <Label>Market Type</Label>
          <Select
            value={marketType}
            onValueChange={(v) => setMarketType(v as 'spot' | 'futures')}
            disabled={enabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spot">Spot</SelectItem>
              <SelectItem value="futures">Futures</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Exchange Selection */}
        <div className="space-y-2">
          <Label>Exchange</Label>
          <Select
            value={selectedExchangeId}
            onValueChange={setSelectedExchangeId}
            disabled={enabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exchange" />
            </SelectTrigger>
            <SelectContent>
              {exchanges.map((ex) => (
                <SelectItem key={ex.id} value={ex.id}>
                  {ex.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coin Selection */}
        <div className="space-y-2">
          <Label>Trading Pair</Label>
          <Select
            value={selectedCoin}
            onValueChange={setSelectedCoin}
            disabled={enabled || loadingCoins}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select coin" />
            </SelectTrigger>
            <SelectContent>
              {loadingCoins ? (
                <SelectItem value="loading" disabled>
                  Loading coins...
                </SelectItem>
              ) : availableCoins.length === 0 ? (
                <SelectItem value="empty" disabled>
                  No coins available
                </SelectItem>
              ) : (
                availableCoins.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Strategy Info */}
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">EMA 9/21 Crossover Strategy</p>
              <p className="text-sm text-muted-foreground">
                Automatically opens positions when EMA 9 crosses EMA 21.
                Default: 10x leverage, 5% TP, 2% SL.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Status Info */}
        {enabled && status && (
          <div className="p-3 bg-success/10 border border-success rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle className="h-4 w-4" />
              Active Monitoring
            </div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Exchange:</span>
                <span className="font-medium text-foreground">
                  {exchanges.find((e) => e.id === selectedExchangeId)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Symbol:</span>
                <span className="font-medium text-foreground">{selectedCoin}</span>
              </div>
              <div className="flex justify-between">
                <span>Market:</span>
                <span className="font-medium text-foreground capitalize">{marketType}</span>
              </div>
              <div className="flex justify-between">
                <span>Monitors:</span>
                <span className="font-medium text-foreground">{status.active_monitors || 0}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span>Signals Today:</span>
                <span className="font-medium text-foreground">{status.signals_today || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleToggle}
            disabled={loading || !canAccess || !selectedCoin}
            variant={enabled ? 'outline' : 'default'}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : enabled ? (
              'Disable Auto-Trading'
            ) : (
              'Enable Auto-Trading'
            )}
          </Button>

          {enabled && (
            <Button
              variant="destructive"
              onClick={handleEmergencyStop}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Emergency Stop
            </Button>
          )}
        </div>

        {/* Help Text */}
        {!enabled && (
          <p className="text-xs text-muted-foreground text-center">
            Configure your preferred exchange and coin, then enable auto-trading to start monitoring EMA signals.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoTradingToggle;