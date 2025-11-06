// LemonSqueezy Payment Integration
// Documentation: https://docs.lemonsqueezy.com/

// Configuration - Update these with your actual values
const LEMONSQUEEZY_CONFIG = {
  storeId: '239668',
  apiUrl: 'https://aitraderglobal.onrender.com',
  // TEST MODE: These are test variant IDs
  // Replace with production IDs when going live
  variantIds: {
    free: '',
    pro: '1075011',      // Test mode variant ID
    enterprise: '1075030', // Test mode variant ID
  },
  // NOTE: Make sure these variants exist in your LemonSqueezy dashboard
  // and are in TEST mode, not LIVE mode
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
    console.log('🔄 Initializing LemonSqueezy...');
    
    // Check if already loaded
    if (window.LemonSqueezy) {
      console.log('✅ LemonSqueezy already loaded');
      resolve();
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="lemonsqueezy"]');
    if (existingScript) {
      console.log('📜 LemonSqueezy script already in DOM, waiting for load...');
      
      // Wait for existing script to load
      const checkInterval = setInterval(() => {
        if (window.LemonSqueezy) {
          clearInterval(checkInterval);
          console.log('✅ LemonSqueezy loaded from existing script');
          setupLemonSqueezy();
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.LemonSqueezy) {
          console.error('❌ LemonSqueezy timeout - script loaded but object not available');
          reject(new Error('LemonSqueezy timeout'));
        }
      }, 10000);
      
      return;
    }

    // Load LemonSqueezy script
    console.log('📥 Loading LemonSqueezy script...');
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.async = true;
    script.defer = false; // Changed to false for immediate execution
    
    script.onload = () => {
      console.log('📜 LemonSqueezy script loaded');
      
      // Wait a bit for the object to be available
      setTimeout(() => {
        if (window.LemonSqueezy) {
          console.log('✅ LemonSqueezy object available');
          setupLemonSqueezy();
          resolve();
        } else {
          console.error('❌ LemonSqueezy object not available after script load');
          reject(new Error('LemonSqueezy object not available'));
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load LemonSqueezy script:', error);
      reject(new Error('Failed to load LemonSqueezy script'));
    };
    
    document.head.appendChild(script);
    console.log('📜 LemonSqueezy script added to document head');
  });
};

// Setup LemonSqueezy event handlers
const setupLemonSqueezy = () => {
  if (!window.LemonSqueezy) return;
  
  try {
    window.LemonSqueezy.Setup({
      eventHandler: (event: any) => {
        console.log('🍋 LemonSqueezy event:', event);
        
        if (event === 'Checkout.Success') {
          handleCheckoutSuccess();
        } else if (event === 'Checkout.Close') {
          console.log('🚪 Checkout closed by user');
        } else if (event === 'Checkout.Error') {
          console.error('❌ Checkout error');
        }
      }
    });
    console.log('✅ LemonSqueezy event handlers configured');
  } catch (error) {
    console.error('❌ Error setting up LemonSqueezy:', error);
  }
};

// Open checkout for a plan
export const openCheckout = async (options: CheckoutOptions): Promise<void> => {
  try {
    console.log('🛒 Opening checkout for:', options);
    
    const storeId = LEMONSQUEEZY_CONFIG.storeId;
    
    if (!storeId) {
      throw new Error('LemonSqueezy store ID not configured.');
    }

    // Get variant ID for the plan
    const variantId = LEMONSQUEEZY_CONFIG.variantIds[options.planId];

    if (!variantId) {
      throw new Error(`Variant ID not configured for ${options.planId} plan`);
    }

    console.log(`📦 Using variant ID: ${variantId} for ${options.planId} plan`);

    // Ensure LemonSqueezy is loaded
    await initializeLemonSqueezy();

    // Build checkout URL with custom data
    const checkoutUrl = `https://ema-navigator.lemonsqueezy.com/checkout/buy/${variantId}?` + 
      `checkout[email]=${encodeURIComponent(options.email)}` +
      `&checkout[name]=${encodeURIComponent(options.name)}` +
      `&checkout[custom][user_email]=${encodeURIComponent(options.email)}`;

    console.log('🔗 Checkout URL:', checkoutUrl);

    // Open checkout overlay
    if (window.LemonSqueezy && window.LemonSqueezy.Url) {
      console.log('🚀 Opening LemonSqueezy checkout overlay...');
      window.LemonSqueezy.Url.Open(checkoutUrl);
    } else {
      console.error('❌ LemonSqueezy.Url not available');
      // Fallback: Open in new tab
      console.log('🔄 Fallback: Opening checkout in new window');
      window.open(checkoutUrl, '_blank');
    }
  } catch (error) {
    console.error('❌ Checkout error:', error);
    throw error;
  }
};

// Handle successful checkout
const handleCheckoutSuccess = () => {
  console.log('✅ Checkout successful! Redirecting to dashboard...');
  
  // Store success flag
  localStorage.setItem('checkout_success', 'true');
  
  // Refresh user subscription status after a delay
  setTimeout(() => {
    window.location.href = '/dashboard?payment=success';
  }, 1500);
};

// Generate checkout URL (for direct links)
export const getCheckoutUrl = (planId: 'free' | 'pro' | 'enterprise', email: string, name: string): string => {
  const variantId = LEMONSQUEEZY_CONFIG.variantIds[planId];
  
  if (!variantId) {
    console.error(`❌ Variant ID not configured for ${planId} plan`);
    return '#';
  }

  const url = `https://ema-navigator.lemonsqueezy.com/checkout/buy/${variantId}?` +
    `checkout[email]=${encodeURIComponent(email)}` +
    `&checkout[name]=${encodeURIComponent(name)}` +
    `&checkout[custom][user_email]=${encodeURIComponent(email)}`;
  
  console.log(`🔗 Generated checkout URL for ${planId}:`, url);
  return url;
};

// Preload LemonSqueezy on app initialization
export const preloadLemonSqueezy = () => {
  console.log('⚡ Preloading LemonSqueezy...');
  initializeLemonSqueezy().catch((error) => {
    console.warn('⚠️ LemonSqueezy preload failed (non-critical):', error);
  });
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
