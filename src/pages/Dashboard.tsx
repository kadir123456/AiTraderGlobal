import { useMemo, useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, TrendingUp, BarChart3, RefreshCw, Menu, Shield, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { useCurrency } from "@/contexts/CurrencyContext";
import { StatsCard } from "@/components/StatsCard";
import { PositionCard } from "@/components/PositionCard";
import { TransactionHistoryTable } from "@/components/TransactionHistoryTable";
import { useAdmin } from "@/hooks/useAdmin";
import { useTrading } from "@/hooks/useTrading";
import { useSubscription } from "@/hooks/useSubscription";
import { useExchanges } from "@/hooks/useExchanges";
import { useBalance } from "@/hooks/useBalance";
import { BalanceCard } from "@/components/BalanceCard";
import { LiveSignalIndicator } from "@/components/LiveSignalIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const { positions, loading: positionsLoading, refreshPositions } = useTrading();
  const { plan, loading: planLoading } = useSubscription();
  const { exchanges, loading: exchangesLoading } = useExchanges();
  const [accountType, setAccountType] = useState<'spot' | 'futures'>('futures');
  
  // ✅ exchangeNames memoize edildi
  const exchangeNames = useMemo(() => {
    return exchanges.map(ex => ex.name);
  }, [exchanges]);

  // ✅ useBalance hook'u sadece exchangeNames değiştiğinde tetiklenir
  const { balances, loading: balancesLoading, refreshBalances } = useBalance(exchangeNames, accountType === 'futures');

  // Auto-refresh positions every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPositions();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshPositions]);

  // Calculate real stats from positions
  const stats = useMemo(() => {
    // Safe calculation with fallback values
    const totalPnL = positions.reduce((sum, pos) => {
      const pnl = pos.pnl !== undefined && pos.pnl !== null ? pos.pnl : 0;
      return sum + pnl;
    }, 0);
    
    const closedPositions = positions.filter(
      pos => pos.pnl !== undefined && pos.pnl !== null
    );
    
    const totalPnLPercent = closedPositions.length > 0
      ? closedPositions.reduce((sum, pos) => {
          const pnlPercent = pos.pnlPercent !== undefined && pos.pnlPercent !== null 
            ? pos.pnlPercent 
            : 0;
          return sum + pnlPercent;
        }, 0) / closedPositions.length
      : 0;

    const displayBalance = totalPnL;

    return [
      { 
        label: t('dashboard.total_balance'), 
        value: formatPrice(displayBalance), 
        change: totalPnL >= 0 ? `+${formatPrice(totalPnL)}` : formatPrice(totalPnL), 
        icon: DollarSign, 
        trend: totalPnL >= 0 ? "up" as const : "neutral" as const
      },
      { 
        label: t('dashboard.open_positions'), 
        value: positions.length.toString(), 
        change: plan.id === 'free' ? `Max ${plan.exchangeLimit === -1 ? '∞' : plan.exchangeLimit * 2}` : t('dashboard.active'), 
        icon: Activity, 
        trend: "neutral" as const
      },
      { 
        label: t('dashboard.today_pnl'), 
        value: totalPnL >= 0 ? `+${formatPrice(totalPnL)}` : formatPrice(totalPnL), 
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
  }, [positions, plan, t, formatPrice]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // ✅ Refresh fonksiyonu
  const handleRefreshBalances = useCallback(async () => {
    try {
      await refreshBalances();
      toast.success('Bakiyeler güncellendi');
    } catch (error) {
      toast.error('Bakiyeler güncellenirken hata oluştu');
    }
  }, [refreshBalances]);

  // Quick links to settings tabs
  const quickLinks = [
    { key: 'exchanges', label: '🏦 Borsalar', icon: <Wallet className="h-5 w-5 text-primary" />, to: '/settings?tab=exchanges' },
    { key: 'trading', label: '📊 Manuel İşlem', icon: <TrendingUp className="h-5 w-5 text-primary" />, to: '/settings?tab=trading' },
    { key: 'auto-trading', label: '🤖 Otomatik Al-Sat', icon: <RefreshCw className="h-5 w-5 text-primary" />, to: '/settings?tab=auto-trading' },
    { key: 'custom-strategies', label: '⚡ Özel Stratejiler', icon: <BarChart3 className="h-5 w-5 text-primary" />, to: '/settings?tab=custom-strategies' },
    { key: 'arbitrage', label: '📈 Arbitraj', icon: <Activity className="h-5 w-5 text-primary" />, to: '/settings?tab=arbitrage' },
    { key: 'subscription', label: '💎 Paketim', icon: <DollarSign className="h-5 w-5 text-primary" />, to: '/settings?tab=subscription' },
    { key: 'profile', label: '👤 Profil', icon: <Menu className="h-5 w-5 text-primary" />, to: '/settings?tab=profile' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Trader
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              <CurrencyToggle />
              <LanguageSwitcher />
              <Button variant="default" size="sm" onClick={() => navigate('/trading')}>
                {t('dashboard.open_trade')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                {t('nav.pricing')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                {t('dashboard.settings')}
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                {t('dashboard.logout')}
              </Button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-2">
              <CurrencyToggle />
              <LanguageSwitcher />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-3 mt-8">
                    <Button 
                      variant="default" 
                      className="w-full justify-start" 
                      onClick={() => navigate('/trading')}
                    >
                      {t('dashboard.open_trade')}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => navigate('/pricing')}
                    >
                      {t('nav.pricing')}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => navigate('/settings')}
                    >
                      {t('dashboard.settings')}
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => navigate('/admin')}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={handleLogout}
                    >
                      {t('dashboard.logout')}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
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

        {/* Quick Access Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Hızlı Erişim</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {quickLinks.map(link => (
              <div
                key={link.key}
                role="button"
                onClick={() => navigate(link.to)}
                className="cursor-pointer rounded-lg border border-border bg-card/60 p-4 flex flex-col items-start gap-3 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary">
                  {link.icon}
                </div>
                <div className="text-sm font-medium">{link.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Exchange Balances */}
        <Card className="border-border bg-card/50 backdrop-blur-sm mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Borsa Bakiyeleri</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Tabs value={accountType} onValueChange={(v) => setAccountType(v as 'spot' | 'futures')} className="w-auto">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="spot">Spot</TabsTrigger>
                    <TabsTrigger value="futures">Futures</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshBalances}
                  disabled={balancesLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {exchangesLoading || balancesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : exchanges.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Bağlı Borsa Yok</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Bakiyelerinizi görmek için önce bir borsa bağlayın
                </p>
                <Button onClick={() => navigate('/settings')}>
                  Borsa Bağla
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {balances.map((balance) => (
                  <BalanceCard key={`${balance.exchange}-${balance.type}`} {...balance} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Trading Signals */}
        <div className="mb-8">
          <LiveSignalIndicator />
        </div>

        {/* Open Positions */}
        <Card className="border-border bg-card/50 backdrop-blur-sm mb-8">
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

        {/* Transaction History */}
        <div className="mt-8">
          <TransactionHistoryTable />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;