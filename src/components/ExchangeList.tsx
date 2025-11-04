import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useExchanges } from "@/hooks/useExchanges";
import { toast } from "sonner";
import ExchangeConnectDialog from "./ExchangeConnectDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ExchangeList = () => {
  const { t } = useTranslation();
  const { exchanges, loading, removeExchange, canAddMore } = useExchanges();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);

  const handleRemoveExchange = async () => {
    if (!selectedExchange) return;
    
    try {
      await removeExchange(selectedExchange);
      toast.success(t('exchange.removed_successfully'));
      setDeleteDialogOpen(false);
      setSelectedExchange(null);
    } catch (error) {
      console.error('Error removing exchange:', error);
      toast.error(t('exchange.remove_error'));
    }
  };

  const openDeleteDialog = (exchangeId: string) => {
    setSelectedExchange(exchangeId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Connected Exchanges */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('common.loading')}...
        </div>
      ) : exchanges.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('exchange.no_exchanges')}</p>
          <p className="text-sm mt-2">{t('exchange.add_first_exchange')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exchanges.map((exchange) => (
            <div
              key={exchange.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{exchange.name}</span>
                    <Badge variant={exchange.status === 'connected' ? 'default' : 'destructive'}>
                      {exchange.status === 'connected' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {exchange.status === 'connected' ? t('exchange.connected') : t('exchange.error')}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('exchange.added')}: {new Date(exchange.addedAt).toLocaleDateString()}
                  </div>
                  {exchange.lastChecked && (
                    <div className="text-xs text-muted-foreground">
                      {t('exchange.last_check')}: {new Date(exchange.lastChecked).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteDialog(exchange.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Exchange Button */}
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={!canAddMore}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('exchange.add_exchange')}
      </Button>

      {!canAddMore && (
        <p className="text-sm text-muted-foreground text-center">
          {t('exchange.limit_reached')} {t('exchange.upgrade_for_more')}
        </p>
      )}

      {/* Connect Dialog */}
      <ExchangeConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exchange.remove_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exchange.remove_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveExchange}>
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExchangeList;
