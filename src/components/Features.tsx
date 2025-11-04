import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  RefreshCw, 
  Zap, 
  Shield, 
  BarChart3, 
  Lock 
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: TrendingUp,
      title: t('features.ema_title'),
      description: t('features.ema_desc'),
    },
    {
      icon: RefreshCw,
      title: t('features.exchange_title'),
      description: t('features.exchange_desc'),
    },
    {
      icon: Zap,
      title: t('features.execution_title'),
      description: t('features.execution_desc'),
    },
    {
      icon: Shield,
      title: t('features.risk_title'),
      description: t('features.risk_desc'),
    },
    {
      icon: BarChart3,
      title: t('features.analytics_title'),
      description: t('features.analytics_desc'),
    },
    {
      icon: Lock,
      title: t('features.security_title'),
      description: t('features.security_desc'),
    },
  ];

  return (
    <section className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('features.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
