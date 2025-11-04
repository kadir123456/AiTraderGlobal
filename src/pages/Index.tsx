import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-8 w-8 text-primary" />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Trader
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                {t('nav.features')}
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                {t('nav.pricing')}
              </a>
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
                {t('nav.docs')}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Link to="/auth">
                <Button variant="ghost">{t('nav.login')}</Button>
              </Link>
              <Link to="/auth">
                <Button>{t('nav.signup')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <div id="features">
        <Features />
      </div>

      {/* Pricing Section */}
      <div id="pricing">
        <Pricing />
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-xl font-bold mb-4">
                <Activity className="h-6 w-6 text-primary" />
                <span>AI Trader</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('footer.description')}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('footer.product')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">{t('nav.features')}</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">{t('nav.pricing')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('nav.docs')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('footer.company')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.about')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.blog')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.careers')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.contact')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('footer.legal')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-primary transition-colors">{t('footer.privacy')}</a></li>
                <li><a href="/terms" className="hover:text-primary transition-colors">{t('footer.terms')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.gdpr')}</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">{t('footer.risk')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>{t('footer.copyright')}</p>
            <p className="mt-2 text-xs">Version {import.meta.env.VITE_APP_VERSION || '1.0.0'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
