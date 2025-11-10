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

    // Responsive height
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 350 : 500;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: '#9CA3AF',
        fontSize: isMobile ? 10 : 12,
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
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: isMobile ? 5 : 10,
        barSpacing: isMobile ? 4 : 6,
      },
      handleScroll: {
        mouseWheel: !isMobile,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: !isMobile,
        pinch: true,
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
        const isMobileResize = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileResize ? 350 : 500,
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

  const calculateATR = (candles: CandlestickData[], period: number = 14): number => {
    if (candles.length < period) return 0;
    
    let atr = 0;
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      atr = i === 1 ? tr : (atr * (period - 1) + tr) / period;
    }
    
    return atr;
  };

  const detectSignals = (
    candles: CandlestickData[],
    ema9: LineData[],
    ema21: LineData[],
    volumes: any[]
  ): SignalData[] => {
    const signals: SignalData[] = [];

    for (let i = 30; i < candles.length - 1; i++) {
      const currentCandle = candles[i];
      const prevCandle = candles[i - 1];
      const prev2Candle = candles[i - 2];
      
      const currentEma9 = ema9[i - 21]?.value || 0;
      const prevEma9 = ema9[i - 22]?.value || 0;
      const currentEma21 = ema21[i - 21]?.value || 0;
      const prevEma21 = ema21[i - 22]?.value || 0;

      // Volume analysis
      const avgVolume = volumes.slice(i - 20, i).reduce((sum, v) => sum + v.value, 0) / 20;
      const volumeRatio = volumes[i].value / avgVolume;

      // Price momentum
      const priceChange = ((currentCandle.close - prev2Candle.close) / prev2Candle.close) * 100;
      
      // EMA trend strength
      const emaDistance = Math.abs(currentEma9 - currentEma21);
      const emaDistancePercent = (emaDistance / currentCandle.close) * 100;

      // BULLISH SIGNAL CONDITIONS - Daha sıkı filtreler
      const bullishCrossover = prevEma9 <= prevEma21 && currentEma9 > currentEma21;
      const bullishTrend = currentCandle.close > currentEma9 && currentEma9 > currentEma21;
      const bullishCandle = currentCandle.close > currentCandle.open;
      const strongBullishCandle = (currentCandle.close - currentCandle.open) / (currentCandle.high - currentCandle.low) > 0.6;
      const strongVolume = volumeRatio > 2.0; // Daha yüksek eşik
      const upMomentum = priceChange > 0.5; // Daha güçlü momentum
      const priceAboveEmas = currentCandle.close > currentEma9 && currentCandle.close > currentEma21;
      
      // Ek konfirmasyon: Son 3 mumdan 2'si yeşil olmalı
      const recentBullish = [candles[i], candles[i-1], candles[i-2]]
        .filter(c => c.close > c.open).length >= 2;

      if (bullishCrossover && strongVolume && strongBullishCandle && upMomentum && priceAboveEmas && recentBullish) {
        // Calculate support/resistance levels
        const recentLows = candles.slice(i - 10, i).map(c => c.low);
        const support = Math.min(...recentLows);
        
        const atr = calculateATR(candles.slice(i - 14, i + 1));
        const riskRewardRatio = 2.0;
        
        const entry = currentCandle.close;
        const sl = support - (atr * 0.5);
        const risk = entry - sl;
        const tp = entry + (risk * riskRewardRatio);

        // Only add signal if risk/reward is favorable
        if (risk > 0 && (entry - sl) / entry < 0.025) { // Max 2.5% risk
          const signalScore = volumeRatio + Math.abs(upMomentum) + (strongBullishCandle ? 1 : 0);
          
          signals.push({
            time: currentCandle.time as number,
            type: 'BUY',
            price: entry,
            strength: signalScore > 5.5 ? 'STRONG' : 
                     signalScore > 4.0 ? 'MEDIUM' : 'WEAK',
            tp,
            sl,
          });
        }
      }

      // BEARISH SIGNAL CONDITIONS - Daha sıkı filtreler
      const bearishCrossover = prevEma9 >= prevEma21 && currentEma9 < currentEma21;
      const bearishTrend = currentCandle.close < currentEma9 && currentEma9 < currentEma21;
      const bearishCandle = currentCandle.close < currentCandle.open;
      const strongBearishCandle = (currentCandle.open - currentCandle.close) / (currentCandle.high - currentCandle.low) > 0.6;
      const downMomentum = priceChange < -0.5; // Daha güçlü momentum
      const priceBelowEmas = currentCandle.close < currentEma9 && currentCandle.close < currentEma21;
      
      // Ek konfirmasyon: Son 3 mumdan 2'si kırmızı olmalı
      const recentBearish = [candles[i], candles[i-1], candles[i-2]]
        .filter(c => c.close < c.open).length >= 2;

      if (bearishCrossover && strongVolume && strongBearishCandle && downMomentum && priceBelowEmas && recentBearish) {
        // Calculate resistance level
        const recentHighs = candles.slice(i - 10, i).map(c => c.high);
        const resistance = Math.max(...recentHighs);
        
        const atr = calculateATR(candles.slice(i - 14, i + 1));
        const riskRewardRatio = 2.0;
        
        const entry = currentCandle.close;
        const sl = resistance + (atr * 0.5);
        const risk = sl - entry;
        const tp = entry - (risk * riskRewardRatio);

        // Only add signal if risk/reward is favorable
        if (risk > 0 && (sl - entry) / entry < 0.025) { // Max 2.5% risk
          const signalScore = volumeRatio + Math.abs(downMomentum) + (strongBearishCandle ? 1 : 0);
          
          signals.push({
            time: currentCandle.time as number,
            type: 'SELL',
            price: entry,
            strength: signalScore > 5.5 ? 'STRONG' : 
                     signalScore > 4.0 ? 'MEDIUM' : 'WEAK',
            tp,
            sl,
          });
        }
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
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Son Sinyaller:</h4>
              <span className="text-xs text-muted-foreground">{signals.length} sinyal</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {signals.slice(-4).reverse().map((signal, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSignalClick(signal)}
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all active:scale-95 ${
                    signal.type === 'BUY'
                      ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                      : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-base ${signal.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                      {signal.type}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {signal.strength}
                      </Badge>
                      {signal.strength === 'STRONG' && <Zap className="h-3 w-3 text-yellow-500" />}
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry:</span>
                      <span className="font-mono font-medium">${signal.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">TP:</span>
                      <span className="font-mono text-green-600 font-medium">${signal.tp.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">SL:</span>
                      <span className="font-mono text-red-600 font-medium">${signal.sl.toFixed(2)}</span>
                    </div>
                    <div className="pt-1 border-t border-border/50">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">R:R</span>
                        <span className="font-medium">
                          1:{((Math.abs(signal.tp - signal.price) / Math.abs(signal.price - signal.sl))).toFixed(1)}
                        </span>
                      </div>
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