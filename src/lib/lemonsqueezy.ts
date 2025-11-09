// LemonSqueezy Payment Integration
// Documentation: https://docs.lemonsqueezy.com/

// ✅ PRODUCTION Configuration
const LEMONSQUEEZY_CONFIG = {
  storeId: '239668',
  storeUrl: 'https://aitraderglobal.lemonsqueezy.com',
  
  // ⚠️ TEST MODE - Store henüz aktif değil
  // Kimlik doğrulama tamamlandıktan sonra Live mode'a geçin
  testMode: true,
  
  // ✅ VARIANT IDs - Test Mode
  variantIds: {
    free: '',
    pro: '1075011',        // EMA Navigator - Pro (TRY999.99/month)
    enterprise: '1075030', // EMA Navigator - Enterprise (TRY12,000/month)
  },
};

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
      setupLemonSqueezy();
      resolve();
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="lemonsqueezy"]');
    if (existingScript) {
      console.log('📜 LemonSqueezy script already in DOM');
      
      const checkInterval = setInterval(() => {
        if (window.LemonSqueezy) {
          clearInterval(checkInterval);
          console.log('✅ LemonSqueezy loaded from existing script');
          setupLemonSqueezy();
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.LemonSqueezy) {
          console.error('❌ LemonSqueezy timeout');
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
    
    script.onload = () => {
      console.log('📜 LemonSqueezy script loaded');
      
      setTimeout(() => {
        if (window.LemonSqueezy) {
          console.log('✅ LemonSqueezy object available');
          setupLemonSqueezy();
          resolve();
        } else {
          console.error('❌ LemonSqueezy object not available');
          reject(new Error('LemonSqueezy object not available'));
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load LemonSqueezy script:', error);
      reject(new Error('Failed to load LemonSqueezy script'));
    };
    
    document.head.appendChild(script);
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
          console.log('🚪 Checkout closed');
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

// Open checkout
export const openCheckout = async (options: CheckoutOptions): Promise<void> => {
  try {
    console.log('🛒 Opening checkout:', options);
    
    if (options.planId === 'free') {
      throw new Error('Free plan does not require checkout');
    }

    const variantId = LEMONSQUEEZY_CONFIG.variantIds[options.planId];

    if (!variantId) {
      throw new Error(`Variant ID not configured for ${options.planId}`);
    }

    console.log(`📦 Variant ID: ${variantId} (${options.planId})`);

    // Ensure LemonSqueezy is loaded
    await initializeLemonSqueezy();

    // ✅ Correct checkout URL format
    const checkoutUrl = `${LEMONSQUEEZY_CONFIG.storeUrl}/buy/${variantId}?` +
      `checkout[email]=${encodeURIComponent(options.email)}` +
      `&checkout[name]=${encodeURIComponent(options.name)}` +
      `&checkout[custom][user_id]=${encodeURIComponent(options.email)}` +
      (LEMONSQUEEZY_CONFIG.testMode ? '&checkout[test_mode]=true' : '');

    console.log('🔗 Checkout URL:', checkoutUrl);

    // Open checkout
    if (window.LemonSqueezy && window.LemonSqueezy.Url) {
      console.log('🚀 Opening LemonSqueezy overlay');
      window.LemonSqueezy.Url.Open(checkoutUrl);
    } else {
      console.log('🔄 Fallback: Opening in new window');
      window.open(checkoutUrl, '_blank');
    }
  } catch (error) {
    console.error('❌ Checkout error:', error);
    throw error;
  }
};

// Handle checkout success
const handleCheckoutSuccess = () => {
  console.log('✅ Checkout successful!');
  
  localStorage.setItem('checkout_success', 'true');
  
  setTimeout(() => {
    window.location.href = '/dashboard?payment=success';
  }, 1500);
};

// Generate checkout URL
export const getCheckoutUrl = (
  planId: 'free' | 'pro' | 'enterprise',
  email: string,
  name: string
): string => {
  if (planId === 'free') {
    return '#';
  }

  const variantId = LEMONSQUEEZY_CONFIG.variantIds[planId];
  
  if (!variantId) {
    console.error(`❌ Variant ID not found for ${planId}`);
    return '#';
  }

  const url = `${LEMONSQUEEZY_CONFIG.storeUrl}/buy/${variantId}?` +
    `checkout[email]=${encodeURIComponent(email)}` +
    `&checkout[name]=${encodeURIComponent(name)}` +
    `&checkout[custom][user_id]=${encodeURIComponent(email)}` +
    (LEMONSQUEEZY_CONFIG.testMode ? '&checkout[test_mode]=true' : '');
  
  return url;
};

// Preload LemonSqueezy
export const preloadLemonSqueezy = () => {
  console.log('⚡ Preloading LemonSqueezy...');
  initializeLemonSqueezy().catch((error) => {
    console.warn('⚠️ LemonSqueezy preload failed:', error);
  });
};

// Type definitions
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