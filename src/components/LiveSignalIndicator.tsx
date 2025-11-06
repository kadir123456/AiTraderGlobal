import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useTradingSignals } from '@/hooks/useTradingSignals';
import { toast } from 'sonner';

export const LiveSignalIndicator = () => {
  const { latestSignal, connectionStatus, signals } = useTradingSignals();

  useEffect(() => {
    if (latestSignal) {
      const isBuy = latestSignal.signal === 'BUY';
      const icon = isBuy ? '📈' : '📉';

      toast(
        `${icon} ${latestSignal.signal} Signal`,
        {
          description: `${latestSignal.symbol} @ ${latestSignal.exchange.toUpperCase()} - $${latestSignal.price.toFixed(2)}`,
          duration: 5000,
        }
      );
    }
  }, [latestSignal]);

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConnectionIcon = () => {
    if (connectionStatus === 'connected') {
      return <Wifi className="h-4 w-4" />;
    } else if (connectionStatus === 'error') {
      return <AlertCircle className="h-4 w-4" />;
    } else {
      return <WifiOff className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Live Trading Signals</CardTitle>
          <div className={`flex items-center gap-2 ${getConnectionColor()}`}>
            {getConnectionIcon()}
            <span className="text-xs font-medium capitalize">{connectionStatus}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestSignal ? (
          <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                {latestSignal.signal === 'BUY' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <Badge variant={latestSignal.signal === 'BUY' ? 'default' : 'destructive'}>
                  {latestSignal.signal}
                </Badge>
                <span className="font-semibold">{latestSignal.symbol}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <div>Exchange: <span className="font-medium capitalize">{latestSignal.exchange}</span></div>
                <div>Price: <span className="font-medium">${latestSignal.price.toFixed(2)}</span></div>
                <div className="text-xs">
                  EMA9: {latestSignal.ema9.toFixed(2)} | EMA21: {latestSignal.ema21.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(latestSignal.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {connectionStatus === 'connected' ? (
              'Waiting for trading signals...'
            ) : connectionStatus === 'connecting' ? (
              'Connecting to signal stream...'
            ) : (
              'Not connected to signal stream'
            )}
          </div>
        )}

        {signals.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Total signals today: <span className="font-medium">{signals.length}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
