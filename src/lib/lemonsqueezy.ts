// LemonSqueezy Payment Integration
// Documentation: https://docs.lemonsqueezy.com/

// Configuration - Update these with your actual values
const LEMONSQUEEZY_CONFIG = {
  storeId: '239668',
  apiUrl: 'https://aitraderglobal.onrender.com',
  variantIds: {
    free: '',
    pro: '1075011',
    enterprise: '1075030',
  },
};

export interface LemonSqueezyConfig {
  storeId: string;
  variantIds: {
    free: string;
    pro: string;
    enterprise: string;
  };
}

export interface CheckoutOptions {
  name: string;
  email: string;
  planId: 'free' | 'pro' | 'enterprise';
}

// Initialize LemonSqueezy
export const initializeLemonSqueezy = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.LemonSqueezy) {
      resolve();
      return;
    }

    // Load LemonSqueezy script
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.LemonSqueezy) {
        window.LemonSqueezy.Setup({
          eventHandler: (event: any) => {
            console.log('LemonSqueezy event:', event);
            if (event === 'Checkout.Success') {
              handleCheckoutSuccess();
            }
          }
        });
        resolve();
      } else {
        reject(new Error('LemonSqueezy failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load LemonSqueezy script'));
    };
    
    document.head.appendChild(script);
  });
};

// Open checkout for a plan
export const openCheckout = async (options: CheckoutOptions): Promise<void> => {
  const storeId = LEMONSQUEEZY_CONFIG.storeId;
  
  if (!storeId) {
    throw new Error('LemonSqueezy store ID not configured.');
  }

  // Get variant ID for the plan
  const variantId = LEMONSQUEEZY_CONFIG.variantIds[options.planId];

  if (!variantId) {
    throw new Error(`Variant ID not configured for ${options.planId} plan`);
  }

  // Ensure LemonSqueezy is loaded
  await initializeLemonSqueezy();

  // Open checkout overlay
  if (window.LemonSqueezy) {
    window.LemonSqueezy.Url.Open(
      `https://ema-navigator.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(options.email)}&checkout[name]=${encodeURIComponent(options.name)}`
    );
  } else {
    throw new Error('LemonSqueezy not initialized');
  }
};

// Handle successful checkout
const handleCheckoutSuccess = () => {
  console.log('Checkout successful! Redirecting to dashboard...');
  // Refresh user subscription status
  window.location.href = '/dashboard';
};

// Generate checkout URL (for direct links)
export const getCheckoutUrl = (planId: 'free' | 'pro' | 'enterprise', email: string, name: string): string => {
  const variantId = LEMONSQUEEZY_CONFIG.variantIds[planId];
  
  if (!variantId) {
    console.error(`Variant ID not configured for ${planId} plan`);
    return '#';
  }

  return `https://ema-navigator.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(email)}&checkout[name]=${encodeURIComponent(name)}`;
};

// Type augmentation
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (config: { eventHandler?: (event: string) => void }) => void;
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
      Affiliate: {
        GetID: () => string | null;
        Build: (config: any) => string;
      };
    };
  }
}
