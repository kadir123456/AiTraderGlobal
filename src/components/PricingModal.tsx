import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Star, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PricingModal = ({ open, onOpenChange }: PricingModalProps) => {
  const { user } = useAuth();
  const { tier, plan } = useSubscription();
  const [loading, setLoading] = useState(false);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Star,
      price: 0,
      priceTRY: 0,
      description: 'Demo modda sistemi test edin',
      badge: 'Başlangıç',
      features: [
        { text: 'Dashboard görüntüleme', included: true },
        { text: 'Borsa fiyatlarını izleme', included: true },
        { text: 'EMA sinyallerini görme', included: true },
        { text: 'Gerçek API bağlantısı', included: false },
        { text: 'Auto-trading', included: false },
      ],
      cta: 'Ücretsiz',
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      icon: Zap,
      price: 25,
      priceTRY: 999.99,
      description: 'Ciddi traderlar için',
      badge: 'Popüler',
      features: [
        { text: 'FREE\'nin tüm özellikleri', included: true },
        { text: 'Unlimited borsa bağlantısı', included: true },
        { text: 'Spot & Futures işlemler', included: true },
        { text: 'Auto-trading bot', included: true },
        { text: 'EMA 9/21 stratejisi', included: true },
        { text: 'TP/SL yönetimi', included: true },
        { text: 'Priority support', included: true },
      ],
      cta: 'Pro\'ya Geç',
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Crown,
      price: 299,
      priceTRY: 12000,
      description: 'Profesyoneller için',
      badge: 'En İyi',
      features: [
        { text: 'PRO\'nun tüm özellikleri', included: true },
        { text: 'Custom stratejiler', included: true },
        { text: 'API access', included: true },
        { text: 'Arbitrage modülü', included: true },
        { text: 'Dedicated support', included: true },
        { text: '99.9% SLA', included: true },
      ],
      cta: 'Enterprise\'a Geç',
      highlighted: false,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Lütfen önce giriş yapın');
      return;
    }

    if (planId === 'free') {
      toast.info('Zaten ücretsiz plandayız');
      return;
    }

    if (tier === planId) {
      toast.info(`Zaten ${planId.toUpperCase()} planındasınız`);
      return;
    }

    setLoading(true);
    try {
      const { openCheckout } = await import('@/lib/lemonsqueezy');
      
      await openCheckout({
        planId: planId as 'free' | 'pro' | 'enterprise',
        email: user.email || '',
        name: user.displayName || user.email || 'User',
      });

      // Modal'ı kapat
      onOpenChange(false);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Ödeme sayfası açılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Paket Seçin
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Size uygun planı seçin ve trading'e başlayın
          </DialogDescription>
          
          {user && (
            <div className="flex justify-center mt-4">
              <Badge variant="outline" className="text-base py-2 px-4">
                Mevcut Plan: {plan.name}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {plans.map((planData) => {
            const Icon = planData.icon;
            const isCurrentPlan = tier === planData.id;

            return (
              <Card
                key={planData.id}
                className={`relative ${
                  planData.highlighted
                    ? 'border-primary shadow-lg ring-2 ring-primary/20'
                    : 'border-border'
                }`}
              >
                {planData.highlighted && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      {planData.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-3 p-2 bg-primary/10 rounded-full w-fit">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{planData.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {planData.description}
                  </CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">
                        ₺{planData.priceTRY.toLocaleString('tr-TR')}
                      </span>
                      {planData.id !== 'free' && (
                        <span className="text-muted-foreground text-sm">/ay</span>
                      )}
                    </div>
                    {planData.id !== 'free' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~${planData.price}/ay
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {planData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
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
                    onClick={() => handleSubscribe(planData.id)}
                    disabled={isCurrentPlan || loading}
                  >
                    {isCurrentPlan ? 'Mevcut Plan' : planData.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            ✅ Güvenli ödeme (LemonSqueezy)  •  🔒 SSL şifrelemesi  •  🔄 İstediğiniz zaman iptal
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};