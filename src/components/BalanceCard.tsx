import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Lock, AlertCircle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface BalanceCardProps {
  exchange: string;
  type: 'spot' | 'futures';
  totalBalance: number;
  availableBalance: number;
  usedBalance: number;
  currency: string;
  error?: string;
}

const exchangeColors: Record<string, string> = {
  binance: 'bg-yellow-500',
  bybit: 'bg-orange-500',
  okx: 'bg-blue-500',
  kucoin: 'bg-green-500',
  mexc: 'bg-purple-500',
};

export const BalanceCard = ({
  exchange,
  type,
  totalBalance,
  availableBalance,
  usedBalance,
  currency,
  error,
}: BalanceCardProps) => {
  const { formatPrice } = useCurrency();
  const exchangeColor = exchangeColors[exchange.toLowerCase()] || 'bg-gray-500';

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${exchangeColor}`} />
            <CardTitle className="text-base font-semibold capitalize">
              {exchange}
            </CardTitle>
          </div>
          <Badge variant={type === 'futures' ? 'default' : 'secondary'} className="text-xs">
            {type === 'futures' ? 'Futures' : 'Spot'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Wallet className="h-4 w-4" />
                <span>Toplam Bakiye</span>
              </div>
              <span className="font-semibold text-lg">
                {formatPrice(totalBalance)} {currency}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>Kullanılabilir</span>
              </div>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatPrice(availableBalance)} {currency}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Lock className="h-4 w-4" />
                <span>Kullanımda</span>
              </div>
              <span className="font-medium text-orange-600 dark:text-orange-400">
                {formatPrice(usedBalance)} {currency}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
