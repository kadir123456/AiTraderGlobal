import { useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StatsCard } from "@/components/StatsCard";
import { PositionCard } from "@/components/PositionCard";
import { useTrading } from "@/hooks/useTrading";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);
  const { positions, loading: positionsLoading, refreshPositions } = useTrading();
  const { plan, loading: planLoading } = useSubscription();

  // Auto-refresh positions every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPositions();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshPositions]);

  // Calculate real stats from positions
  const stats = useMemo(() => {
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalPnLPercent = positions.length > 0 
      ? positions.reduce((sum, pos) => sum + pos.pnlPercent, 0) / positions.length 
      : 0;

    // Calculate total balance (would come from exchange API in production)
    const estimatedBalance = 10000 + totalPnL;

    return [
      { 
        label: t('dashboard.total_balance'), 
        value: `$${estimatedBalance.toFixed(2)}`, 
        change: totalPnL >= 0 ? `+${totalPnL.toFixed(2)}` : `${totalPnL.toFixed(2)}`, 
        icon: DollarSign, 
        trend: totalPnL >= 0 ? "up" as const : "neutral" as const
      },
      { 
        label: t('dashboard.open_positions'), 
        value: positions.length.toString(), 
        change: t('dashboard.active'), 
        icon: Activity, 
        trend: "neutral" as const
      },
      { 
        label: t('dashboard.today_pnl'), 
        value: totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`, 
        change: totalPnLPercent >= 0 ? `+${totalPnLPercent.toFixed(2)}%` : `${totalPnLPercent.toFixed(2)}%`, 
        icon: TrendingUp, 
        trend: totalPnL >= 0 ? "up" as const : "neutral" as const
      },
      { 
        label: t('dashboard.current_plan'), 
        value: plan.name, 
        change: `${plan.exchangeLimit === -1 ? '∞' : plan.exchangeLimit} exchanges`, 
        icon: BarChart3, 
        trend: "up" as const
      },
    ];
  }, [positions, plan, t]);

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
              <Button variant="default" size="sm" onClick={() => navigate('/trading')}>
                {t('dashboard.open_trade')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                {t('dashboard.settings')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(positionsLoading || planLoading) ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="border-border bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((stat) => (
              <StatsCard key={stat.label} {...stat} />
            ))
          )}
        </div>

        {/* Open Positions */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">{t('dashboard.positions_title')}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refreshPositions()}
              disabled={positionsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${positionsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {positionsLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">{t('dashboard.no_positions')}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('dashboard.no_positions_desc')}
                </p>
                <Button onClick={() => navigate('/trading')}>
                  {t('dashboard.open_trade')}
                </Button>
              </div>
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
