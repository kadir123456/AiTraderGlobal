import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useExchanges } from "@/hooks/useExchanges";
import { Loader2 } from "lucide-react";

interface ExchangeConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPPORTED_EXCHANGES = [
  { id: 'binance', name: 'Binance' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'okx', name: 'OKX' },
];

const ExchangeConnectDialog = ({ open, onOpenChange }: ExchangeConnectDialogProps) => {
  const { t } = useTranslation();
  const { addExchange } = useExchanges();
  const [selectedExchange, setSelectedExchange] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!selectedExchange || !apiKey || !apiSecret) {
      toast.error(t('exchange.fill_all_fields'));
      return;
    }

    setIsConnecting(true);

    try {
      await addExchange({
        name: selectedExchange,
        apiKey,
        apiSecret,
      });

      toast.success(t('exchange.connected_successfully'));
      
      // Reset form
      setSelectedExchange("");
      setApiKey("");
      setApiSecret("");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error connecting exchange:', error);
      toast.error(error.message || t('exchange.connection_error'));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('exchange.connect_new_exchange')}</DialogTitle>
          <DialogDescription>
            {t('exchange.connect_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Exchange Selection */}
          <div className="space-y-2">
            <Label htmlFor="exchange">{t('exchange.select_exchange')}</Label>
            <Select value={selectedExchange} onValueChange={setSelectedExchange}>
              <SelectTrigger>
                <SelectValue placeholder={t('exchange.choose_exchange')} />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_EXCHANGES.map((exchange) => (
                  <SelectItem key={exchange.id} value={exchange.id}>
                    {exchange.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">{t('exchange.api_key')}</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('exchange.enter_api_key')}
            />
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <Label htmlFor="apiSecret">{t('exchange.api_secret')}</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={t('exchange.enter_api_secret')}
            />
          </div>

          {/* Security Notice */}
          <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
            <p className="font-semibold mb-1">🔒 {t('exchange.security_notice')}</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>{t('exchange.security_1')}</li>
              <li>{t('exchange.security_2')}</li>
              <li>{t('exchange.security_3')}</li>
              <li>{t('exchange.security_4')}</li>
            </ul>
          </div>

          {/* IP Whitelist */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-md text-xs">
            <p className="font-semibold text-primary mb-2">⚠️ {t('exchange.ip_whitelist_title')}</p>
            <p className="text-muted-foreground mb-3">{t('exchange.ip_whitelist_description')}</p>
            <div className="bg-background/80 p-3 rounded border border-border font-mono text-[11px] space-y-1">
              <div>18.156.158.53</div>
              <div>18.156.42.200</div>
              <div>52.59.103.54</div>
              <div>74.220.51.0/24</div>
              <div>74.220.59.0/24</div>
            </div>
            <p className="text-muted-foreground mt-2">{t('exchange.ip_whitelist_instruction')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('exchange.connect')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExchangeConnectDialog;
