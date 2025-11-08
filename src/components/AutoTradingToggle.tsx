import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscription } from "@/hooks/useSubscription";
import { useExchanges } from "@/hooks/useExchanges";
import { useAuth } from "@/contexts/AuthContext";
import { botAPI } from "@/lib/api";
import { toast } from "sonner";
import useDemoTrading from "@/hooks/useDemoTrading";

/**
 * AutoTrading UI
 * ✅ FIXED: Empty SelectItem value error
 * ✅ FIXED: API endpoints
 * - Shows market type (spot/futures), exchange selector and coin selector
 * - For free users (demo mode) starts a demo runner (10000 USDT)
 * - For paid users calls backend to enable/disable auto trading
 */

const AutoTradingToggle: React.FC = () => {
  const { tier, plan, canAccessFeature } = useSubscription();
  const { exchanges } = useExchanges();
  const { user } = useAuth();
  const demo = tier === "free";

  const [enabled, setEnabled] = useState(false);
  const [marketType, setMarketType] = useState<"spot" | "futures">("futures");
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>("");
  const [selectedCoin, setSelectedCoin] = useState<string>("");
  const [availableCoins, setAvailableCoins] = useState<string[]>([]);
  const { openDemoAutoTrading } = useDemoTrading();

  useEffect(() => {
    if (exchanges.length > 0 && !selectedExchangeId) {
      setSelectedExchangeId(exchanges[0].id);
    }
  }, [exchanges, selectedExchangeId]);

  useEffect(() => {
    const loadSymbols = async () => {
      if (!selectedExchangeId) return;
      const ex = exchanges.find((e) => e.id === selectedExchangeId);
      try {
        // If the exchange object already contains symbols, use them
        if (ex && (ex as any).symbols && (ex as any).symbols.length > 0) {
          setAvailableCoins((ex as any).symbols.map((s: any) => s.symbol));
          return;
        }
        // Fallback: ask backend for markets
        const resp = await botAPI.getExchangeMarkets(ex?.name.toLowerCase());
        if (resp?.data?.markets) {
          setAvailableCoins(resp.data.markets.map((m: any) => m.symbol));
        }
      } catch (err) {
        console.warn("Failed to load markets for exchange:", err);
        // ✅ FIXED: Fallback to common coins if API fails
        setAvailableCoins([
          "BTCUSDT",
          "ETHUSDT",
          "BNBUSDT",
          "ADAUSDT",
          "SOLUSDT",
          "XRPUSDT",
          "DOTUSDT",
          "DOGEUSDT",
        ]);
      }
    };
    loadSymbols();
  }, [selectedExchangeId, exchanges]);

  const canAuto = !!canAccessFeature && (canAccessFeature as any)("autoTrading");

  const handleToggle = async () => {
    if (!demo && !canAuto) {
      toast.error(`Auto-trading requires an active Pro or Enterprise plan. Your current plan: ${tier}`);
      return;
    }

    if (!selectedCoin) {
      toast.error("Lütfen önce işlem yapılacak coin'i seçin.");
      return;
    }

    // Demo path
    if (demo) {
      if (!user?.uid) {
        toast.error("Giriş yapmalısınız.");
        return;
      }
      try {
        await openDemoAutoTrading({
          userId: user.uid,
          symbol: selectedCoin,
          market: marketType,
          startingBalance: 10000,
        });
        setEnabled(true);
        toast.success("Demo otomatik trading başlatıldı (10000 USDT).");
      } catch (err) {
        console.error(err);
        toast.error("Demo başlatılamadı.");
      }
      return;
    }

    // Real path: call backend
    try {
      const ex = exchanges.find((e) => e.id === selectedExchangeId);
      const payload = {
        enabled: !enabled,
        exchange: ex?.name?.toLowerCase?.() || ex?.name,
        market: marketType,
        symbol: selectedCoin,
      };
      // Expect backend endpoint setAutoTrading to exist
      await botAPI.setAutoTrading(payload);
      setEnabled((s) => !s);
      toast.success(!enabled ? "Auto-trading başlatıldı." : "Auto-trading durduruldu.");
    } catch (err) {
      console.error("Failed to set auto trading:", err);
      toast.error("Auto-trading işlemi başarısız oldu.");
    }
  };

  return (
    <div className="p-4 border rounded-md bg-card/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold">🤖 Otomatik Al-Sat</h4>
          <p className="text-sm text-muted-foreground">EMA 9/21 crossover stratejisi. Spot ve Futures desteklenir.</p>
        </div>
        <div>
          <span className={`px-3 py-1 rounded ${enabled ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
            {enabled ? "Açık" : "Kapalı"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-sm block mb-1">Market</label>
          <Select value={marketType} onValueChange={(v) => setMarketType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spot">Spot</SelectItem>
              <SelectItem value="futures">Futures</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm block mb-1">Exchange</label>
          <Select value={selectedExchangeId} onValueChange={setSelectedExchangeId}>
            <SelectTrigger>
              <SelectValue placeholder="Exchange seçin" />
            </SelectTrigger>
            <SelectContent>
              {exchanges.length === 0 ? (
                <SelectItem value="no-exchange" disabled>
                  Exchange bulunamadı
                </SelectItem>
              ) : (
                exchanges.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm block mb-1">Coin</label>
          <Select value={selectedCoin} onValueChange={setSelectedCoin}>
            <SelectTrigger>
              <SelectValue placeholder="Coin seçin" />
            </SelectTrigger>
            <SelectContent>
              {availableCoins.length === 0 ? (
                <SelectItem value="no-coin" disabled>
                  Coin yükleniyor...
                </SelectItem>
              ) : (
                availableCoins.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        {demo ? (
          <>
            Ücretsiz kullanıcı demo modunda: gerçek borsa işlemi yapamazsınız. Demo bakiye: <strong>10000 USDT</strong>.
            Demo modunda bot seçilen coin ile simüle edilmiş işlemler yapar ve bakiye/PnL gösterir.
          </>
        ) : (
          <>Bu özellik paketiniz tarafından {canAuto ? "izinli" : "kapatılmış"} durumda.</>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleToggle} disabled={!demo && !canAuto}>
          {demo ? (enabled ? "Demo Durdur" : "Demo Başlat (10000 USDT)") : enabled ? "Durdur" : "Başlat"}
        </Button>
        {!demo && !canAuto && <Button variant="outline" onClick={() => (window.location.href = "/#pricing")}>Yükselt</Button>}
      </div>
    </div>
  );
};

export default AutoTradingToggle;