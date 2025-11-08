import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/contexts/CurrencyContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Transaction {
  id: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entry_price: number;
  exit_price?: number;
  amount: number;
  leverage: number;
  pnl?: number;
  pnl_percent?: number;
  status: 'open' | 'closed' | 'cancelled';
  is_futures: boolean;
  created_at: number;
  closed_at?: number;
  client_order_id?: string;
  trade_type?: 'manual' | 'auto';
}

export const TransactionHistoryTable = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/bot/transactions?hours=${hours}`);
      
      if (response.data && response.data.transactions) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch transactions:', error);
      toast.error('İşlem geçmişi yüklenemedi');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [hours]);

  const handleRefresh = () => {
    fetchTransactions();
    toast.success('İşlem geçmişi yenilendi');
  };

  // Calculate stats from real data
  const stats = {
    total: transactions.length,
    totalPnL: transactions
      .filter(t => t.status === 'closed' && t.pnl !== undefined)
      .reduce((sum, t) => sum + (t.pnl || 0), 0),
    winRate: transactions.filter(t => t.status === 'closed' && t.pnl !== undefined).length > 0
      ? (transactions.filter(t => t.status === 'closed' && (t.pnl || 0) > 0).length /
         transactions.filter(t => t.status === 'closed' && t.pnl !== undefined).length) * 100
      : 0,
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} dakika önce`;
    } else if (diffHours < 24) {
      return `${diffHours} saat önce`;
    } else if (diffDays === 1) {
      return 'dün';
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl mb-2">
              Son {hours} Saat İşlem Geçmişi
            </CardTitle>
            {!loading && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Toplam {stats.total} işlem</span>
                <span className={stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {stats.totalPnL >= 0 ? '+' : ''}{formatPrice(stats.totalPnL)} P&L
                </span>
                <span>%{stats.winRate.toFixed(1)} kazanç oranı</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
            >
              <option value={24}>Son 24 Saat</option>
              <option value={168}>Son 7 Gün</option>
              <option value={720}>Son 30 Gün</option>
              <option value={-1}>Tümü</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Henüz İşlem Yok</p>
            <p className="text-sm text-muted-foreground">
              İlk işleminizi açtığınızda burada görünecek
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coin</TableHead>
                  <TableHead>Borsa</TableHead>
                  <TableHead>Yön</TableHead>
                  <TableHead>Giriş</TableHead>
                  <TableHead>Çıkış</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Kaldıraç</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>P&L %</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Kapanış</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tx.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {tx.exchange}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.side === 'BUY' || tx.side === 'LONG'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {tx.side === 'BUY' || tx.side === 'LONG' ? (
                          <>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            LONG
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 mr-1" />
                            SHORT
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(tx.entry_price)}</TableCell>
                    <TableCell>
                      {tx.exit_price ? formatPrice(tx.exit_price) : '-'}
                    </TableCell>
                    <TableCell>{formatPrice(tx.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tx.leverage}x
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.pnl !== undefined ? (
                        <span
                          className={
                            tx.pnl >= 0
                              ? 'text-green-500 font-semibold'
                              : 'text-red-500 font-semibold'
                          }
                        >
                          {tx.pnl >= 0 ? '+' : ''}
                          {formatPrice(tx.pnl)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.pnl_percent !== undefined ? (
                        <span
                          className={
                            tx.pnl_percent >= 0
                              ? 'text-green-500 font-semibold'
                              : 'text-red-500 font-semibold'
                          }
                        >
                          {tx.pnl_percent >= 0 ? '+' : ''}
                          {tx.pnl_percent.toFixed(2)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tx.trade_type === 'auto' ? '🤖 Oto' : '👤 Manuel'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {tx.closed_at
                        ? formatTimestamp(tx.closed_at)
                        : tx.status === 'open'
                        ? 'Açık'
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};