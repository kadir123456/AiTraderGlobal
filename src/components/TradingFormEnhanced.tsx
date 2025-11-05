import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTrading } from '@/hooks/useTrading';
import { useExchanges } from '@/hooks/useExchanges';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Coin {
  symbol: string;
  name: string;
  price: number;
}

const EXCHANGES = [
  { id: 'binance', name: 'Binance', supportsPassphrase: false },
  { id: 'bybit', name: 'Bybit', supportsPassphrase: false },
  { id: 'okx', name: 'OKX', supportsPassphrase: true },
  { id: 'kucoin', name: 'KuCoin', supportsPassphrase: true },
  { id: 'mexc', name: 'MEXC', supportsPassphrase: false },
];

const TradingFormEnhanced = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { openPosition, canOpenMore, maxPositions } = useTrading();
  const { exchanges } = useExchanges();

  // Form state
  const [selectedExchange, setSelectedExchange] = useState<string>('binance');
  const [isFutures, setIsFutures] = useState<boolean>(true);
  const [selectedCoin, setSelectedCoin] = useState<string>('BTCUSDT');
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [amount, setAmount] = useState<string>('100');
  const [leverage, setLeverage] = useState<number>(10);
  const [tpPercentage, setTpPercentage] = useState<string>('2');
  const [slPercentage, setSlPercentage] = useState<string>('1');
  const [passphrase, setPassphrase] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coins list
  const [coins] = useState<Coin[]>([
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 0 },
    { symbol: 'ETHUSDT', name: 'Ethereum', price: 0 },
    { symbol: 'BNBUSDT', name: 'BNB', price: 0 },
    { symbol: 'SOLUSDT', name: 'Solana', price: 0 },
    { symbol: 'XRPUSDT', name: 'Ripple', price: 0 },
    { symbol: 'ADAUSDT', name: 'Cardano', price: 0 },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', price: 0 },
    { symbol: 'AVAXUSDT', name: 'Avalanche', price: 0 },
  ]);

  // Check if exchange is connected
  const isExchangeConnected = exchanges.some(ex => ex.name.toLowerCase() === selectedExchange);
  const selectedExchangeData = EXCHANGES.find(ex => ex.id === selectedExchange);

  // Calculate TP/SL prices (example)
  const entryPrice = 45000; // This would come from API
  const tpPrice = side === 'LONG' 
    ? entryPrice * (1 + parseFloat(tpPercentage || '0') / 100)
    : entryPrice * (1 - parseFloat(tpPercentage || '0') / 100);
  const slPrice = side === 'LONG'
    ? entryPrice * (1 - parseFloat(slPercentage || '0') / 100)
    : entryPrice * (1 + parseFloat(slPercentage || '0') / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isExchangeConnected) {
      toast({
        title: "Exchange Not Connected",
        description: `Please connect your ${selectedExchangeData?.name} account in Settings first.`,
        variant: "destructive",
      });
      return;
    }

    if (!canOpenMore) {
      toast({
        title: "Position Limit Reached",
        description: `You've reached your maximum of ${maxPositions} open positions. Close some positions or upgrade your plan.`,
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid trade amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await openPosition({
        exchange: selectedExchange,
        symbol: selectedCoin,
        side,
        amount: parseFloat(amount),
        leverage,
        tpPercentage: parseFloat(tpPercentage),
        slPercentage: parseFloat(slPercentage),
      });

      // Reset form
      setAmount('100');
      setTpPercentage('2');
      setSlPercentage('1');
      
      toast({
        title: "Position Opened",
        description: `${side} ${selectedCoin} position opened successfully!`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Open Position",
        description: error.message || "An error occurred while opening the position.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {side === 'LONG' ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          Open New Position
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!canOpenMore && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Position limit reached ({maxPositions} max). Upgrade your plan for more positions.
            </AlertDescription>
          </Alert>
        )}

        {!isExchangeConnected && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {selectedExchangeData?.name} not connected. Add your API keys in Settings.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exchange Selection */}
          <div className="space-y-2">
            <Label>Exchange</Label>
            <Select value={selectedExchange} onValueChange={setSelectedExchange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCHANGES.map(exchange => (
                  <SelectItem key={exchange.id} value={exchange.id}>
                    {exchange.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spot/Futures Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="futures-mode">Trading Mode</Label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${!isFutures ? 'font-bold' : 'text-muted-foreground'}`}>
                Spot
              </span>
              <Switch
                id="futures-mode"
                checked={isFutures}
                onCheckedChange={setIsFutures}
              />
              <span className={`text-sm ${isFutures ? 'font-bold' : 'text-muted-foreground'}`}>
                Futures
              </span>
            </div>
          </div>

          {/* LONG/SHORT Tabs */}
          <Tabs value={side} onValueChange={(v) => setSide(v as 'LONG' | 'SHORT')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="LONG" className="text-green-600">
                <TrendingUp className="h-4 w-4 mr-2" />
                LONG
              </TabsTrigger>
              <TabsTrigger value="SHORT" className="text-red-600">
                <TrendingDown className="h-4 w-4 mr-2" />
                SHORT
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Trading Pair */}
          <div className="space-y-2">
            <Label>Trading Pair</Label>
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {coins.map(coin => (
                  <SelectItem key={coin.symbol} value={coin.symbol}>
                    {coin.symbol} - {coin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (USDT)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              step="0.01"
            />
          </div>

          {/* Leverage (only for futures) */}
          {isFutures && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Leverage</Label>
                <span className="text-sm font-bold">{leverage}x</span>
              </div>
              <Slider
                value={[leverage]}
                onValueChange={(v) => setLeverage(v[0])}
                min={1}
                max={125}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1x</span>
                <span>125x</span>
              </div>
            </div>
          )}

          {/* Take Profit % */}
          <div className="space-y-2">
            <Label>Take Profit (%)</Label>
            <Input
              type="number"
              value={tpPercentage}
              onChange={(e) => setTpPercentage(e.target.value)}
              placeholder="2"
              step="0.1"
            />
            <div className="text-xs text-muted-foreground">
              TP Price: ${tpPrice.toFixed(2)}
            </div>
          </div>

          {/* Stop Loss % */}
          <div className="space-y-2">
            <Label>Stop Loss (%)</Label>
            <Input
              type="number"
              value={slPercentage}
              onChange={(e) => setSlPercentage(e.target.value)}
              placeholder="1"
              step="0.1"
            />
            <div className="text-xs text-muted-foreground">
              SL Price: ${slPrice.toFixed(2)}
            </div>
          </div>

          {/* Passphrase (for OKX and KuCoin) */}
          {selectedExchangeData?.supportsPassphrase && (
            <div className="space-y-2">
              <Label>API Passphrase (Optional)</Label>
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase if required"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !canOpenMore || !isExchangeConnected}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening Position...
              </>
            ) : (
              `Open ${side} Position`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TradingFormEnhanced;
