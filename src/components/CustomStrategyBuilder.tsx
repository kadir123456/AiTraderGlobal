import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, Save, PlayCircle, Code, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';

interface Indicator {
  id: string;
  type: 'EMA' | 'SMA' | 'RSI' | 'MACD' | 'BB' | 'STOCH' | 'ADX';
  period: number;
  params?: Record<string, any>;
}

interface Condition {
  id: string;
  indicator1: string;
  operator: 'crosses_above' | 'crosses_below' | 'greater_than' | 'less_than' | 'equals';
  indicator2: string | number;
  value?: number;
}

interface Strategy {
  id?: string;
  name: string;
  description: string;
  exchange: string;
  symbol: string;
  timeframe: string;
  indicators: Indicator[];
  buyConditions: Condition[];
  sellConditions: Condition[];
  riskManagement: {
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    trailingStop: boolean;
  };
  enabled: boolean;
}

const INDICATOR_INFO = {
  EMA: { name: 'Exponential Moving Average', defaultPeriod: 21, description: 'Trend takibi için hızlı moving average' },
  SMA: { name: 'Simple Moving Average', defaultPeriod: 50, description: 'Klasik moving average, trend için' },
  RSI: { name: 'Relative Strength Index', defaultPeriod: 14, description: 'Momentum göstergesi, aşırı alım/satım tespiti' },
  MACD: { name: 'MACD', defaultPeriod: 26, description: 'Trend ve momentum birleşimi' },
  BB: { name: 'Bollinger Bands', defaultPeriod: 20, description: 'Volatilite ve fiyat aralığı' },
  STOCH: { name: 'Stochastic', defaultPeriod: 14, description: 'Momentum osilatörü' },
  ADX: { name: 'ADX', defaultPeriod: 14, description: 'Trend gücü ölçer' },
};

