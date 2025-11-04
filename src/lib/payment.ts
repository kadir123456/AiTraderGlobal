// Payment Integration Module
// LemonSqueezy for global payments

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

// Check user's subscription tier and permissions
export const checkUserPermission = (
  userTier: SubscriptionTier,
  requiredFeature: 'autoTrading' | 'customStrategies' | 'exchangeLimit'
): boolean => {
  const plan = SUBSCRIPTION_PLANS[userTier];
  
  if (requiredFeature === 'exchangeLimit') {
    return true; // Return number check to caller
  }
  
  return plan[requiredFeature] === true;
};

// Get user's exchange limit
export const getExchangeLimit = (userTier: SubscriptionTier): number => {
  return SUBSCRIPTION_PLANS[userTier].exchangeLimit;
};
