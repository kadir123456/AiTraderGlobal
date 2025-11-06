import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, Save, PlayCircle, Code } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Indicator {
  id: string;
  type: 'EMA' | 'SMA' | 'RSI' | 'MACD' | 'BB';
  period: number;
  params?: Record<string, any>;
}

interface Condition {
  id: string;
  indicator1: string;
  operator: 'crosses_above' | 'crosses_below' | 'greater_than' | 'less_than' | 'equals';
  indicator2: string;
}

interface Strategy {
  name: string;
  description: string;
  indicators: Indicator[];
  buyConditions: Condition[];
  sellConditions: Condition[];
  riskManagement: {
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    trailingStop: boolean;
  };
}

export const CustomStrategyBuilder = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [currentStrategy, setCurrentStrategy] = useState<Strategy>({
    name: '',
    description: '',
    indicators: [],
    buyConditions: [],
    sellConditions: [],
    riskManagement: {
      maxPositionSize: 100,
      stopLoss: 2,
      takeProfit: 5,
      trailingStop: false,
    },
  });

  const addIndicator = (type: Indicator['type']) => {
    const newIndicator: Indicator = {
      id: `indicator_${Date.now()}`,
      type,
      period: type === 'RSI' ? 14 : 20,
    };
    setCurrentStrategy({
      ...currentStrategy,
      indicators: [...currentStrategy.indicators, newIndicator],
    });
  };

  const removeIndicator = (id: string) => {
    setCurrentStrategy({
      ...currentStrategy,
      indicators: currentStrategy.indicators.filter((i) => i.id !== id),
    });
  };

  const addCondition = (type: 'buy' | 'sell') => {
    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      indicator1: '',
      operator: 'crosses_above',
      indicator2: '',
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

  const saveStrategy = () => {
    if (!currentStrategy.name) {
      toast.error('Strategy name is required');
      return;
    }

    if (currentStrategy.indicators.length === 0) {
      toast.error('Add at least one indicator');
      return;
    }

    setStrategies([...strategies, currentStrategy]);
    toast.success(`Strategy "${currentStrategy.name}" saved!`);
  };

  const generateCode = () => {
    const code = `
# Custom Strategy: ${currentStrategy.name}
# ${currentStrategy.description}

class ${currentStrategy.name.replace(/\s+/g, '')}Strategy:
    def __init__(self):
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

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Custom Strategy Builder
          </CardTitle>
          <CardDescription>
            Build your own trading strategies with custom indicators and conditions
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Strategy Builder</TabsTrigger>
          <TabsTrigger value="code">View Code</TabsTrigger>
          <TabsTrigger value="saved">Saved Strategies ({strategies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Strategy Name</Label>
                <Input
                  placeholder="e.g., RSI Reversal Strategy"
                  value={currentStrategy.name}
                  onChange={(e) =>
                    setCurrentStrategy({ ...currentStrategy, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe your strategy..."
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
                <CardTitle>Indicators</CardTitle>
                <Select onValueChange={(value) => addIndicator(value as Indicator['type'])}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add Indicator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMA">EMA</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="RSI">RSI</SelectItem>
                    <SelectItem value="MACD">MACD</SelectItem>
                    <SelectItem value="BB">Bollinger Bands</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentStrategy.indicators.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No indicators added yet. Add your first indicator above.
                </p>
              ) : (
                currentStrategy.indicators.map((indicator) => (
                  <div
                    key={indicator.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{indicator.type}</Badge>
                      <span className="text-sm">Period: {indicator.period}</span>
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
                <CardTitle>Buy Conditions</CardTitle>
                <Button size="sm" onClick={() => addCondition('buy')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentStrategy.buyConditions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No buy conditions. Click "Add Condition" to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentStrategy.buyConditions.map((condition) => (
                    <div key={condition.id} className="p-3 border rounded-lg">
                      <Badge variant="default">Buy when condition is met</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Position Size (USDT)</Label>
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
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={saveStrategy} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Strategy
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              <PlayCircle className="h-4 w-4 mr-2" />
              Backtest (Coming Soon)
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Generated Code</CardTitle>
              <CardDescription>Python implementation of your strategy</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{generateCode()}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              {strategies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No saved strategies yet. Build and save your first strategy!
                </p>
              ) : (
                <div className="space-y-3">
                  {strategies.map((strategy, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <h3 className="font-semibold">{strategy.name}</h3>
                      <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Badge>{strategy.indicators.length} Indicators</Badge>
                        <Badge variant="outline">{strategy.buyConditions.length} Buy Rules</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
