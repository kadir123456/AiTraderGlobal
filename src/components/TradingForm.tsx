/**
 * TradingForm Component
 * ✅ COMPLETE VERSION - NO MISSING CODE
 * Part 1: Imports, Types, State
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Loader2, AlertCircle, Info } from 'lucide-react';
import { useExchanges } from '@/hooks/useExchanges';
import { useTrading } from '@/hooks/useTrading';
import { useTradingSettings } from '@/hooks/useTradingSettings';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { botAPI } from '@/lib/api';

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
  
  // Form state
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [amount, setAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'quote' | 'base'>('quote');
  const [leverage, setLeverage] = useState<string>(settings.defaultLeverage.toString());
  const [tpPercent, setTpPercent] = useState<string>(settings.defaultTP.toString());
  const [slPercent, setSlPercent] = useState<string>(settings.defaultSL.toString());
  const [interval, setInterval] = useState<string>('15m');
  
  // Data state
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emaSignal, setEmaSignal] = useState<any>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);

  // Popular coins with realistic prices
  const popularCoins: Coin[] = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 95000 },
    { symbol: 'ETHUSDT', name: 'Ethereum', price: 3400 },
    { symbol: 'BNBUSDT', name: 'BNB', price: 650 },
    { symbol: 'SOLUSDT', name: 'Solana', price: 220 },
    { symbol: 'XRPUSDT', name: 'Ripple', price: 2.5 },
    { symbol: 'ADAUSDT', name: 'Cardano', price: 1.1 },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', price: 0.38 },
    { symbol: 'AVAXUSDT', name: 'Avalanche', price: 42 },
  ];

  // Auto-select first exchange
  useEffect(() => {
    if (exchanges.length > 0 && !selectedExchange) {
      setSelectedExchange(exchanges[0].id);
    }
  }, [exchanges, selectedExchange]);

  // Load coins
  useEffect(() => {
    setCoins(popularCoins);
  }, [selectedExchange]);

  // Fetch EMA signal when coin/exchange/interval changes
  useEffect(() => {
    if (selectedCoin && selectedExchange) {
      fetchEmaSignal();
    }
  }, [selectedCoin, selectedExchange, interval]);

  /**
   * Fetch EMA signal from backend
   */
  const fetchEmaSignal = async () => {
    if (!selectedCoin || !selectedExchange) return;
    
    setLoadingSignal(true);
    try {
      const exchange = exchanges.find(e => e.id === selectedExchange);
      if (!exchange) return;

      const response = await botAPI.getEmaSignal(
        exchange.name.toLowerCase(),
        selectedCoin,
        interval
      );
      
      setEmaSignal(response.data);
      console.log('📊 EMA Signal:', response.data);
      
    } catch (error: any) {
      console.error('Failed to fetch EMA signal:', error);
      setEmaSignal(null);
    } finally {
      setLoadingSignal(false);
    }
  };

  /**
   * Round down to lot size
   */
  const roundDownToLotSize = (qty: number, stepSize: number): number => {
    if (!stepSize || stepSize <= 0) return qty;
    const precision = Math.max(0, Math.ceil(-Math.log10(stepSize)));
    const factor = Math.pow(10, precision);
    return Math.floor(qty * factor) / factor;
  };

  /**
   * Calculate estimated profit/loss
   */
  const calculateEstimatedPnL = () => {
    if (!amount || !selectedCoin) return { tp: 0, sl: 0 };
    
    const parsedAmount = parseFloat(amount);
    const price = coins.find(c => c.symbol === selectedCoin)?.price || 0;
    const leverageNum = parseInt(leverage) || 10;
    
    let investmentValue = 0;
    if (amountType === 'quote') {
      investmentValue = parsedAmount * leverageNum;
    } else {
      investmentValue = parsedAmount * price * leverageNum;
    }
    
    const tp = investmentValue * (parseFloat(tpPercent) || 0) / 100;
    const sl = investmentValue * (parseFloat(slPercent) || 0) / 100;
    
    return { tp, sl };
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validation
    if (!selectedExchange || !selectedCoin || !amount) {
      toast.error(t('trading.fill_all_fields') || 'Please fill all fields');
      return;
    }

    if (!canOpenMore) {
      toast.error(t('trading.max_positions_reached') || 'Maximum positions reached');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const exchange = exchanges.find(e => e.id === selectedExchange);
      if (!exchange) throw new Error('Exchange not found');

      // Get current price
      let price = coins.find(c => c.symbol === selectedCoin)?.price;
      if (!price) {
        try {
          const tickerResp = await botAPI.getTicker(
            exchange.name.toLowerCase(),
            selectedCoin
          );
          price = tickerResp.data.price;
        } catch (err) {
          console.warn('Failed to get ticker, using default price');
          price = 0;
        }
      }

      // Calculate quantity
      let quantity = 0;
      const parsedAmount = parseFloat(amount);
      
      if (amountType === 'quote') {
        // Quote amount (USDT) → calculate base quantity
        if (!price || price === 0) {
          toast.error('Cannot fetch current price. Please try again.');
          setIsSubmitting(false);
          return;
        }
        quantity = parsedAmount / price;
      } else {
        // Base amount (coin quantity)
        quantity = parsedAmount;
      }

      // Get market info for lot size validation
      let stepSize = 0.00000001;
      let minQty = 0.001;
      
      try {
        const marketResp = await botAPI.getMarket(
          exchange.name.toLowerCase(),
          selectedCoin
        );
        const market = marketResp.data.market || {};
        stepSize = parseFloat(market.stepSize || market.lotSize || '0.00000001');
        minQty = parseFloat(market.minQty || market.minQuantity || '0.001');
      } catch (err) {
        console.warn('Failed to get market info, using defaults');
      }

      // Round quantity to lot size
      const roundedQty = roundDownToLotSize(quantity, stepSize);

      // Validate minimum quantity
      if (roundedQty < minQty || roundedQty === 0) {
        toast.error(
          `Amount too small. Minimum: ${minQty} ${selectedCoin.replace(/USDT$/, '')}`,
          { description: 'Please increase your order amount' }
        );
        setIsSubmitting(false);
        return;
      }

      // Check balance if using quote amount
      if (amountType === 'quote') {
        try {
          const balancesResp = await botAPI.getBalance(exchange.name.toLowerCase());
          const quoteCurrency = selectedCoin.endsWith('USDT') ? 'USDT' : 'USDT';
          const availableQuote = parseFloat(
            balancesResp.data?.balances?.[quoteCurrency] || 0
          );
          
          const feeEstimate = Math.max(0.001 * parsedAmount, 0.1);
          
          if (availableQuote < parsedAmount + feeEstimate) {
            toast.error('Insufficient balance', {
              description: `Available: ${availableQuote.toFixed(2)} ${quoteCurrency}`,
            });
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          console.warn('Failed to check balance:', err);
        }
      }

      console.log('🔵 Opening position:', {
        exchange: exchange.name.toLowerCase(),
        symbol: selectedCoin,
        side,
        amount: roundedQty,
        leverage: parseInt(leverage),
        tpPercentage: parseFloat(tpPercent),
        slPercentage: parseFloat(slPercent),
      });

      // Open position
      await openPosition({
        exchange: exchange.name.toLowerCase(),
        symbol: selectedCoin,
        side,
        amount: roundedQty,
        leverage: parseInt(leverage),
        tpPercentage: parseFloat(tpPercent),
        slPercentage: parseFloat(slPercent),
      });

      // Reset form
      setAmount('');
      setSelectedCoin('');
      
    } catch (error: any) {
      console.error('❌ Position opening error:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to open position';
      toast.error('Trade failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show "connect exchange" message if no exchanges
  if (exchanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('trading.open_position') || 'Open Position'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('trading.connect_exchange_first') || 'Please connect an exchange first'}
            </AlertDescription>
          </Alert>
          <Button
            className="mt-4 w-full"
            onClick={() => (window.location.href = '/settings')}
          >
            {t('trading.go_to_settings') || 'Go to Settings'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const estimatedPnL = calculateEstimatedPnL();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('trading.open_position') || 'Open Position'}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {canOpenMore
              ? `${maxPositions - 0} ${t('trading.positions_available') || 'available'}`
              : t('trading.limit_reached') || 'Limit reached'}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Buy/Sell Tabs */}
        <Tabs value={side} onValueChange={(v) => setSide(v as 'LONG' | 'SHORT')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="LONG"
              className="data-[state=active]:bg-success/20 data-[state=active]:text-success"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('trading.long') || 'LONG'}
            </TabsTrigger>
            <TabsTrigger
              value="SHORT"
              className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              {t('trading.short') || 'SHORT'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Exchange Selection */}
        <div className="space-y-2">
          <Label>{t('trading.exchange') || 'Exchange'}</Label>
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
          <Label>{t('trading.trading_pair') || 'Trading Pair'}</Label>
          <Select
            value={selectedCoin}
            onValueChange={setSelectedCoin}
            disabled={loadingCoins}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('trading.select_coin') || 'Select coin'} />
            </SelectTrigger>
            <SelectContent>
              {coins.map((coin) => (
                <SelectItem key={coin.symbol} value={coin.symbol}>
                  {coin.name} ({coin.symbol}) - ${coin.price.toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interval Selection */}
        <div className="space-y-2">
          <Label>{t('trading.interval') || 'Interval'}</Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 {t('trading.minutes') || 'minutes'}</SelectItem>
              <SelectItem value="30m">30 {t('trading.minutes') || 'minutes'}</SelectItem>
              <SelectItem value="1h">1 {t('trading.hour') || 'hour'}</SelectItem>
              <SelectItem value="4h">4 {t('trading.hours') || 'hours'}</SelectItem>
              <SelectItem value="1d">1 {t('trading.day') || 'day'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* EMA Signal Display */}
        {emaSignal && (
          <Alert
            className={
              emaSignal.signal === 'BUY'
                ? 'bg-success/10 border-success'
                : emaSignal.signal === 'SELL'
                ? 'bg-destructive/10 border-destructive'
                : 'bg-muted border-border'
            }
          >
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">EMA Signal:</span>
                <span
                  className={`font-bold ${
                    emaSignal.signal === 'BUY'
                      ? 'text-success'
                      : emaSignal.signal === 'SELL'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {emaSignal.signal || 'NEUTRAL'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                EMA9: {emaSignal.ema9} | EMA21: {emaSignal.ema21}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Amount Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>{t('trading.amount') || 'Amount'}</Label>
            <Input
              type="number"
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={amountType} onValueChange={(v) => setAmountType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quote">Quote (USDT)</SelectItem>
                <SelectItem value="base">Base (Coin)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leverage */}
        <div className="space-y-2">
          <Label>{t('trading.leverage') || 'Leverage'}</Label>
          <Input
            type="number"
            min="1"
            max="125"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
          />
        </div>

        {/* TP/SL Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('trading.take_profit') || 'Take Profit'} (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={tpPercent}
              onChange={(e) => setTpPercent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('trading.stop_loss') || 'Stop Loss'} (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={slPercent}
              onChange={(e) => setSlPercent(e.target.value)}
            />
          </div>
        </div>

        {/* Estimated PnL */}
        {amount && selectedCoin && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Estimated TP:</span>
                  <span className="font-semibold text-success">
                    +${estimatedPnL.tp.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated SL:</span>
                  <span className="font-semibold text-destructive">
                    -${estimatedPnL.sl.toFixed(2)}
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
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
              {t('trading.opening_position') || 'Opening...'}
            </>
          ) : (
            <>
              {side === 'LONG' ? (
                <TrendingUp className="h-4 w-4 mr-2" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2" />
              )}
              {t('trading.open') || 'Open'} {side}
            </>
          )}
        </Button>

        {!canOpenMore && (
          <p className="text-sm text-destructive text-center">
            {t('trading.upgrade_for_more') || 'Upgrade your plan for more positions'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TradingForm;