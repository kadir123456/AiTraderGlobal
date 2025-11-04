import axios from 'axios';

// API Base URL - update this with your Render backend URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      localStorage.removeItem('auth_token');
      window.location.href = '/auth';
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
  addApiKey: (exchange: string, apiKey: string, apiSecret: string) =>
    api.post('/api/user/api-keys', { exchange, api_key: apiKey, api_secret: apiSecret }),
  
  getApiKeys: () => api.get('/api/user/api-keys'),
  
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
};

// Payment API
export const paymentAPI = {
  getSubscription: () => api.get('/api/payments/subscription'),
};

export default api;
