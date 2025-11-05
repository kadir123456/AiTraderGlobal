import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useExchanges } from '@/hooks/useExchanges';
import { useTrading } from '@/hooks/useTrading';
import { useTradingSettings } from '@/hooks/useTradingSettings';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { botAPI } from '@/lib/api';
import { TPSLCalculator } from './TPSLCalculator';

interface Coin {
  symbol: string;
  name: string;
  price: number;
}

export const TradingForm = () => {
  const { t } = useTranslation();
  const { exchanges } = useExchanges();
  const { openPosition, canOpenMore, maxPositions } = useTrading();
  const { settings } = useTradingSettings();
  
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [amount, setAmount] = useState<string>('');
  const [leverage, setLeverage] = useState<string>(settings.defaultLeverage.toString());
  const [tpPercent, setTpPercent] = useState<string>(settings.defaultTP.toString());
  const [slPercent, setSlPercent] = useState<string>(settings.defaultSL.toString());
  const [interval, setInterval] = useState<string>('15m');
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emaSignal, setEmaSignal] = useState<any>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);

  // Popular trading pairs
  const popularCoins: Coin[] = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 43500 },
    { symbol: 'ETHUSDT', name: 'Ethereum', price: 2280 },
    { symbol: 'BNBUSDT', name: 'BNB', price: 320 },
    { symbol: 'SOLUSDT', name: 'Solana', price: 98 },
    { symbol: 'XRPUSDT', name: 'Ripple', price: 0.52 },
    { symbol: 'ADAUSDT', name: 'Cardano', price: 0.48 },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', price: 0.085 },
    { symbol: 'AVAXUSDT', name: 'Avalanche', price: 36 },
  ];

  useEffect(() => {
    if (exchanges.length > 0 && !selectedExchange) {
      setSelectedExchange(exchanges[0].id);
    }
  }, [exchanges]);

  useEffect(() => {
    setCoins(popularCoins);
  }, [selectedExchange]);

  useEffect(() => {
    if (selectedCoin && selectedExchange) {
      fetchEmaSignal();
    }
  }, [selectedCoin, selectedExchange, interval]);

  const fetchEmaSignal = async () => {
    if (!selectedCoin || !selectedExchange) return;
    
    setLoadingSignal(true);
    try {
      const exchange = exchanges.find(e => e.id === selectedExchange);
      if (!exchange) return;

      const response = await botAPI.getEmaSignal(exchange.name.toLowerCase(), selectedCoin, interval);
      setEmaSignal(response.data);
    } catch (error) {
      console.error('Failed to fetch EMA signal:', error);
    } finally {
      setLoadingSignal(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedExchange || !selectedCoin || !amount) {
      toast.error(t('trading.fill_all_fields'));
      return;
    }

    if (!canOpenMore) {
      toast.error(t('trading.max_positions_reached'));
      return;
    }

    setIsSubmitting(true);
    try {
      const exchange = exchanges.find(e => e.id === selectedExchange);
      if (!exchange) throw new Error('Exchange not found');

      await openPosition({
        exchange: exchange.name.toLowerCase(),
        symbol: selectedCoin,
        side,
        amount: parseFloat(amount),
        leverage: parseInt(leverage),
        tpPercentage: parseFloat(tpPercent),
        slPercentage: parseFloat(slPercent),
      });

      // Reset form
      setAmount('');
      setSelectedCoin('');
    } catch (error: any) {
      console.error('Position opening error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (exchanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('trading.open_position')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('trading.connect_exchange_first')}</p>
            <Button className="mt-4" onClick={() => window.location.href = '/settings'}>
              {t('trading.go_to_settings')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('trading.open_position')}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {canOpenMore ? `${maxPositions - 0} ${t('trading.positions_available')}` : t('trading.limit_reached')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Long/Short Tabs */}
        <Tabs value={side} onValueChange={(v) => setSide(v as 'LONG' | 'SHORT')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="LONG" className="data-[state=active]:bg-success/20 data-[state=active]:text-success">
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('trading.long')}
            </TabsTrigger>
            <TabsTrigger value="SHORT" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
              <TrendingDown className="h-4 w-4 mr-2" />
              {t('trading.short')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Exchange Selection */}
        <div className="space-y-2">
          <Label>{t('trading.exchange')}</Label>
          <Select value={selectedExchange} onValueChange={setSelectedExchange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exchanges.map((exchange) => (
                <SelectItem key={exchange.id} value={exchange.id}>
                  {exchange.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coin Selection */}
        <div className="space-y-2">
          <Label>{t('trading.trading_pair')}</Label>
          <Select value={selectedCoin} onValueChange={setSelectedCoin} disabled={loadingCoins}>
            <SelectTrigger>
              <SelectValue placeholder={t('trading.select_coin')} />
            </SelectTrigger>
            <SelectContent>
              {coins.map((coin) => (
                <SelectItem key={coin.symbol} value={coin.symbol}>
                  {coin.name} ({coin.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interval Selection */}
        <div className="space-y-2">
          <Label>{t('trading.interval')}</Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 {t('trading.minutes')}</SelectItem>
              <SelectItem value="30m">30 {t('trading.minutes')}</SelectItem>
              <SelectItem value="1h">1 {t('trading.hour')}</SelectItem>
              <SelectItem value="4h">4 {t('trading.hours')}</SelectItem>
              <SelectItem value="1d">1 {t('trading.day')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* EMA Signal */}
        {emaSignal && (
          <div className={`p-3 rounded-lg border ${
            emaSignal.signal === 'BUY' ? 'bg-success/10 border-success' :
            emaSignal.signal === 'SELL' ? 'bg-destructive/10 border-destructive' :
            'bg-muted border-border'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">EMA Signal:</span>
              <span className={`font-bold ${
                emaSignal.signal === 'BUY' ? 'text-success' :
                emaSignal.signal === 'SELL' ? 'text-destructive' :
                'text-muted-foreground'
              }`}>
                {emaSignal.signal}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              EMA9: {emaSignal.ema9} | EMA21: {emaSignal.ema21}
            </div>
          </div>
        )}

        {/* Amount & Leverage */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('trading.amount')} (USDT)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('trading.leverage')}x</Label>
            <Select value={leverage} onValueChange={setLeverage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 10, 20, 50, 100].map((lev) => (
                  <SelectItem key={lev} value={lev.toString()}>
                    {lev}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TP/SL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('trading.take_profit')} (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={tpPercent}
              onChange={(e) => setTpPercent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('trading.stop_loss')} (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={slPercent}
              onChange={(e) => setSlPercent(e.target.value)}
            />
          </div>
        </div>

        {/* TP/SL Calculator */}
        {selectedCoin && amount && (
          <TPSLCalculator
            amount={parseFloat(amount)}
            leverage={parseInt(leverage)}
            entryPrice={coins.find(c => c.symbol === selectedCoin)?.price || 0}
            tpPercent={parseFloat(tpPercent)}
            slPercent={parseFloat(slPercent)}
            side={side}
          />
        )}

        {/* Submit Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || !canOpenMore}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('trading.opening_position')}
            </>
          ) : (
            <>
              {side === 'LONG' ? (
                <TrendingUp className="h-4 w-4 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2" />
              )}
              {t('trading.open')} {side}
            </>
          )}
        </Button>

        {!canOpenMore && (
          <p className="text-sm text-destructive text-center">
            {t('trading.upgrade_for_more')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
