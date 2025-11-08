/**
 * API Configuration
 * ✅ COMPLETE VERSION - NO MISSING CODE
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Auth
  login: '/api/auth/login',
  register: '/api/auth/register',
  
  // Trading
  trade: '/api/trade',
  positions: '/api/positions',
  closePosition: (positionId: string) => `/api/positions/${positionId}/close`,
  
  // Balance & Market Data
  balance: (exchange: string) => `/api/balance/${exchange}`,
  ticker: (exchange: string, symbol: string) => `/api/ticker/${exchange}/${symbol}`,
  market: (exchange: string, symbol: string) => `/api/market/${exchange}/${symbol}`,
  markets: (exchange: string) => `/api/markets/${exchange}`,
  emaSignal: (exchange: string, symbol: string, interval: string) => 
    `/api/ema-signal/${exchange}/${symbol}/${interval}`,
  
  // Auto Trading
  autoTradingSettings: '/api/auto-trading/settings',
  autoTradingStatus: '/api/auto-trading/status',
  autoTradingStop: '/api/auto-trading/stop',
  signalsHistory: '/api/auto-trading/signals/history',
  
  // Exchanges
  exchanges: '/api/integrations/exchanges',
  addExchange: '/api/integrations/add',
  removeExchange: (exchangeId: string) => `/api/integrations/remove/${exchangeId}`,
  validateExchange: '/api/integrations/validate',
  
  // Transactions
  transactions: '/api/transactions/history',
  
  // Admin
  adminUsers: '/api/admin/users',
  adminUpdateUser: (userId: string) => `/api/admin/users/${userId}`,
  adminDeleteUser: (userId: string) => `/api/admin/users/${userId}`,
  
  // Payments
  paymentsWebhook: '/api/payments/webhook',
  
  // Health
  health: '/health',
  root: '/',
} as const;

export default API_ENDPOINTS;