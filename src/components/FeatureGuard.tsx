import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, Zap, Crown } from 'lucide-react';

interface FeatureGuardProps {
  requiredPlan: 'pro' | 'enterprise';
  feature: string;
  children: ReactNode;
  showUpgrade?: boolean;
}

export const FeatureGuard = ({
  requiredPlan,
  feature,
  children,
  showUpgrade = true
}: FeatureGuardProps) => {
  const { tier } = useSubscription();
  const navigate = useNavigate();

  // Plan hierarchy
  const planOrder: Record<string, number> = {
    free: 0,
    pro: 1,
    enterprise: 2
  };

  const hasAccess = planOrder[tier] >= planOrder[requiredPlan];

  if (!hasAccess) {
    const Icon = requiredPlan === 'enterprise' ? Crown : Zap;
    
    return (
      <Alert className="border-primary/50">
        <Icon className="h-4 w-4 text-primary" />
        <AlertTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {requiredPlan === 'enterprise' ? 'Enterprise' : 'Pro'} Özellik
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            <strong>{feature}</strong> özelliği{' '}
            <span className="text-primary font-bold">
              {requiredPlan.toUpperCase()}
            </span>{' '}
            planında mevcut.
          </p>

          {tier === 'free' && requiredPlan === 'pro' && (
            <div className="text-sm text-muted-foreground">
              <p>Pro plan ile:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Sınırsız borsa bağlantısı</li>
                <li>Otomatik trading bot</li>
                <li>EMA 9/21 stratejileri</li>
                <li>TP/SL yönetimi</li>
                <li>Gelişmiş analitik</li>
              </ul>
            </div>
          )}

          {tier === 'free' && requiredPlan === 'enterprise' && (
            <div className="text-sm text-muted-foreground">
              <p>Enterprise plan ile:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Tüm Pro özellikleri</li>
                <li>Özel strateji oluşturucu</li>
                <li>Arbitraj modülü</li>
                <li>API erişimi</li>
                <li>Özel destek</li>
              </ul>
            </div>
          )}

          {tier === 'pro' && requiredPlan === 'enterprise' && (
            <div className="text-sm text-muted-foreground">
              <p>Enterprise plan ile:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Özel strateji oluşturucu</li>
                <li>Arbitraj tarayıcı</li>
                <li>API erişimi</li>
                <li>Özel danışmanlık</li>
                <li>SLA garantisi</li>
              </ul>
            </div>
          )}

          {showUpgrade && (
            <Button
              onClick={() => navigate('/pricing')}
              className="w-full mt-2"
              variant="default"
            >
              <Icon className="h-4 w-4 mr-2" />
              {requiredPlan === 'enterprise' ? 'Enterprise\'a' : 'Pro\'ya'} Yükselt
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  return <>{children}</>;
};

// Quick access guards
export const ProFeature = ({ children, feature }: { children: ReactNode; feature: string }) => (
  <FeatureGuard requiredPlan="pro" feature={feature}>
    {children}
  </FeatureGuard>
);

export const EnterpriseFeature = ({ children, feature }: { children: ReactNode; feature: string }) => (
  <FeatureGuard requiredPlan="enterprise" feature={feature}>
    {children}
  </FeatureGuard>
);

// Alias for backwards compatibility
export const PremiumFeature = EnterpriseFeature;
