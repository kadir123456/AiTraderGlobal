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
}

interface PositionCardProps {
  position: Position;
}

export const PositionCard = ({ position }: PositionCardProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
      <div className="flex items-center gap-4 mb-3 sm:mb-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{position.symbol}</p>
            <Badge
              variant="outline"
              className={position.side === "LONG" ? "border-success text-success" : "border-danger text-danger"}
            >
              {t(`dashboard.${position.side.toLowerCase()}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{position.exchange}</p>
        </div>
      </div>

      <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
        <div>
          <p className="text-xs text-muted-foreground">{t('dashboard.entry')}</p>
          <p className="font-medium">${position.entry.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('dashboard.current')}</p>
          <p className="font-medium">${position.current.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('dashboard.pnl')}</p>
          <div className="flex items-center gap-1">
            <p className={`font-medium ${position.pnl > 0 ? "text-success" : "text-danger"}`}>
              ${position.pnl.toFixed(2)}
            </p>
            {position.pnl > 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-danger" />
            )}
          </div>
          <p className={`text-xs ${position.pnl > 0 ? "text-success" : "text-danger"}`}>
            {position.pnlPercent > 0 ? "+" : ""}{position.pnlPercent}%
          </p>
        </div>
        <Button variant="outline" size="sm">{t('dashboard.close')}</Button>
      </div>
    </div>
  );
};
