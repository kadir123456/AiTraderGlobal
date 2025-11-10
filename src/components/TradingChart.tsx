import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface TradingChartProps {
  symbol: string;
  exchange?: string;
  onSignalClick?: (signal: SignalData) => void;
}

interface SignalData {
  time: number;
  type: 'BUY' | 'SELL';
  price: number;
  strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  tp: number;
  sl: number;
}

export const TradingChart = ({ symbol, exchange = 'binance', onSignalClick }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [timeframe, setTimeframe] = useState<string>('5m');
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [lastSignal, setLastSignal] = useState<SignalData | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add EMA 9 line
    const ema9Series = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'EMA 9',
    });
    ema9SeriesRef.current = ema9Series;

    // Add EMA 21 line
    const ema21Series = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA 21',
    });
    ema21SeriesRef.current = ema21Series;

    // Add volume series (below main chart)
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch data
  useEffect(() => {
    if (symbol && chartRef.current) {
      fetchChartData();
    }
  }, [symbol, timeframe]);

  const fetchChartData = async () => {
    if (!symbol) return;

    setLoading(true);
    try {
      // Fetch klines from Binance
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${timeframe}&limit=200`
      );
      const data = await response.json();

      // Parse klines
      const candles: CandlestickData[] = data.map((k: any) => ({
        time: Math.floor(k[0] / 1000) as any,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));

      const volumes = data.map((k: any) => ({
        time: Math.floor(k[0] / 1000) as any,
        value: parseFloat(k[5]),
        color: parseFloat(k[4]) >= parseFloat(k[1]) ? '#22c55e80' : '#ef444480',
      }));

      // Calculate EMAs
      const ema9Data = calculateEMA(candles, 9);
      const ema21Data = calculateEMA(candles, 21);

      // Detect signals
      const detectedSignals = detectSignals(candles, ema9Data, ema21Data, volumes);
      setSignals(detectedSignals);

      if (detectedSignals.length > 0) {
        const latest = detectedSignals[detectedSignals.length - 1];
        setLastSignal(latest);
      }

      // Update chart
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(candles);
      }
      if (ema9SeriesRef.current) {
        ema9SeriesRef.current.setData(ema9Data);
      }
      if (ema21SeriesRef.current) {
        ema21SeriesRef.current.setData(ema21Data);
      }
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumes);
      }

      // Add signal markers
      addSignalMarkers(detectedSignals);

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Chart data fetch error:', error);
      toast.error('Grafik verisi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const calculateEMA = (candles: CandlestickData[], period: number): LineData[] => {
    const ema: LineData[] = [];
    const multiplier = 2 / (period + 1);
    let emaValue = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period;

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) continue;

      if (i === period - 1) {
        ema.push({ time: candles[i].time, value: emaValue });
      } else {
        emaValue = (candles[i].close - emaValue) * multiplier + emaValue;
        ema.push({ time: candles[i].time, value: emaValue });
      }
    }

    return ema;
  };

  const detectSignals = (
    candles: CandlestickData[],
    ema9: LineData[],
    ema21: LineData[],
    volumes: any[]
  ): SignalData[] => {
    const signals: SignalData[] = [];

    for (let i = 21; i < candles.length; i++) {
      const currentCandle = candles[i];
      const prevCandle = candles[i - 1];
      const currentEma9 = ema9[i - 21]?.value || 0;
      const prevEma9 = ema9[i - 22]?.value || 0;
      const currentEma21 = ema21[i - 21]?.value || 0;
      const prevEma21 = ema21[i - 22]?.value || 0;

      // Volume spike check
      const avgVolume = volumes.slice(i - 20, i).reduce((sum, v) => sum + v.value, 0) / 20;
      const volumeRatio = volumes[i].value / avgVolume;

      // Bullish crossover
      if (
        prevEma9 <= prevEma21 &&
        currentEma9 > currentEma21 &&
        volumeRatio > 1.5
      ) {
        const candleRange = currentCandle.high - currentCandle.low;
        const tp = currentCandle.close + candleRange * 0.7;
        const sl = currentCandle.low;

        signals.push({
          time: currentCandle.time as number,
          type: 'BUY',
          price: currentCandle.close,
          strength: volumeRatio > 2.5 ? 'STRONG' : volumeRatio > 2.0 ? 'MEDIUM' : 'WEAK',
          tp,
          sl,
        });
      }

      // Bearish crossover
      if (
        prevEma9 >= prevEma21 &&
        currentEma9 < currentEma21 &&
        volumeRatio > 1.5
      ) {
        const candleRange = currentCandle.high - currentCandle.low;
        const tp = currentCandle.close - candleRange * 0.7;
        const sl = currentCandle.high;

        signals.push({
          time: currentCandle.time as number,
          type: 'SELL',
          price: currentCandle.close,
          strength: volumeRatio > 2.5 ? 'STRONG' : volumeRatio > 2.0 ? 'MEDIUM' : 'WEAK',
          tp,
          sl,
        });
      }
    }

    return signals;
  };

  const addSignalMarkers = (signals: SignalData[]) => {
    if (!candlestickSeriesRef.current) return;

    const markers = signals.map((signal) => ({
      time: signal.time,
      position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: signal.type === 'BUY' ? '#22c55e' : '#ef4444',
      shape: signal.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: signal.type + (signal.strength === 'STRONG' ? ' ⚡' : ''),
      size: signal.strength === 'STRONG' ? 2 : 1,
    })) as any;

    candlestickSeriesRef.current.setMarkers(markers);
  };

  const handleSignalClick = (signal: SignalData) => {
    if (onSignalClick) {
      onSignalClick(signal);
      toast.success(`${signal.type} sinyali seçildi!`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{symbol}</CardTitle>
            {lastSignal && (
              <Badge
                variant={lastSignal.type === 'BUY' ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {lastSignal.type === 'BUY' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {lastSignal.type}
                {lastSignal.strength === 'STRONG' && <Zap className="h-3 w-3" />}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m</SelectItem>
                <SelectItem value="3m">3m</SelectItem>
                <SelectItem value="5m">5m</SelectItem>
                <SelectItem value="15m">15m</SelectItem>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="4h">4h</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchChartData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ position: 'relative' }}
        />

        {/* Signals List */}
        {signals.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold">Son Sinyaller:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {signals.slice(-4).reverse().map((signal, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSignalClick(signal)}
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                    signal.type === 'BUY'
                      ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                      : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${signal.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                      {signal.type}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {signal.strength}
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry:</span>
                      <span className="font-mono">${signal.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">TP:</span>
                      <span className="font-mono text-green-600">${signal.tp.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">SL:</span>
                      <span className="font-mono text-red-600">${signal.sl.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};