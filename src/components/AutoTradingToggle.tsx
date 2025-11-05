import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, X, TrendingUp, Clock, DollarSign } from 'lucide-react';
import api from '@/lib/api';

interface AutoTradingSettings {
  enabled: boolean;
  watchlist: string[];
  interval: string;
  default_amount: number;
  default_leverage: number;
  default_tp: number;
  default_sl: number;
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
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AutoTradingSettings>({
    enabled: false,
    watchlist: ['BTCUSDT', 'ETHUSDT'],
    interval: '15m',
    default_amount: 10,
    default_leverage: 10,
    default_tp: 5,
    default_sl: 2,
    exchange: 'binance',
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchSignals();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/auto-trading/settings');
      setSettings(response.data);
      setEnabled(response.data.enabled);
    } catch (error) {
      console.error('Failed to fetch auto-trading settings:', error);
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

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      await api.post('/api/auto-trading/settings', {
        ...settings,
        enabled: checked,
      });
      setEnabled(checked);
      toast.success(
        checked 
          ? 'Otomatik trading aktif edildi!' 
          : 'Otomatik trading durduruldu'
      );
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ayarlar güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.post('/api/auto-trading/settings', {
        ...settings,
        enabled,
      });
      toast.success('Ayarlar kaydedildi!');
      fetchSignals();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ayarlar kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = () => {
    if (!newSymbol) return;
    const symbol = newSymbol.toUpperCase().trim();
    if (settings.watchlist.includes(symbol)) {
      toast.error('Bu coin zaten listede!');
      return;
    }
    setSettings({ ...settings, watchlist: [...settings.watchlist, symbol] });
    setNewSymbol('');
    toast.success(`${symbol} watchlist'e eklendi`);
  };

  const removeFromWatchlist = (symbol: string) => {
    setSettings({
      ...settings,
      watchlist: settings.watchlist.filter((s) => s !== symbol),
    });
    toast.success(`${symbol} watchlist'ten çıkarıldı`);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('tr-TR');
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Otomatik Trading</CardTitle>
              <CardDescription>
                EMA 9/21 crossover stratejisi ile otomatik al-sat
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="auto-trading" className="text-base">
                {enabled ? (
                  <Badge variant="default" className="bg-green-500">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Kapalı</Badge>
                )}
              </Label>
              <Switch
                id="auto-trading"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={loading}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ayarlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Watchlist */}
          <div className="space-y-3">
            <Label>Watchlist (İzlenecek Coinler)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="BTCUSDT"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
              />
              <Button onClick={addToWatchlist} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.watchlist.map((symbol) => (
                <Badge key={symbol} variant="secondary" className="gap-1">
                  {symbol}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFromWatchlist(symbol)}
                  />
                </Badge>
              ))}
            </div>
          </div>

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

            {/* Default Amount */}
            <div className="space-y-2">
              <Label>İşlem Miktarı (USDT)</Label>
              <Input
                type="number"
                value={settings.default_amount}
                onChange={(e) =>
                  setSettings({ ...settings, default_amount: parseFloat(e.target.value) })
                }
              />
            </div>

            {/* Default Leverage */}
            <div className="space-y-2">
              <Label>Kaldıraç (Leverage)</Label>
              <Input
                type="number"
                min="1"
                max="125"
                value={settings.default_leverage}
                onChange={(e) =>
                  setSettings({ ...settings, default_leverage: parseInt(e.target.value) })
                }
              />
            </div>

            {/* Take Profit % */}
            <div className="space-y-2">
              <Label>Take Profit %</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.default_tp}
                onChange={(e) =>
                  setSettings({ ...settings, default_tp: parseFloat(e.target.value) })
                }
              />
            </div>

            {/* Stop Loss % */}
            <div className="space-y-2">
              <Label>Stop Loss %</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.default_sl}
                onChange={(e) =>
                  setSettings({ ...settings, default_sl: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <Button onClick={handleSaveSettings} disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ayarları Kaydet
          </Button>
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
