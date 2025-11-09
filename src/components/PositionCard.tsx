import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entry: number;
  current: number;
  pnl: number;
  pnlPercent: number;
  exchange: string;
  tpPrice?: number;
  slPrice?: number;
}

interface PositionCardProps {
  position: Position;
}

export const PositionCard = ({ position }: PositionCardProps) => {
  const { t } = useTranslation();
  
  // Safe value parsing with fallbacks
  const entry = position.entry ?? 0;
  const current = position.current ?? 0;
  const pnl = position.pnl ?? 0;
  const pnlPercent = position.pnlPercent ?? 0;
  
  const isProfitable = pnl > 0;
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
      <div className="flex items-center gap-4 mb-3 sm:mb-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{position.symbol || 'UNKNOWN'}</p>
            <Badge
              variant="outline"
              className={position.side === "LONG" ? "border-success text-success" : "border-danger text-danger"}
            >
              {position.side || 'LONG'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{position.exchange || 'unknown'}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
          <div>
            <p className="text-xs text-muted-foreground">{t('dashboard.entry')}</p>
            <p className="font-medium">${entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('dashboard.current')}</p>
            <p className="font-medium">${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('dashboard.pnl')}</p>
            <div className="flex items-center gap-1">
              <p className={`font-medium ${isProfitable ? "text-success" : "text-danger"}`}>
                {isProfitable ? '+' : ''}${pnl.toFixed(2)}
              </p>
              {isProfitable ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-danger" />
              )}
            </div>
            <p className={`text-xs ${isProfitable ? "text-success" : "text-danger"}`}>
              {isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">TP/SL</p>
            {position.tpPrice && position.tpPrice > 0 && (
              <p className="text-xs text-success">TP: ${position.tpPrice.toFixed(2)}</p>
            )}
            {position.slPrice && position.slPrice > 0 && (
              <p className="text-xs text-danger">SL: ${position.slPrice.toFixed(2)}</p>
            )}
            {(!position.tpPrice && !position.slPrice) && (
              <p className="text-xs text-muted-foreground">-</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          {t('dashboard.close')}
        </Button>
      </div>
    </div>
  );
};