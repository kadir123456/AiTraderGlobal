import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { toast } from "sonner";

const IP_ADDRESSES = [
  "18.156.158.53",
  "18.156.42.200",
  "52.59.103.54",
  "74.220.51.0/24",
  "74.220.59.0/24"
];

export const IPWhitelistCard = () => {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success(t('exchange.copied'));
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const copyAllIPs = async () => {
    try {
      await navigator.clipboard.writeText(IP_ADDRESSES.join('\n'));
      toast.success(t('exchange.copied'));
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          ⚠️ {t('exchange.ip_whitelist_title')}
        </CardTitle>
        <CardDescription>
          {t('exchange.ip_whitelist_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-background/80 border border-border rounded-lg p-4">
          <div className="space-y-2">
            {IP_ADDRESSES.map((ip, index) => (
              <div key={ip} className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 rounded transition-colors">
                <code className="text-sm font-mono flex-1">{ip}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(ip, index)}
                  className="h-8 w-8 p-0"
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyAllIPs}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            {t('exchange.copy_ip')} (All)
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
          💡 {t('exchange.ip_whitelist_instruction')}
        </div>
      </CardContent>
    </Card>
  );
};
