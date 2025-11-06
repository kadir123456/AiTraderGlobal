import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { TrendingUp, ArrowRight, RefreshCw, Settings2, Zap } from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  profit: number;
  profitPercent: number;
  timestamp: number;
}

export const ArbitrageScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [minProfitPercent, setMinProfitPercent] = useState(0.5);
  const [selectedSymbols, setSelectedSymbols] = useState(['BTC/USDT', 'ETH/USDT', 'BNB/USDT']);

  const mockOpportunities: ArbitrageOpportunity[] = [
    {
      id: '1',
      symbol: 'BTC/USDT',
      buyExchange: 'Binance',
      buyPrice: 43250.50,
      sellExchange: 'Bybit',
      sellPrice: 43520.80,
      profit: 270.30,
      profitPercent: 0.62,
      timestamp: Date.now(),
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      buyExchange: 'KuCoin',
      buyPrice: 2245.20,
      sellExchange: 'OKX',
      sellPrice: 2260.40,
      profit: 15.20,
      profitPercent: 0.68,
      timestamp: Date.now(),
    },
    {
      id: '3',
      symbol: 'BNB/USDT',
      buyExchange: 'Bybit',
      buyPrice: 305.60,
      sellExchange: 'Binance',
      sellPrice: 307.50,
      profit: 1.90,
      profitPercent: 0.62,
      timestamp: Date.now(),
    },
  ];

  const startScanning = () => {
    setScanning(true);
    toast.success('Arbitrage scanner started');

    setTimeout(() => {
      setOpportunities(mockOpportunities);
      setScanning(false);
      toast.success(`Found ${mockOpportunities.length} arbitrage opportunities!`);
    }, 2000);
  };

  const executeArbitrage = (opportunity: ArbitrageOpportunity) => {
    toast.info('Arbitrage execution will be available soon!');
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Arbitrage Scanner
              </CardTitle>
              <CardDescription>
                Find price differences across multiple exchanges and profit from arbitrage
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="auto-scan" className="text-sm">Auto Scan</Label>
              <Switch
                id="auto-scan"
                checked={autoScan}
                onCheckedChange={setAutoScan}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scanner Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Profit (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={minProfitPercent}
                onChange={(e) => setMinProfitPercent(parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Only show opportunities with profit above this threshold
              </p>
            </div>
            <div className="space-y-2">
              <Label>Scan Interval (seconds)</Label>
              <Input
                type="number"
                defaultValue={30}
                disabled={!autoScan}
              />
              <p className="text-xs text-muted-foreground">
                How often to scan for opportunities
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trading Pairs</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSymbols.map((symbol) => (
                <Badge key={symbol} variant="secondary">
                  {symbol}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={startScanning}
            disabled={scanning}
            className="w-full"
          >
            {scanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4 mr-2" />
                Start Scan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Arbitrage Opportunities</CardTitle>
          <CardDescription>
            {opportunities.length > 0
              ? `Found ${opportunities.length} profitable opportunities`
              : 'No opportunities found yet. Start scanning to find arbitrage chances.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click "Start Scan" to find arbitrage opportunities
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{opp.symbol}</span>
                      <Badge
                        variant={opp.profitPercent >= 1 ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        +{opp.profitPercent.toFixed(2)}%
                      </Badge>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      ${opp.profit.toFixed(2)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{opp.buyExchange}</Badge>
                      <span className="text-muted-foreground">Buy at</span>
                      <span className="font-semibold">${opp.buyPrice.toFixed(2)}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{opp.sellExchange}</Badge>
                      <span className="text-muted-foreground">Sell at</span>
                      <span className="font-semibold">${opp.sellPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => executeArbitrage(opp)}
                    className="w-full"
                    variant="default"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Execute Arbitrage
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Arbitrage Trading Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Consider trading fees when calculating profit</li>
                <li>• Account for withdrawal fees between exchanges</li>
                <li>• Fast execution is crucial - prices change quickly</li>
                <li>• Keep funds on multiple exchanges for instant trades</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
