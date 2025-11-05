// Payment Integration Module
// LemonSqueezy for global payments

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  priceUSD: number;
  priceTRY: number;
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
    priceUSD: 0,
    priceTRY: 0,
    currency: 'USD',
    features: ['View all exchanges', 'Trading signals', 'Basic dashboard', 'Manual trading only'],
    exchangeLimit: -1,
    autoTrading: false,
    customStrategies: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 25,
    priceUSD: 25,
    priceTRY: 1052.83,
    currency: 'USD',
    features: [
      'Connect unlimited exchanges',
      'Automated trading bot',
      'EMA 9/21 strategy signals',
      'TP/SL management',
      'Advanced analytics',
      'Priority support',
    ],
    exchangeLimit: -1,
    autoTrading: true,
    customStrategies: false,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    priceUSD: 299,
    priceTRY: 12590.89,
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
