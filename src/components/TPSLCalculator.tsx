import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TPSLCalculatorProps {
  amount: number;
  leverage: number;
  entryPrice: number;
  tpPercent: number;
  slPercent: number;
  side: 'LONG' | 'SHORT';
}

export const TPSLCalculator = ({ 
  amount, 
  leverage, 
  entryPrice, 
  tpPercent, 
  slPercent,
  side 
}: TPSLCalculatorProps) => {
  const { t } = useTranslation();

  if (!amount || !entryPrice || !tpPercent || !slPercent) return null;

  const positionSize = amount * leverage;
  
  // Calculate TP/SL prices based on side
  let tpPrice: number;
  let slPrice: number;
  let tpProfit: number;
  let slLoss: number;

  if (side === 'LONG') {
    tpPrice = entryPrice * (1 + tpPercent / 100);
    slPrice = entryPrice * (1 - slPercent / 100);
    tpProfit = (positionSize * tpPercent) / 100;
    slLoss = (positionSize * slPercent) / 100;
  } else {
    tpPrice = entryPrice * (1 - tpPercent / 100);
    slPrice = entryPrice * (1 + slPercent / 100);
    tpProfit = (positionSize * tpPercent) / 100;
    slLoss = (positionSize * slPercent) / 100;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4 text-primary" />
          <span>Position Calculator</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Position Size</p>
            <p className="font-medium">${positionSize.toFixed(2)} USDT</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entry Price</p>
            <p className="font-medium">${entryPrice.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Take Profit ({tpPercent}%)</p>
                <p className="text-sm font-medium">${tpPrice.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-sm font-medium text-success">+${tpProfit.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              <div>
                <p className="text-xs text-muted-foreground">Stop Loss ({slPercent}%)</p>
                <p className="text-sm font-medium">${slPrice.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Loss</p>
              <p className="text-sm font-medium text-danger">-${slLoss.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Risk/Reward Ratio:</span>
            <span className="font-medium">{(tpPercent / slPercent).toFixed(2)}:1</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};