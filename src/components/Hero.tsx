import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, Zap, Shield, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Hero = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      
      {/* Content */}
      <div className="relative container mx-auto px-4 py-24 sm:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium">{t('hero.badge')}</span>
          </div>
          
          {/* Multi-Exchange Support Badge */}
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-3 py-1 bg-card/50 border border-border rounded-full">Binance</span>
            <span className="px-3 py-1 bg-card/50 border border-border rounded-full">Bybit</span>
            <span className="px-3 py-1 bg-card/50 border border-border rounded-full">OKX</span>
            <span className="px-3 py-1 bg-card/50 border border-border rounded-full">KuCoin</span>
            <span className="px-3 py-1 bg-card/50 border border-border rounded-full">MEXC</span>
            <span className="px-3 py-1 bg-primary/20 border border-primary/40 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              +More
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            {t('hero.title')}
            <span className="block mt-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('hero.subtitle')}
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/auth">
              <Button size="lg" className="text-base">
                {t('hero.cta_primary')}
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="text-base">
                {t('hero.cta_secondary')}
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
            {[
              {
                icon: TrendingUp,
                title: t('hero.feature1_title'),
                description: t('hero.feature1_desc'),
              },
              {
                icon: Zap,
                title: t('hero.feature2_title'),
                description: t('hero.feature2_desc'),
              },
              {
                icon: Shield,
                title: t('hero.feature3_title'),
                description: t('hero.feature3_desc'),
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all group"
              >
                <feature.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
