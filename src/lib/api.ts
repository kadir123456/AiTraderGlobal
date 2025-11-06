import axios from 'axios';

const API_BASE_URL = 'https://aitraderglobal.onrender.com';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug logging
console.log('🔧 API Configuration:', {
  Final_API_BASE_URL: API_BASE_URL,
  Mode: import.meta.env.MODE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('🔒 401 Unauthorized:', {
        url: error.config?.url,
        hasToken: !!localStorage.getItem('auth_token'),
        tokenPreview: localStorage.getItem('auth_token')?.substring(0, 20) + '...',
        errorDetail: error.response?.data
      });
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (email: string, password: string, fullName?: string) =>
    api.post('/api/auth/register', { email, password, full_name: fullName }),
  
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
};

// Exchange API Keys
export const exchangeAPI = {
  addApiKey: (exchange: string, apiKey: string, apiSecret: string, passphrase?: string) =>
    api.post('/api/user/api-keys', { 
      exchange, 
      api_key: apiKey, 
      api_secret: apiSecret,
      ...(passphrase && { passphrase })
    }),
  
  getApiKeys: () => api.get('/api/user/api-keys'),
  
  // ❌ HATA BURADAYDI: Backtick yerine parantez kullanılmalı
  removeApiKey: (exchangeId: string) =>
    api.delete(`/api/user/api-keys/${exchangeId}`),
};

// Bot/Trading API
export const botAPI = {
  getEmaSignal: (exchange: string, symbol: string, interval: string = '15m') =>
    api.post('/api/bot/ema-signal', { exchange, symbol, interval }),
  
  getPositions: () => api.get('/api/bot/positions'),
  
  createPosition: (
    exchange: string,
    symbol: string,
    side: string,
    amount: number,
    tpPercentage: number,
    slPercentage: number
  ) =>
    api.post('/api/bot/positions', {
      exchange,
      symbol,
      side,
      amount,
      tp_percentage: tpPercentage,
      sl_percentage: slPercentage,
    }),
  
  closePosition: (positionId: string) =>
    api.delete(`/api/bot/positions/${positionId}`),
};

// Payment API
export const paymentAPI = {
  getSubscription: () => api.get('/api/payments/subscription'),
};

export default api;
