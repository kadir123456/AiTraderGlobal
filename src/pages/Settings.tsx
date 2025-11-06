import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { ref, set } from "firebase/database";
import { database } from "@/lib/firebase";
import ExchangeList from "@/components/ExchangeList";
import { IPWhitelistCard } from "@/components/IPWhitelistCard";
import { AutoTradingToggle } from "@/components/AutoTradingToggle";
import { ProFeature, PremiumFeature } from "@/components/FeatureGuard";
import { CustomStrategyBuilder } from "@/components/CustomStrategyBuilder";
import { ArbitrageScanner } from "@/components/ArbitrageScanner";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { tier, plan } = useSubscription();
  const navigate = useNavigate();

  // Trading Settings
  const [defaultTP, setDefaultTP] = useState("2.0");
  const [defaultSL, setDefaultSL] = useState("1.0");
  const [riskPerTrade, setRiskPerTrade] = useState("2");
  const [maxPositions, setMaxPositions] = useState("3");
  const [defaultLeverage, setDefaultLeverage] = useState("10");

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      const settingsRef = ref(database, `users/${user.uid}/settings`);
      await set(settingsRef, {
        defaultTP: parseFloat(defaultTP),
        defaultSL: parseFloat(defaultSL),
        riskPerTrade: parseFloat(riskPerTrade),
        maxPositions: parseInt(maxPositions),
        defaultLeverage: parseInt(defaultLeverage),
        language: i18n.language,
        updatedAt: new Date().toISOString(),
      });
      toast.success(t('settings.saved_successfully'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('settings.save_error'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Activity className="h-8 w-8 text-primary" />
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {t('settings.title')}
                </span>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="exchanges" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 mb-8 h-auto">
            <TabsTrigger value="exchanges" className="whitespace-normal text-xs sm:text-sm">
              🏦 Borsalar
            </TabsTrigger>
            <TabsTrigger value="trading" className="whitespace-normal text-xs sm:text-sm">
              📊 Manuel İşlem
            </TabsTrigger>
            <TabsTrigger value="auto-trading" className="whitespace-normal text-xs sm:text-sm">
              🤖 Otomatik Al-Sat
            </TabsTrigger>
            <TabsTrigger value="custom-strategies" className="whitespace-normal text-xs sm:text-sm">
              ⚡ Özel Stratejiler
            </TabsTrigger>
            <TabsTrigger value="arbitrage" className="whitespace-normal text-xs sm:text-sm">
              📈 Arbitraj
            </TabsTrigger>
            <TabsTrigger value="subscription" className="whitespace-normal text-xs sm:text-sm">
              💎 Paketim
            </TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-normal text-xs sm:text-sm">
              👤 Profil
            </TabsTrigger>
          </TabsList>

          {/* Exchanges Tab */}
          <TabsContent value="exchanges" className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🏦 Borsa Bağlantılarım</h3>
                  <p className="text-sm text-muted-foreground">
                    Binance, Bybit, OKX, KuCoin ve MEXC borsalarınızı buradan bağlayabilirsiniz.
                    API Key ve Secret'inizi girerek borsalarınızı sisteme tanıtın.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ API Key oluştururken "Withdrawal" (Para Çekme) iznini <strong>kapatın</strong>. 
                    Sadece "Read" ve "Trade" izinleri yeterlidir.
                  </p>
                </div>
              </CardContent>
            </Card>

            <IPWhitelistCard />
            
            <Card>
              <CardHeader>
                <CardTitle>Bağlı Borsalarım</CardTitle>
              </CardHeader>
              <CardContent>
                <ExchangeList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Settings Tab */}
          <TabsContent value="trading">
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">📊 Manuel İşlem Ayarları</h3>
                  <p className="text-sm text-muted-foreground">
                    Trading sayfasında manuel olarak pozisyon açarken kullanılacak varsayılan değerlerinizi buradan ayarlayın.
                    Her işlemde bu değerleri değiştirebilirsiniz.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Varsayılan İşlem Parametreleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTP">{t('settings.default_tp')} (%)</Label>
                    <Input
                      id="defaultTP"
                      type="number"
                      step="0.1"
                      value={defaultTP}
                      onChange={(e) => setDefaultTP(e.target.value)}
                      placeholder="2.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultSL">{t('settings.default_sl')} (%)</Label>
                    <Input
                      id="defaultSL"
                      type="number"
                      step="0.1"
                      value={defaultSL}
                      onChange={(e) => setDefaultSL(e.target.value)}
                      placeholder="1.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskPerTrade">{t('settings.risk_per_trade')} (%)</Label>
                    <Input
                      id="riskPerTrade"
                      type="number"
                      step="0.1"
                      value={riskPerTrade}
                      onChange={(e) => setRiskPerTrade(e.target.value)}
                      placeholder="2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPositions">{t('settings.max_positions')}</Label>
                    <Input
                      id="maxPositions"
                      type="number"
                      value={maxPositions}
                      onChange={(e) => setMaxPositions(e.target.value)}
                      placeholder="3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultLeverage">{t('settings.default_leverage')}x</Label>
                    <Input
                      id="defaultLeverage"
                      type="number"
                      value={defaultLeverage}
                      onChange={(e) => setDefaultLeverage(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveSettings}>{t('settings.save_settings')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto Trading Tab */}
          <TabsContent value="auto-trading">
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🤖 Otomatik Al-Sat Sistemi</h3>
                  <p className="text-sm text-muted-foreground">
                    Bot'u aktif ederek EMA (9/21) stratejisine göre otomatik işlem açabilirsiniz.
                    Bot belirlediğiniz coin'leri takip eder ve sinyal geldiğinde otomatik pozisyon açar.
                  </p>
                  <p className="text-xs text-destructive mt-2">
                    ⚠️ Otomatik işlem yapmadan önce stratejinizi ve risk yönetiminizi iyi ayarlayın.
                  </p>
                </div>
              </CardContent>
            </Card>

            <ProFeature feature="Otomatik Trading Botu">
              <AutoTradingToggle />
            </ProFeature>
          </TabsContent>

          {/* Custom Strategies Tab */}
          <TabsContent value="custom-strategies">
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">⚡ Özel Stratejiler</h3>
                  <p className="text-sm text-muted-foreground">
                    Kendi trading stratejilerinizi oluşturun. İstediğiniz göstergeleri seçin ve
                    alım-satım kurallarınızı belirleyin.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💎 Bu özellik sadece <strong>Enterprise</strong> paketinde mevcuttur.
                  </p>
                </div>
              </CardContent>
            </Card>

            <PremiumFeature feature="Özel Strateji Oluşturucu">
              <CustomStrategyBuilder />
            </PremiumFeature>
          </TabsContent>

          {/* Arbitrage Tab */}
          <TabsContent value="arbitrage">
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">📈 Arbitraj Tarayıcı</h3>
                  <p className="text-sm text-muted-foreground">
                    Borsalar arasındaki fiyat farklarını tespit edin ve arbitraj fırsatlarından kar edin.
                    Sistem otomatik olarak tüm borsalarınızı tarar.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💎 Bu özellik sadece <strong>Enterprise</strong> paketinde mevcuttur.
                  </p>
                </div>
              </CardContent>
            </Card>

            <PremiumFeature feature="Arbitraj Modülü">
              <ArbitrageScanner />
            </PremiumFeature>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">💎 Mevcut Paketim</h3>
                  <p className="text-sm text-muted-foreground">
                    Şu anda kullandığınız paket bilgileri ve özellikleri burada görünür.
                    Daha fazla özellik için paketinizi yükseltebilirsiniz.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Abonelik Detayları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold text-lg">{plan.name} Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {tier === 'free' ? t('settings.free_plan') : `$${plan.price}/${t('settings.month')}`}
                      </p>
                    </div>
                    {tier === 'free' && (
                      <Button onClick={() => navigate('/#pricing')}>
                        {t('settings.upgrade')}
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">{t('settings.plan_features')}</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">👤 Profil Bilgilerim</h3>
                  <p className="text-sm text-muted-foreground">
                    Hesap bilgileriniz ve dil ayarlarınız burada görünür.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hesap Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('settings.email')}</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.user_id')}</Label>
                    <Input value={user?.uid || ''} disabled className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.language')}</Label>
                    <div className="flex items-center gap-4">
                      <LanguageSwitcher />
                      <span className="text-sm text-muted-foreground">
                        {i18n.language === 'en' ? 'English' : 'Türkçe'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
