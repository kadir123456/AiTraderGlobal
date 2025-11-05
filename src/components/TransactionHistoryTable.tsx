import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTransactionHistory, Transaction } from "@/hooks/useTransactionHistory";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

const exchangeColors: Record<string, string> = {
  binance: 'bg-yellow-500',
  bybit: 'bg-orange-500',
  okx: 'bg-blue-500',
  kucoin: 'bg-green-500',
  mexc: 'bg-purple-500',
};

export const TransactionHistoryTable = () => {
  const { transactions, loading, refreshTransactions } = useTransactionHistory(24);
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();

  const getLocale = () => (i18n.language === 'tr' ? tr : enUS);

  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: getLocale(),
    });
  };

  const totalPnL = transactions.reduce((sum, tx) => sum + tx.pnl, 0);
  const winRate = transactions.length > 0
    ? (transactions.filter(tx => tx.pnl > 0).length / transactions.length) * 100
    : 0;

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Son 24 Saat İşlem Geçmişi
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-muted-foreground">
                Toplam {transactions.length} işlem
              </span>
              <span className={`text-sm font-medium ${totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}{formatPrice(totalPnL)} P&L
              </span>
              <span className="text-sm text-muted-foreground">
                %{winRate.toFixed(1)} kazanç oranı
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTransactions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Son 24 Saatte İşlem Yok</p>
            <p className="text-sm text-muted-foreground">
              Kapatılan pozisyonlarınız burada görünecektir
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Coin</TableHead>
                  <TableHead>Borsa</TableHead>
                  <TableHead>Yön</TableHead>
                  <TableHead className="text-right">Giriş</TableHead>
                  <TableHead className="text-right">Çıkış</TableHead>
                  <TableHead className="text-right">Miktar</TableHead>
                  <TableHead className="text-right">Kaldıraç</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead className="min-w-[120px]">Kapanış</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {tx.side === 'LONG' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        {tx.symbol}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${exchangeColors[tx.exchange.toLowerCase()] || 'bg-gray-500'}`} />
                        <span className="capitalize text-sm">{tx.exchange}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.side === 'LONG' ? 'default' : 'destructive'} className="text-xs">
                        {tx.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${tx.entryPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${tx.exitPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ${tx.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {tx.leverage}x
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${tx.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.pnl >= 0 ? '+' : ''}{formatPrice(tx.pnl)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {tx.pnl >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`font-medium text-sm ${tx.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {tx.pnl >= 0 ? '+' : ''}{tx.pnlPercent.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'auto' ? 'secondary' : 'outline'} className="text-xs">
                        {tx.type === 'auto' ? '🤖 Oto' : '👤 Manuel'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimeAgo(tx.closedAt)}
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
