import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Plus, X, TrendingUp, Clock, DollarSign, ShoppingCart, LineChart, PlayCircle, StopCircle } from 'lucide-react';
import api from '@/lib/api';
import { useSubscription } from '@/hooks/useSubscription';

interface AutoTradingSettings {
  spot_enabled: boolean;
  spot_watchlist: string[];
  spot_default_amount: number;
  spot_default_tp: number;
  spot_default_sl: number;
  
  futures_enabled: boolean;
  futures_watchlist: string[];
  futures_default_amount: number;
  futures_default_leverage: number;
  futures_default_tp: number;
  futures_default_sl: number;
  
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
  const [startingSpot, setStartingSpot] = useState(false);
  const [startingFutures, setStartingFutures] = useState(false);
  const [settings, setSettings] = useState<AutoTradingSettings>({
    spot_enabled: false,
    spot_watchlist: [],
    spot_default_amount: 10,
    spot_default_tp: 5,
    spot_default_sl: 2,
    
    futures_enabled: false,
    futures_watchlist: [],
    futures_default_amount: 7,
    futures_default_leverage: 10,
    futures_default_tp: 2,
    futures_default_sl: 1,
    
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

  const handleStartSpot = async () => {
    if (!canAccessFeature('autoTrading')) {
      toast.error(
        `Spot auto-trading requires PRO or ENTERPRISE plan. Your plan: ${tier.toUpperCase()}`,
        { duration: 5000 }
      );
      return;
    }

    if (settings.spot_watchlist.length === 0) {
      toast.error('Lütfen en az 1 coin ekleyin (watchlist)');
      return;
    }

    setStartingSpot(true);
    try {
      const response = await api.post('/api/auto-trading/settings', {
        ...settings,
        spot_enabled: true,
      });
      
      setSettings({ ...settings, spot_enabled: true });
      toast.success('✅ Spot otomatik trading başlatıldı!', { duration: 3000 });
      fetchSignals();
    } catch (error: any) {
      console.error('❌ Spot start error:', error);
      
      const errorDetail = error.response?.data?.detail || error.message || 'Başlatılamadı';
      toast.error(errorDetail, { duration: 5000 });
    } finally {
      setStartingSpot(false);
    }
  };

  const handleStopSpot = async () => {
    setStartingSpot(true);
    try {
      await api.post('/api/auto-trading/settings', {
        ...settings,
        spot_enabled: false,
      });
      
      setSettings({ ...settings, spot_enabled: false });
      toast.success('🛑 Spot otomatik trading durduruldu');
    } catch (error: any) {
      toast.error('Durdurulamadı');
    } finally {
      setStartingSpot(false);
    }
  };

  const handleStartFutures = async () => {
    if (!canAccessFeature('autoTrading')) {
      toast.error(
        `Futures auto-trading requires PRO or ENTERPRISE plan. Your plan: ${tier.toUpperCase()}`,
        { duration: 5000 }
      );
      return;
    }

    if (settings.futures_watchlist.length === 0) {
      toast.error('Lütfen en az 1 coin ekleyin (watchlist)');
      return;
    }

    setStartingFutures(true);
    try {
      const response = await api.post('/api/auto-trading/settings', {
        ...settings,
        futures_enabled: true,
      });
      
      setSettings({ ...settings, futures_enabled: true });
      toast.success('✅ Futures otomatik trading başlatıldı!', { duration: 3000 });
      fetchSignals();
    } catch (error: any) {
      console.error('❌ Futures start error:', error);
      
      const errorDetail = error.response?.data?.detail || error.message || 'Başlatılamadı';
      toast.error(errorDetail, { duration: 5000 });
    } finally {
      setStartingFutures(false);
    }
  };

  const handleStopFutures = async () => {
    setStartingFutures(true);
    try {
      await api.post('/api/auto-trading/settings', {
        ...settings,
        futures_enabled: false,
      });
      
      setSettings({ ...settings, futures_enabled: false });
      toast.success('🛑 Futures otomatik trading durduruldu');
    } catch (error: any) {
      toast.error('Durdurulamadı');
    } finally {
      setStartingFutures(false);
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
        <Card className={settings.spot_enabled ? "border-green-500/50 bg-green-500/5" : "border-border"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <CardTitle className="text-lg">Spot Trading</CardTitle>
              </div>
              {settings.spot_enabled ? (
                <Badge className="bg-green-500">Aktif</Badge>
              ) : (
                <Badge variant="secondary">Kapalı</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>İzlenen: {settings.spot_watchlist.length} coin</p>
              <p>Miktar: {settings.spot_default_amount} USDT</p>
              <p>TP/SL: {settings.spot_default_tp}% / {settings.spot_default_sl}%</p>
            </div>
            {settings.spot_enabled ? (
              <Button 
                onClick={handleStopSpot} 
                disabled={startingSpot}
                variant="destructive"
                className="w-full"
              >
                {startingSpot ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <StopCircle className="h-4 w-4 mr-2" />
                )}
                Durdur
              </Button>
            ) : (
              <Button 
                onClick={handleStartSpot} 
                disabled={startingSpot}
                className="w-full"
              >
                {startingSpot ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Başlat
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Futures Trading Card */}
        <Card className={settings.futures_enabled ? "border-green-500/50 bg-green-500/5" : "border-border"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                <CardTitle className="text-lg">Futures Trading</CardTitle>
              </div>
              {settings.futures_enabled ? (
                <Badge className="bg-green-500">Aktif</Badge>
              ) : (
                <Badge variant="secondary">Kapalı</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>İzlenen: {settings.futures_watchlist.length} coin</p>
              <p>Miktar: {settings.futures_default_amount} USDT × {settings.futures_default_leverage}x</p>
              <p>TP/SL: {settings.futures_default_tp}% / {settings.futures_default_sl}%</p>
            </div>
            {settings.futures_enabled ? (
              <Button 
                onClick={handleStopFutures} 
                disabled={startingFutures}
                variant="destructive"
                className="w-full"
              >
                {startingFutures ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <StopCircle className="h-4 w-4 mr-2" />
                )}
                Durdur
              </Button>
            ) : (
              <Button 
                onClick={handleStartFutures} 
                disabled={startingFutures}
                className="w-full"
              >
                {startingFutures ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Başlat
              </Button>
            )}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Ayarları Kaydet
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

      {/* Usage Guide */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">📚 Nasıl Çalışır?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">🎯 Strateji: EMA 9/21 Crossover</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• <strong>EMA9 &gt; EMA21 (Yukarı Kesişim)</strong> → Fiyat yükselir beklentisi → LONG pozisyon açılır</li>
                <li>• <strong>EMA9 &lt; EMA21 (Aşağı Kesişim)</strong> → Fiyat düşer beklentisi → SHORT pozisyon açılır (Futures)</li>
                <li>• Bot her 60 saniyede bir belirlediğiniz coinleri kontrol eder</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">💰 Spot Trading Mantığı</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>1. <strong>Sinyal: EMA9 &gt; EMA21</strong> → Bot otomatik olarak coin satın alır (BUY)</li>
                <li>2. <strong>Bekle:</strong> Fiyat yükselsin diye bekler</li>
                <li>3. <strong>Satış:</strong> Take Profit (TP) seviyesine ulaşınca veya EMA9 &lt; EMA21 olunca otomatik satar</li>
                <li>4. Stop Loss (SL) seviyesine düşerse zararı durdurur</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">📈 Futures Trading Mantığı</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• <strong>LONG (Yukarı):</strong> EMA9 &gt; EMA21 → Kaldıraçlı pozisyon açar → TP/SL ile yönetir</li>
                <li>• <strong>SHORT (Aşağı):</strong> EMA9 &lt; EMA21 → Düşüşten kazanç sağlar → TP/SL ile yönetir</li>
                <li>• Kaldıraç kullandığı için kazanç ve zarar daha hızlı olur</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">⚙️ Kullanım Adımları</h4>
              <ol className="space-y-1 text-muted-foreground ml-4">
                <li>1. Yukarıdan <strong>Spot</strong> veya <strong>Futures</strong> sekmesini seçin</li>
                <li>2. <strong>Watchlist'e</strong> takip etmek istediğiniz coinleri ekleyin (örn: BTCUSDT, ETHUSDT)</li>
                <li>3. <strong>İşlem miktarı, TP ve SL</strong> değerlerini ayarlayın</li>
                <li>4. <strong>Borsa</strong> ve <strong>Zaman aralığını</strong> seçin (15m önerilir)</li>
                <li>5. <strong>"Ayarları Kaydet"</strong> butonuna tıklayın</li>
                <li>6. <strong>"Başlat"</strong> butonuna basın → Bot çalışmaya başlar!</li>
                <li>7. Durdurmak için <strong>"Durdur"</strong> butonuna basın</li>
              </ol>
            </div>

            <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-500/10">
              <p className="text-orange-600 dark:text-orange-400 font-semibold">⚠️ Önemli Uyarılar</p>
              <ul className="space-y-1 text-muted-foreground mt-2">
                <li>• Bakiyenizin işlem miktarını karşıladığından emin olun</li>
                <li>• Küçük miktarlarla test edin, sonra artırın</li>
                <li>• TP ve SL değerlerini mutlaka ayarlayın (risk yönetimi)</li>
                <li>• Her coin için ayrı pozisyon açılır, aynı anda birden fazla işlem olabilir</li>
                <li>• Bot aktifken manuel işlem de yapabilirsiniz</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">💡 Örnek Senaryo (Spot)</h4>
              <div className="bg-secondary/30 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
                <p><strong>Ayarlar:</strong> BTCUSDT watchlist'te, Miktar: 10 USDT, TP: 5%, SL: 2%</p>
                <p><strong>1.</strong> BTC fiyatı $43,500 → EMA9 &gt; EMA21 kesişimi oldu</p>
                <p><strong>2.</strong> Bot otomatik 10 USDT'lik BTC satın aldı</p>
                <p><strong>3.</strong> TP: $45,675 ($43,500 × 1.05), SL: $42,630 ($43,500 × 0.98)</p>
                <p><strong>4.</strong> Fiyat $45,675'e ulaştı → Bot otomatik sattı → +$2.17 kar!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};