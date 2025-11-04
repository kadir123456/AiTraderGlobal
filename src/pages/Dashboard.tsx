import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StatsCard } from "@/components/StatsCard";
import { PositionCard } from "@/components/PositionCard";

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

const Dashboard = () => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Dummy data for now - will be replaced with Firebase data
  const [positions] = useState<Position[]>([
    { id: "1", symbol: "BTC/USDT", side: "LONG", entry: 43250, current: 44100, pnl: 850, pnlPercent: 1.97, exchange: "Binance" },
    { id: "2", symbol: "ETH/USDT", side: "SHORT", entry: 2280, current: 2265, pnl: 15, pnlPercent: 0.66, exchange: "Bybit" },
    { id: "3", symbol: "SOL/USDT", side: "LONG", entry: 98.5, current: 99.2, pnl: 0.7, pnlPercent: 0.71, exchange: "Binance" },
  ]);

  const stats = [
    { 
      label: t('dashboard.total_balance'), 
      value: "$12,450.00", 
      change: "+5.2%", 
      icon: DollarSign, 
      trend: "up" as const
    },
    { 
      label: t('dashboard.open_positions'), 
      value: "3", 
      change: t('dashboard.active'), 
      icon: Activity, 
      trend: "neutral" as const
    },
    { 
      label: t('dashboard.today_pnl'), 
      value: "+$865.70", 
      change: "+3.4%", 
      icon: TrendingUp, 
      trend: "up" as const
    },
    { 
      label: t('dashboard.win_rate'), 
      value: "68%", 
      change: t('dashboard.last_30_days'), 
      icon: BarChart3, 
      trend: "up" as const
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Activity className="h-8 w-8 text-primary" />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  AI Trader
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Button variant="outline" size="sm">{t('dashboard.settings')}</Button>
              <Button size="sm">{t('dashboard.connect_exchange')}</Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Open Positions */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">{t('dashboard.positions_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No open positions</div>
            ) : (
              <div className="space-y-4">
                {positions.map((position) => (
                  <PositionCard key={position.id} position={position} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
