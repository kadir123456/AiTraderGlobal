import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentAPI } from '@/lib/api';
import { SUBSCRIPTION_PLANS } from '@/lib/payment';
import type { SubscriptionTier, SubscriptionPlan } from '@/lib/payment';

export type { SubscriptionTier, SubscriptionPlan };
export { SUBSCRIPTION_PLANS };

export const useSubscription = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const response = await paymentAPI.getSubscription();
        setTier(response.data.plan || 'free');
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        setTier('free');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const canAccessFeature = (feature: keyof typeof SUBSCRIPTION_PLANS['free']) => {
    const plan = SUBSCRIPTION_PLANS[tier];
    return plan[feature] === true;
  };

  return {
    tier,
    loading,
    plan: SUBSCRIPTION_PLANS[tier],
    canAccessFeature,
  };
};
