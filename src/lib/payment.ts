// Payment Integration Module
// Supports Paddle and LemonSqueezy for global payments

export type SubscriptionTier = 'free' | 'pro' | 'unlimited';

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
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited',
    price: 99,
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

// Paddle Configuration
export const initializePaddle = async () => {
  const paddleVendorId = import.meta.env.VITE_PADDLE_VENDOR_ID;
  
  if (!paddleVendorId) {
    console.warn('Paddle vendor ID not configured');
    return null;
  }

  // Load Paddle.js script
  const script = document.createElement('script');
  script.src = 'https://cdn.paddle.com/paddle/paddle.js';
  script.async = true;
  document.head.appendChild(script);

  return new Promise((resolve) => {
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Setup({ vendor: parseInt(paddleVendorId) });
        resolve(window.Paddle);
      }
    };
  });
};

// LemonSqueezy Configuration
export const initializeLemonSqueezy = () => {
  const lemonSqueezyStoreId = import.meta.env.VITE_LEMONSQUEEZY_STORE_ID;
  
  if (!lemonSqueezyStoreId) {
    console.warn('LemonSqueezy store ID not configured');
    return null;
  }

  window.createLemonSqueezy = () => {
    window.LemonSqueezy?.Setup({ storeId: lemonSqueezyStoreId });
  };

  // Load LemonSqueezy script
  const script = document.createElement('script');
  script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
  script.async = true;
  script.defer = true;
  script.onload = () => window.createLemonSqueezy?.();
  document.head.appendChild(script);
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

// Type augmentation for window object
declare global {
  interface Window {
    Paddle?: any;
    LemonSqueezy?: any;
    createLemonSqueezy?: () => void;
  }
}
