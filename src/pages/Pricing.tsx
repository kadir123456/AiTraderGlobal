import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Star, Zap, Crown, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, plan } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Star,
      price: { monthly: 0, yearly: 0 },
      description: 'Demo modda sistemi test edin',
      badge: 'Başlangıç',
      features: [
        { text: 'Dashboard görüntüleme', included: true },
        { text: 'Borsa fiyatlarını izleme', included: true },
        { text: 'EMA sinyallerini görme', included: true },
        { text: '1 demo pozisyon', included: true },
        { text: 'Temel grafikler', included: true },
        { text: 'Gerçek API bağlantısı', included: false },
        { text: 'Futures/Leverage', included: false },
        { text: 'Auto-trading', included: false },
        { text: 'Priority support', included: false },
      ],
      cta: 'Ücretsiz Başla',
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: Zap,
      price: { monthly: 25, yearly: 250 }, // ~20% discount yearly
      description: 'Ciddi traderlar için tam özellikli paket',
      badge: 'Popüler',
      features: [
        { text: 'FREE\'nin tüm özellikleri', included: true },
        { text: '5 Borsa API bağlantısı', included: true },
        { text: 'Spot & Futures işlemler', included: true },
        { text: 'Leverage kullanma (1x-125x)', included: true },
        { text: '10 açık pozisyon', included: true },
        { text: 'Auto-trading bot', included: true },
        { text: 'EMA 9/21 stratejisi', included: true },
        { text: 'TP/SL otomatik yönetimi', included: true },
        { text: 'Gelişmiş analytics', included: true },
        { text: 'Priority support', included: true },
        { text: 'Custom stratejiler', included: false },
        { text: 'API access', included: false },
      ],
      cta: 'Pro\'ya Geç',
      highlighted: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Crown,
      price: { monthly: 299, yearly: 2990 }, // ~17% discount yearly
      description: 'Profesyoneller ve kurumlar için',
      badge: 'En İyi',
      features: [
        { text: 'PRO\'nun tüm özellikleri', included: true },
        { text: 'Unlimited borsa bağlantısı', included: true },
        { text: '50 açık pozisyon', included: true },
        { text: 'Custom trading stratejileri', included: true },
        { text: 'REST API access', included: true },
        { text: 'Arbitrage modülü', included: true },
        { text: 'Webhook entegrasyonları', included: true },
        { text: 'Dedicated support', included: true },
        { text: '99.9% SLA garantisi', included: true },
        { text: 'Training & consulting', included: true },
        { text: 'Özel özellik talepleri', included: true },
      ],
      cta: 'Premium\'a Geç',
      highlighted: false,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Lütfen önce giriş yapın');
      navigate('/auth');
      return;
    }

    if (planId === 'free') {
      toast.info('Zaten ücretsiz plandayın');
      return;
    }

    if (tier === planId) {
      toast.info(`Zaten ${planId.toUpperCase()} planındasınız`);
      return;
    }

    try {
      const { openCheckout } = await import('@/lib/lemonsqueezy');
      
      await openCheckout({
        planId: planId as 'free' | 'pro' | 'enterprise',
        email: user.email || '',
        name: user.displayName || user.email || 'User',
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Ödeme sayfası açılamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Geri
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Size Uygun Planı Seçin
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Demo modda ücretsiz test edin, hazır olduğunuzda Pro'ya geçin
          </p>

          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingPeriod('monthly')}
            >
              Aylık
            </Button>
            <Button
              variant={billingPeriod === 'yearly' ? 'default' : 'outline'}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yıllık
              <Badge className="ml-2" variant="secondary">%20 İndirim</Badge>
            </Button>
          </div>

          {user && (
            <div className="mt-6">
              <Badge variant="outline" className="text-lg py-2 px-4">
                Mevcut Plan: {plan.name}
              </Badge>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((planData) => {
            const Icon = planData.icon;
            const price = billingPeriod === 'monthly' ? planData.price.monthly : planData.price.yearly;
            const isCurrentPlan = tier === planData.id;

            return (
              <Card
                key={planData.id}
                className={`relative ${
                  planData.highlighted
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border'
                }`}
              >
                {planData.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      {planData.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{planData.name}</CardTitle>
                  <CardDescription className="mt-2">{planData.description}</CardDescription>
                  
                  <div className="mt-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">${price}</span>
                      {planData.id !== 'free' && (
                        <span className="text-muted-foreground">
                          /{billingPeriod === 'monthly' ? 'ay' : 'yıl'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' && planData.id !== 'free' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${(price / 12).toFixed(2)}/ay olarak faturalandırılır
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {planData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground'}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={planData.highlighted ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleSubscribe(planData.id)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Mevcut Plan' : planData.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Sık Sorulan Sorular</h2>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Free planla ne yapabilirim?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Free plan ile sistemimizi demo modda test edebilirsiniz. Borsa fiyatlarını izleyebilir,
                  EMA sinyallerini görebilir ve 1 demo pozisyon açabilirsiniz. Gerçek API bağlantısı için
                  Pro plana geçmeniz gerekiyor.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ödeme nasıl yapılır?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ödemelerinizi güvenli LemonSqueezy platformu üzerinden kredi kartı ile yapabilirsiniz.
                  Tüm ödemeler SSL şifrelemesi ile korunmaktadır.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">İstediğim zaman iptal edebilir miyim?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Evet! Aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal ettiğinizde mevcut
                  dönem sonuna kadar plana erişiminiz devam eder.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hangi borsaları destekliyorsunuz?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Binance, Bybit, OKX, KuCoin ve MEXC borsalarını destekliyoruz. Hem spot hem de
                  futures işlemler yapabilirsiniz (Pro/Premium planlarda).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API anahtarlarım güvende mi?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Evet! Tüm API anahtarları şifrelenmiş olarak saklanır ve asla kimseyle paylaşılmaz.
                  Withdrawal (çekim) izni gerektirmiyoruz, sadece okuma ve trade izinleri yeterli.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">Hala karar veremediniz mi?</CardTitle>
              <CardDescription className="text-lg mt-2">
                Ücretsiz planla başlayın, hiçbir kredi kartı gerekmez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => user ? navigate('/dashboard') : navigate('/auth')}>
                {user ? 'Dashboard\'a Git' : 'Ücretsiz Başla'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
