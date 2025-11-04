import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentAPI } from '@/lib/api';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  features: string[];
  exchangeLimit: number;
  autoTrading: boolean;
  customStrategies: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    features: ['1 exchange connection', 'Trading signals', 'Basic dashboard'],
    exchangeLimit: 1,
    autoTrading: false,
    customStrategies: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'USD',
    features: [
      '5 exchange connections',
      'Automated trading',
      'EMA strategies',
      'TP/SL management',
      'Advanced analytics',
      'Priority support',
    ],
    exchangeLimit: 5,
    autoTrading: true,
    customStrategies: false,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    currency: 'USD',
    features: [
      'Unlimited exchanges',
      'Custom strategies',
      'API access',
      'Arbitrage module',
      'Dedicated support',
      'SLA guarantee',
      'Training & consulting',
    ],
    exchangeLimit: -1, // -1 means unlimited
    autoTrading: true,
    customStrategies: true,
  },
};

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
