// API Configuration and Usage Control
// Centralized API endpoint management

export const API_CONFIG = {
  // Firebase Backend (Authentication, Database, Cloud Functions)
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  },

  // Exchange API configurations
  exchanges: {
    binance: {
      baseUrl: 'https://api.binance.com',
      testnetUrl: 'https://testnet.binance.vision',
    },
    bybit: {
      baseUrl: 'https://api.bybit.com',
      testnetUrl: 'https://api-testnet.bybit.com',
    },
    okx: {
      baseUrl: 'https://www.okx.com',
    },
    coinbase: {
      baseUrl: 'https://api.coinbase.com',
    },
  },

  // Rate limiting and usage controls
  rateLimits: {
    free: {
      requestsPerMinute: 10,
      maxPositions: 1,
      maxExchanges: 1,
    },
    pro: {
      requestsPerMinute: 60,
      maxPositions: 10,
      maxExchanges: 5,
    },
    unlimited: {
      requestsPerMinute: 300,
      maxPositions: -1, // unlimited
      maxExchanges: -1, // unlimited
    },
  },
};

// API request wrapper with error handling
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

// Check if user has reached their rate limit
export const checkRateLimit = (
  userTier: 'free' | 'pro' | 'unlimited',
  requestCount: number
): boolean => {
  const limit = API_CONFIG.rateLimits[userTier].requestsPerMinute;
  return requestCount < limit;
};

// Get user's position limit
export const getPositionLimit = (
  userTier: 'free' | 'pro' | 'unlimited'
): number => {
  return API_CONFIG.rateLimits[userTier].maxPositions;
};
