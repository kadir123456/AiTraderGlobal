import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, X, TrendingUp, Clock, DollarSign, ShoppingCart, LineChart } from 'lucide-react';
import api from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';

interface AutoTradingSettings {
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
}

interface Signal {
  id: string;
  symbol: string;
  signal_type: 'bullish' | 'bearish';
  ema9: number;
  ema21: number;
  price: number;
  exchange: string;
  interval: string;
  timestamp: number;
  action_taken: boolean;
}

export const AutoTradingToggle = () => {
  const { t } = useTranslation();
  const { tier, canAccessFeature } = useSubscription();
  
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AutoTradingSettings>({
    // Spot defaults
    spot_enabled: false,
    spot_watchlist: ['BTCUSDT', 'ETHUSDT'],
    spot_default_amount: 10,
    spot_default_tp: 5,
    spot_default_sl: 2,
    
    // Futures defaults
    futures_enabled: false,
    futures_watchlist: ['BTCUSDT', 'ETHUSDT'],
    futures_default_amount: 10,
    futures_default_leverage: 10,
    futures_default_tp: 5,
    futures_default_sl: 2,
    
    // Common
    interval: '15m',
    exchange: 'binance',
  });
  
  const [newSymbolSpot, setNewSymbolSpot] = useState('');
  const [newSymbolFutures, setNewSymbolFutures] = useState('');
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchSignals();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auto-trading/settings');
      console.log('✅ Fetched settings:', response.data);
      setSettings(response.data);
    } catch (error) {
      console.error('❌ Failed to fetch auto-trading settings:', error);
    }
  };

  const fetchSignals = async () => {
    try {
      const response = await api.get('/api/auto-trading/signals/history?limit=10');
      setSignals(response.data.signals || []);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    }
  };

  const handleSpotToggle = async (checked: boolean) => {
    // Check feature access
    if (checked && !canAccessFeature('autoTrading')) {
      toast.error(
        `Spot auto-trading requires PRO or ENTERPRISE plan. Your plan: ${tier.toUpperCase()}`,
        { duration: 5000 }
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auto-trading/settings', {
        ...settings,
        spot_enabled: checked,
      });
      
      setSettings({ ...settings, spot_enabled: checked });
      
      toast.success(
        checked 
          ? '✅ Spot otomatik trading aktif!' 
          : '🛑 Spot otomatik trading durduruldu',
        { duration: 3000 }
      );
      
      fetchSignals();
    } catch (error: any) {
      console.error('❌ Spot toggle error:', error);
      
      const errorDetail = error.response?.data?.detail || error.message || 'Ayarlar güncellenemedi';
      
      toast.error(errorDetail, {
        duration: 5000,
        description: error.response?.status === 400 
          ? 'Lütfen exchange API anahtarlarınızı kontrol edin'
          : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFuturesToggle = async (checked: boolean) => {
    // Check feature access
    if (checked && !canAccessFeature('autoTrading')) {
      toast.error(
        `Futures auto-trading requires PRO or ENTERPRISE plan. Your plan: ${tier.toUpperCase()}`,
        { duration: 5000 }
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auto-trading/settings', {
        ...settings,
        futures_enabled: checked,
      });
      
      setSettings({ ...settings, futures_enabled: checked });
      
      toast.success(
        checked 
          ? '✅ Futures otomatik trading aktif!' 
          : '🛑 Futures otomatik trading durduruldu',
        { duration: 3000 }
      );
      
      fetchSignals();
    } catch (error: any) {
      console.error('❌ Futures toggle error:', error);
      
      const errorDetail = error.response?.data?.detail || error.message || 'Ayarlar güncellenemedi';
      
      toast.error(errorDetail, {
        duration: 5000,
        description: error.response?.status === 400 
          ? 'Lütfen exchange API anahtarlarınızı kontrol edin'
          : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.post('/api/auto-trading/settings', settings);
      toast.success('✅ Ayarlar kaydedildi!');
      fetchSignals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ayarlar kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = (type: 'spot' | 'futures') => {
    const symbol = type === 'spot' ? newSymbolSpot : newSymbolFutures;
    if (!symbol) return;
    
    const formattedSymbol = symbol.toUpperCase().trim();
    const watchlistKey = type === 'spot' ? 'spot_watchlist' : 'futures_watchlist';
    
    if (settings[watchlistKey].includes(formattedSymbol)) {
      toast.error('Bu coin zaten listede!');
      return;
    }
    
    setSettings({
      ...settings,
      [watchlistKey]: [...settings[watchlistKey], formattedSymbol]
    });
    
    if (type === 'spot') {
      setNewSymbolSpot('');
    } else {
      setNewSymbolFutures('');
    }
    
    toast.success(`${formattedSymbol} ${type} watchlist'e eklendi`);
  };

  const removeFromWatchlist = (type: 'spot' | 'futures', symbol: string) => {
    const watchlistKey = type === 'spot' ? 'spot_watchlist' : 'futures_watchlist';
    setSettings({
      ...settings,
      [watchlistKey]: settings[watchlistKey].filter((s) => s !== symbol)
    });
    toast.success(`${symbol} ${type} watchlist'ten çıkarıldı`);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('tr-TR');
  };

  return (
    <div className="space-y-6">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spot Trading Card */}
        <Card className={settings.spot_enabled ? "border-green-500/50" : "border-primary/20"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <CardTitle className="text-lg">Spot Trading</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {settings.spot_enabled ? (
                  <Badge variant="default" className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Kapalı</Badge>
                )}
                <Switch
                  checked={settings.spot_enabled}
                  onCheckedChange={handleSpotToggle}
                  disabled={loading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>İzlenen: {settings.spot_watchlist.length} coin</p>
              <p>Miktar: {settings.spot_default_amount} USDT</p>
              <p>TP/SL: {settings.spot_default_tp}% / {settings.spot_default_sl}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Futures Trading Card */}
        <Card className={settings.futures_enabled ? "border-green-500/50" : "border-primary/20"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                <CardTitle className="text-lg">Futures Trading</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {settings.futures_enabled ? (
                  <Badge variant="default" className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Kapalı</Badge>
                )}
                <Switch
                  checked={settings.futures_enabled}
                  onCheckedChange={handleFuturesToggle}
                  disabled={loading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>İzlenen: {settings.futures_watchlist.length} coin</p>
              <p>Miktar: {settings.futures_default_amount} USDT × {settings.futures_default_leverage}x</p>
              <p>TP/SL: {settings.futures_default_tp}% / {settings.futures_default_sl}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Ayarlar</CardTitle>
          <CardDescription>
            Spot ve Futures trading ayarlarını ayrı ayrı yapılandırın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="spot" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="spot">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Spot Trading
              </TabsTrigger>
              <TabsTrigger value="futures">
                <LineChart className="h-4 w-4 mr-2" />
                Futures Trading
              </TabsTrigger>
            </TabsList>

            {/* SPOT SETTINGS */}
            <TabsContent value="spot" className="space-y-6">
              {/* Watchlist */}
              <div className="space-y-3">
                <Label>Watchlist (İzlenecek Coinler)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="BTCUSDT"
                    value={newSymbolSpot}
                    onChange={(e) => setNewSymbolSpot(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addToWatchlist('spot')}
                  />
                  <Button onClick={() => addToWatchlist('spot')} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.spot_watchlist.map((symbol) => (
                    <Badge key={symbol} variant="secondary" className="gap-1">
                      {symbol}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeFromWatchlist('spot', symbol)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spot Amount */}
                <div className="space-y-2">
                  <Label>İşlem Miktarı (USDT)</Label>
                  <Input
                    type="number"
                    value={settings.spot_default_amount}
                    onChange={(e) =>
                      setSettings({ ...settings, spot_default_amount: parseFloat(e.target.value) })
                    }
                  />
                </div>

                {/* Spot Take Profit % */}
                <div className="space-y-2">
                  <Label>Take Profit %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.spot_default_tp}
                    onChange={(e) =>
                      setSettings({ ...settings, spot_default_tp: parseFloat(e.target.value) })
                    }
                  />
                </div>

                {/* Spot Stop Loss % */}
                <div className="space-y-2">
                  <Label>Stop Loss %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.spot_default_sl}
                    onChange={(e) =>
                      setSettings({ ...settings, spot_default_sl: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* FUTURES SETTINGS */}
            <TabsContent value="futures" className="space-y-6">
              {/* Watchlist */}
              <div className="space-y-3">
                <Label>Watchlist (İzlenecek Coinler)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="BTCUSDT"
                    value={newSymbolFutures}
                    onChange={(e) => setNewSymbolFutures(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addToWatchlist('futures')}
                  />
                  <Button onClick={() => addToWatchlist('futures')} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.futures_watchlist.map((symbol) => (
                    <Badge key={symbol} variant="secondary" className="gap-1">
                      {symbol}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeFromWatchlist('futures', symbol)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Futures Amount */}
                <div className="space-y-2">
                  <Label>İşlem Miktarı (USDT)</Label>
                  <Input
                    type="number"
                    value={settings.futures_default_amount}
                    onChange={(e) =>
                      setSettings({ ...settings, futures_default_amount: parseFloat(e.target.value) })
                    }
                  />
                </div>

                {/* Leverage */}
                <div className="space-y-2">
                  <Label>Kaldıraç (Leverage)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="125"
                    value={settings.futures_default_leverage}
                    onChange={(e) =>
                      setSettings({ ...settings, futures_default_leverage: parseInt(e.target.value) })
                    }
                  />
                </div>

                {/* Futures Take Profit % */}
                <div className="space-y-2">
                  <Label>Take Profit %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.futures_default_tp}
                    onChange={(e) =>
                      setSettings({ ...settings, futures_default_tp: parseFloat(e.target.value) })
                    }
                  />
                </div>

                {/* Futures Stop Loss % */}
                <div className="space-y-2">
                  <Label>Stop Loss %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.futures_default_sl}
                    onChange={(e) =>
                      setSettings({ ...settings, futures_default_sl: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common Settings */}
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exchange */}
              <div className="space-y-2">
                <Label>Borsa</Label>
                <Select
                  value={settings.exchange}
                  onValueChange={(value) => setSettings({ ...settings, exchange: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="okx">OKX</SelectItem>
                    <SelectItem value="kucoin">KuCoin</SelectItem>
                    <SelectItem value="mexc">MEXC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interval */}
              <div className="space-y-2">
                <Label>Zaman Aralığı</Label>
                <Select
                  value={settings.interval}
                  onValueChange={(value) => setSettings({ ...settings, interval: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">5 Dakika</SelectItem>
                    <SelectItem value="15m">15 Dakika</SelectItem>
                    <SelectItem value="30m">30 Dakika</SelectItem>
                    <SelectItem value="1h">1 Saat</SelectItem>
                    <SelectItem value="4h">4 Saat</SelectItem>
                    <SelectItem value="1d">1 Gün</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tüm Ayarları Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Son Sinyaller
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Henüz sinyal yok. Otomatik trading'i aktif edin!
            </p>
          ) : (
            <div className="space-y-3">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{signal.symbol}</span>
                      <Badge
                        variant={signal.signal_type === 'bullish' ? 'default' : 'destructive'}
                      >
                        {signal.signal_type === 'bullish' ? '📈 LONG' : '📉 SHORT'}
                      </Badge>
                      {signal.action_taken && (
                        <Badge variant="outline">✅ İşlem Açıldı</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${signal.price.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(signal.timestamp)}
                      </span>
                      <span className="text-xs">
                        EMA9: {signal.ema9.toFixed(2)} / EMA21: {signal.ema21.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">{signal.exchange}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};