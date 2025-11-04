import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const Pricing = () => {
  const { t } = useTranslation();

  const plans = [
    {
      name: t('pricing.free_name'),
      price: t('pricing.free_price'),
      period: t('pricing.free_period'),
      description: t('pricing.free_desc'),
      features: [
        t('pricing.feature_1_exchange'),
        t('pricing.feature_signals'),
        t('pricing.feature_dashboard'),
        t('pricing.feature_demo'),
        t('pricing.feature_support'),
      ],
      cta: t('pricing.free_cta'),
      highlighted: false,
    },
    {
      name: t('pricing.pro_name'),
      price: t('pricing.pro_price'),
      period: t('pricing.pro_period'),
      description: t('pricing.pro_desc'),
      features: [
        t('pricing.feature_5_exchanges'),
        t('pricing.feature_auto_trading'),
        t('pricing.feature_ema'),
        t('pricing.feature_tpsl'),
        t('pricing.feature_analytics'),
        t('pricing.feature_priority_support'),
        t('pricing.feature_arbitrage'),
      ],
      cta: t('pricing.pro_cta'),
      highlighted: true,
    },
    {
      name: t('pricing.enterprise_name'),
      price: t('pricing.enterprise_price'),
      period: t('pricing.enterprise_period'),
      description: t('pricing.enterprise_desc'),
      features: [
        t('pricing.feature_unlimited_exchanges'),
        t('pricing.feature_custom_strategies'),
        t('pricing.feature_api'),
        t('pricing.feature_dedicated_support'),
        t('pricing.feature_sla'),
        t('pricing.feature_training'),
      ],
      cta: t('pricing.enterprise_cta'),
      highlighted: false,
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative border-border bg-card/50 backdrop-blur-sm ${
                plan.highlighted
                  ? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-105"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    {t('pricing.popular')}
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          {t('pricing.guarantee')}
        </p>
      </div>
    </section>
  );
};

export default Pricing;