export const CustomStrategyBuilder = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<Strategy>({
    name: '',
    description: '',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    timeframe: '15m',
    indicators: [],
    buyConditions: [],
    sellConditions: [],
    riskManagement: {
      maxPositionSize: 10,
      stopLoss: 2,
      takeProfit: 5,
      trailingStop: false,
    },
    enabled: false,
  });

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await api.get('/api/custom-strategies');
      setStrategies(response.data.strategies || []);
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
    }
  };

  const addIndicator = (type: Indicator['type']) => {
    const info = INDICATOR_INFO[type];
    const newIndicator: Indicator = {
      id: `indicator_${Date.now()}`,
      type,
      period: info.defaultPeriod,
    };
    setCurrentStrategy({
      ...currentStrategy,
      indicators: [...currentStrategy.indicators, newIndicator],
    });
    toast.success(`${info.name} eklendi`);
  };

  const updateIndicatorPeriod = (id: string, period: number) => {
    setCurrentStrategy({
      ...currentStrategy,
      indicators: currentStrategy.indicators.map((ind) =>
        ind.id === id ? { ...ind, period } : ind
      ),
    });
  };

  const removeIndicator = (id: string) => {
    setCurrentStrategy({
      ...currentStrategy,
      indicators: currentStrategy.indicators.filter((i) => i.id !== id),
    });
    toast.success('İndikatör kaldırıldı');
  };

  const addCondition = (type: 'buy' | 'sell') => {
    if (currentStrategy.indicators.length < 2) {
      toast.error('Koşul eklemek için en az 2 indikatör gerekli');
      return;
    }

    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      indicator1: currentStrategy.indicators[0].type,
      operator: 'crosses_above',
      indicator2: currentStrategy.indicators[1]?.type || 'price',
      value: 0,
    };

    if (type === 'buy') {
      setCurrentStrategy({
        ...currentStrategy,
        buyConditions: [...currentStrategy.buyConditions, newCondition],
      });
    } else {
      setCurrentStrategy({
        ...currentStrategy,
        sellConditions: [...currentStrategy.sellConditions, newCondition],
      });
    }
  };

  const removeCondition = (type: 'buy' | 'sell', id: string) => {
    if (type === 'buy') {
      setCurrentStrategy({
        ...currentStrategy,
        buyConditions: currentStrategy.buyConditions.filter((c) => c.id !== id),
      });
    } else {
      setCurrentStrategy({
        ...currentStrategy,
        sellConditions: currentStrategy.sellConditions.filter((c) => c.id !== id),
      });
    }
  };

  const updateCondition = (
    type: 'buy' | 'sell',
    id: string,
    field: keyof Condition,
    value: any
  ) => {
    const updateList = type === 'buy' ? 'buyConditions' : 'sellConditions';
    setCurrentStrategy({
      ...currentStrategy,
      [updateList]: currentStrategy[updateList].map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  const saveStrategy = async () => {
    if (!currentStrategy.name) {
      toast.error('Strateji adı zorunlu');
      return;
    }

    if (currentStrategy.indicators.length === 0) {
      toast.error('En az 1 indikatör ekleyin');
      return;
    }

    if (currentStrategy.buyConditions.length === 0) {
      toast.error('En az 1 alış koşulu ekleyin');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/custom-strategies', currentStrategy);
      toast.success(`Strateji "${currentStrategy.name}" kaydedildi!`);
      fetchStrategies();
      
      // Reset form
      setCurrentStrategy({
        name: '',
        description: '',
        exchange: 'binance',
        symbol: 'BTCUSDT',
        timeframe: '15m',
        indicators: [],
        buyConditions: [],
        sellConditions: [],
        riskManagement: {
          maxPositionSize: 10,
          stopLoss: 2,
          takeProfit: 5,
          trailingStop: false,
        },
        enabled: false,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Strateji kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = async (strategyId: string, enabled: boolean) => {
    try {
      await api.put(`/api/custom-strategies/${strategyId}/toggle`, { enabled });
      toast.success(enabled ? 'Strateji aktif edildi' : 'Strateji durduruldu');
      fetchStrategies();
    } catch (error: any) {
      toast.error('İşlem başarısız');
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    try {
      await api.delete(`/api/custom-strategies/${strategyId}`);
      toast.success('Strateji silindi');
      fetchStrategies();
    } catch (error: any) {
      toast.error('Silinemedi');
    }
  };

  const generateCode = () => {
    const code = `# Custom Strategy: ${currentStrategy.name}
# ${currentStrategy.description}

class ${currentStrategy.name.replace(/\s+/g, '')}Strategy:
    def __init__(self):
        self.exchange = "${currentStrategy.exchange}"
        self.symbol = "${currentStrategy.symbol}"
        self.timeframe = "${currentStrategy.timeframe}"
        self.indicators = ${JSON.stringify(currentStrategy.indicators, null, 2)}
        self.risk_management = ${JSON.stringify(currentStrategy.riskManagement, null, 2)}

    def should_buy(self, data):
        # Buy conditions
        ${currentStrategy.buyConditions.map((c) => `# ${c.indicator1} ${c.operator} ${c.indicator2}`).join('\n        ')}
        return False

    def should_sell(self, data):
        # Sell conditions
        ${currentStrategy.sellConditions.map((c) => `# ${c.indicator1} ${c.operator} ${c.indicator2}`).join('\n        ')}
        return False
`;
    return code;
  };

  const OPERATORS = [
    { value: 'crosses_above', label: 'Yukarı Keser (>)' },
    { value: 'crosses_below', label: 'Aşağı Keser (<)' },
    { value: 'greater_than', label: 'Büyüktür (>)' },
    { value: 'less_than', label: 'Küçüktür (<)' },
    { value: 'equals', label: 'Eşittir (=)' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Özel Strateji Oluşturucu
          </CardTitle>
          <CardDescription>
            Kendi trading stratejinizi oluşturun, test edin ve otomatik çalıştırın
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Strateji Oluştur</TabsTrigger>
          <TabsTrigger value="saved">Kayıtlı Stratejiler ({strategies.length})</TabsTrigger>
          <TabsTrigger value="guide">Nasıl Kullanılır?</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strateji Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Strateji Adı *</Label>
                  <Input
                    placeholder="örn: RSI Reversal Stratejisi"
                    value={currentStrategy.name}
                    onChange={(e) =>
                      setCurrentStrategy({ ...currentStrategy, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Borsa</Label>
                  <Select
                    value={currentStrategy.exchange}
                    onValueChange={(value) =>
                      setCurrentStrategy({ ...currentStrategy, exchange: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="binance">Binance</SelectItem>
                      <SelectItem value="bybit">Bybit</SelectItem>
                      <SelectItem value="okx">OKX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coin Çifti</Label>
                  <Input
                    placeholder="BTCUSDT"
                    value={currentStrategy.symbol}
                    onChange={(e) =>
                      setCurrentStrategy({ ...currentStrategy, symbol: e.target.value.toUpperCase() })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zaman Dilimi</Label>
                  <Select
                    value={currentStrategy.timeframe}
                    onValueChange={(value) =>
                      setCurrentStrategy({ ...currentStrategy, timeframe: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5m">5 Dakika</SelectItem>
                      <SelectItem value="15m">15 Dakika</SelectItem>
                      <SelectItem value="1h">1 Saat</SelectItem>
                      <SelectItem value="4h">4 Saat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  placeholder="Stratejinizi açıklayın..."
                  value={currentStrategy.description}
                  onChange={(e) =>
                    setCurrentStrategy({ ...currentStrategy, description: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>İndikatörler</CardTitle>
                <Select onValueChange={(value) => addIndicator(value as Indicator['type'])}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="İndikatör Ekle" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDICATOR_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentStrategy.indicators.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Henüz indikatör eklenmedi. Yukarıdan ekleyin.
                </p>
              ) : (
                currentStrategy.indicators.map((indicator) => (
                  <div
                    key={indicator.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="secondary">{indicator.type}</Badge>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Periyot:</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={indicator.period}
                          onChange={(e) =>
                            updateIndicatorPeriod(indicator.id, parseInt(e.target.value))
                          }
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {INDICATOR_INFO[indicator.type].description}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIndicator(indicator.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Alış Koşulları
                </CardTitle>
                <Button size="sm" onClick={() => addCondition('buy')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Koşul Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentStrategy.buyConditions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Alış koşulu yok. "Koşul Ekle" butonuna tıklayın.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentStrategy.buyConditions.map((condition) => (
                    <div key={condition.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="default">ALIŞ Koşulu</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition('buy', condition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={condition.indicator1}
                          onValueChange={(value) =>
                            updateCondition('buy', condition.id, 'indicator1', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentStrategy.indicators.map((ind) => (
                              <SelectItem key={ind.id} value={ind.type}>
                                {ind.type} ({ind.period})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(value) =>
                            updateCondition('buy', condition.id, 'operator', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Değer veya İndikatör"
                          value={condition.indicator2}
                          onChange={(e) =>
                            updateCondition('buy', condition.id, 'indicator2', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                  Satış Koşulları
                </CardTitle>
                <Button size="sm" onClick={() => addCondition('sell')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Koşul Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentStrategy.sellConditions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Satış koşulu yok (opsiyonel).</p>
                  <p className="text-xs mt-2">TP/SL ile otomatik kapatılacak.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentStrategy.sellConditions.map((condition) => (
                    <div key={condition.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive">SATIŞ Koşulu</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition('sell', condition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={condition.indicator1}
                          onValueChange={(value) =>
                            updateCondition('sell', condition.id, 'indicator1', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentStrategy.indicators.map((ind) => (
                              <SelectItem key={ind.id} value={ind.type}>
                                {ind.type} ({ind.period})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(value) =>
                            updateCondition('sell', condition.id, 'operator', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Değer veya İndikatör"
                          value={condition.indicator2}
                          onChange={(e) =>
                            updateCondition('sell', condition.id, 'indicator2', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Yönetimi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maksimum Pozisyon (USDT)</Label>
                  <Input
                    type="number"
                    value={currentStrategy.riskManagement.maxPositionSize}
                    onChange={(e) =>
                      setCurrentStrategy({
                        ...currentStrategy,
                        riskManagement: {
                          ...currentStrategy.riskManagement,
                          maxPositionSize: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stop Loss (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentStrategy.riskManagement.stopLoss}
                    onChange={(e) =>
                      setCurrentStrategy({
                        ...currentStrategy,
                        riskManagement: {
                          ...currentStrategy.riskManagement,
                          stopLoss: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Take Profit (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentStrategy.riskManagement.takeProfit}
                    onChange={(e) =>
                      setCurrentStrategy({
                        ...currentStrategy,
                        riskManagement: {
                          ...currentStrategy.riskManagement,
                          takeProfit: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Trailing Stop</Label>
                    <Switch
                      checked={currentStrategy.riskManagement.trailingStop}
                      onCheckedChange={(checked) =>
                        setCurrentStrategy({
                          ...currentStrategy,
                          riskManagement: {
                            ...currentStrategy.riskManagement,
                            trailingStop: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kar ederken SL'yi otomatik yükselt
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={saveStrategy} disabled={loading} className="flex-1">
              {loading && <Save className="h-4 w-4 mr-2 animate-spin" />}
              {!loading && <Save className="h-4 w-4 mr-2" />}
              Stratejiyi Kaydet
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              <PlayCircle className="h-4 w-4 mr-2" />
              Backtest (Yakında)
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Kayıtlı Stratejiler</CardTitle>
            </CardHeader>
            <CardContent>
              {strategies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Henüz kayıtlı strateji yok. İlk stratejinizi oluşturun!
                </p>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <div key={strategy.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {strategy.name}
                            {strategy.enabled && (
                              <Badge className="bg-green-500">Aktif</Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">{strategy.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={strategy.enabled}
                            onCheckedChange={(checked) => toggleStrategy(strategy.id!, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStrategy(strategy.id!)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{strategy.exchange}</Badge>
                        <Badge variant="outline">{strategy.symbol}</Badge>
                        <Badge variant="outline">{strategy.timeframe}</Badge>
                        <Badge>{strategy.indicators.length} İndikatör</Badge>
                        <Badge variant="secondary">{strategy.buyConditions.length} Alış Koşulu</Badge>
                        <Badge variant="secondary">{strategy.sellConditions.length} Satış Koşulu</Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>💰 Pozisyon: {strategy.riskManagement.maxPositionSize} USDT</p>
                        <p>🛡️ TP/SL: {strategy.riskManagement.takeProfit}% / {strategy.riskManagement.stopLoss}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>📚 Nasıl Kullanılır?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 text-sm">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Özel Strateji Nedir?
                  </h4>
                  <p className="text-muted-foreground">
                    Kendi trading mantığınızı oluşturup otomatik çalıştırabileceğiniz sistem. 
                    İndikatörleri birleştirip, kendi kurallarınızı belirleyebilirsiniz.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🎯 Strateji Oluşturma Adımları</h4>
                  <ol className="space-y-2 text-muted-foreground ml-4">
                    <li>1. <strong>Strateji Detayları:</strong> Adını, coin çiftini, zaman dilimini belirleyin</li>
                    <li>2. <strong>İndikatörler Ekleyin:</strong> RSI, EMA, MACD gibi indikatörler seçin</li>
                    <li>3. <strong>Alış Koşulları:</strong> Ne zaman pozisyon açılsın? (örn: RSI &lt; 30)</li>
                    <li>4. <strong>Satış Koşulları:</strong> Ne zaman kapansın? (opsiyonel, TP/SL yeterli)</li>
                    <li>5. <strong>Risk Yönetimi:</strong> Pozisyon büyüklüğü, TP/SL belirleyin</li>
                    <li>6. <strong>Kaydet ve Aktif Et:</strong> Stratejinizi kaydedin, toggle ile başlatın</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💡 Örnek Strateji: RSI Reversal</h4>
                  <div className="bg-secondary/30 p-4 rounded-lg space-y-2">
                    <p><strong>Amaç:</strong> Aşırı satımdan geri dönüşü yakala</p>
                    <p><strong>İndikatörler:</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>• RSI (14)</li>
                      <li>• EMA (21)</li>
                    </ul>
                    <p><strong>Alış Koşulu:</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>• RSI &lt; 30 (Aşırı satım bölgesi)</li>
                      <li>• Fiyat &gt; EMA21 (Trend yukarı)</li>
                    </ul>
                    <p><strong>Risk:</strong> TP: 5%, SL: 2%</p>
                    <p className="text-xs text-muted-foreground italic">
                      → RSI 30'un altına düşünce AL, %5 kar yap, %2 zarar durdur
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">⚙️ İndikatör Açıklamaları</h4>
                  <div className="space-y-2">
                    {Object.entries(INDICATOR_INFO).map(([key, info]) => (
                      <div key={key} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">{key}</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-xs">{info.name}</p>
                          <p className="text-xs text-muted-foreground">{info.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🔄 Operatörler</h4>
                  <div className="space-y-1 text-muted-foreground">
                    {OPERATORS.map((op) => (
                      <div key={op.value} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{op.label}</Badge>
                        <span className="text-xs">
                          {op.value === 'crosses_above' && '→ Bir indikatör diğerinin üstüne geçince tetiklenir'}
                          {op.value === 'crosses_below' && '→ Bir indikatör diğerinin altına geçince tetiklenir'}
                          {op.value === 'greater_than' && '→ Sürekli büyükse aktif kalır'}
                          {op.value === 'less_than' && '→ Sürekli küçükse aktif kalır'}
                          {op.value === 'equals' && '→ Eşitse tetiklenir'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-500/10">
                  <p className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Önemli Notlar
                  </p>
                  <ul className="space-y-1 text-muted-foreground mt-2">
                    <li>• İlk başta küçük miktarlarla test edin</li>
                    <li>• Her strateji her piyasada çalışmaz - backtest yapın</li>
                    <li>• Çok fazla indikatör eklemek karmaşık ve yavaş olabilir</li>
                    <li>• Mutlaka TP ve SL belirleyin (risk yönetimi)</li>
                    <li>• Strateji aktifken manuel müdahale edebilirsiniz</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🚀 Hızlı Başlangıç</h4>
                  <p className="text-muted-foreground mb-2">Basit bir strateji ile başlayın:</p>
                  <ol className="space-y-1 text-muted-foreground ml-4">
                    <li>1. "Strateji Oluştur" sekmesine gidin</li>
                    <li>2. İsim: "İlk Stratejim", Symbol: BTCUSDT</li>
                    <li>3. RSI (14) indikatörünü ekleyin</li>
                    <li>4. Alış koşulu: RSI &lt; 30</li>
                    <li>5. TP: 3%, SL: 1.5%</li>
                    <li>6. Kaydet ve "Kayıtlı Stratejiler"den aktif et!</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};