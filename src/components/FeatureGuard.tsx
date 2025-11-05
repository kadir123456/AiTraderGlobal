import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, Zap, Crown } from 'lucide-react';

interface FeatureGuardProps {
  requiredPlan: 'pro' | 'premium';
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
    premium: 2 
  };
  
  const hasAccess = planOrder[tier] >= planOrder[requiredPlan];
  
  if (!hasAccess) {
    const Icon = requiredPlan === 'premium' ? Crown : Zap;
    
    return (
      <Alert className="border-primary/50">
        <Icon className="h-4 w-4 text-primary" />
        <AlertTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {requiredPlan === 'premium' ? 'Premium' : 'Pro'} Özellik
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>
            <strong>{feature}</strong> özelliği{' '}
            <span className="text-primary font-bold">
              {requiredPlan.toUpperCase()}
            </span>{' '}
            planında mevcut.
          </p>
          
          {tier === 'free' && (
            <div className="text-sm text-muted-foreground">
              <p>Pro plan ile:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>5 Borsa bağlantısı</li>
                <li>Spot & Futures trading</li>
                <li>10 açık pozisyon</li>
                <li>Auto-trading bot</li>
              </ul>
            </div>
          )}
          
          {tier === 'pro' && requiredPlan === 'premium' && (
            <div className="text-sm text-muted-foreground">
              <p>Premium plan ile:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Sınırsız borsa</li>
                <li>50 açık pozisyon</li>
                <li>Custom stratejiler</li>
                <li>API access</li>
                <li>Dedicated support</li>
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
              {requiredPlan === 'premium' ? 'Premium\'a' : 'Pro\'ya'} Yükselt
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

export const PremiumFeature = ({ children, feature }: { children: ReactNode; feature: string }) => (
  <FeatureGuard requiredPlan="premium" feature={feature}>
    {children}
  </FeatureGuard>
);
