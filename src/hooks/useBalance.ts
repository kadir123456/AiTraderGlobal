import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Balance {
  exchange: string;
  type: 'spot' | 'futures';
  totalBalance: number;
  availableBalance: number;
  usedBalance: number;
  currency: string;
  loading: boolean;
  error?: string;
}

const API_BASE_URL = 'https://aitraderglobal.onrender.com';

// ✅ Cache mekanizması eklendi
const balanceCache = new Map<string, { data: Balance; timestamp: number }>();
const CACHE_DURATION = 120000; // 2 dakika (120 saniye)

export const useBalance = (exchanges: string[], isFutures: boolean = true) => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ exchanges array'i memoize edilerek gereksiz re-render önlendi
  const exchangeList = useMemo(() => {
    return exchanges.sort().join(',');
  }, [exchanges]);

  const fetchBalances = useCallback(async (forceRefresh = false) => {
    if (!user || exchanges.length === 0) {
      setBalances([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const results: Balance[] = [];
    const token = localStorage.getItem('auth_token');
    const now = Date.now();

    // ✅ Paralel istekler - Her exchange için aynı anda istek
    const fetchPromises = exchanges.map(async (exchange) => {
      const cacheKey = `${user.uid}_${exchange}_${isFutures ? 'futures' : 'spot'}`;
      
      // ✅ Cache kontrolü
      if (!forceRefresh) {
        const cached = balanceCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          console.log(`📦 Using cached balance for ${exchange}`);
          return cached.data;
        }
      }

      try {
        console.log(`📡 Fetching balance for ${exchange}...`);
        
        const response = await axios.get(
          `${API_BASE_URL}/api/bot/balance/${exchange}`,
          {
            params: { is_futures: isFutures },
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 30000, // 30 saniye timeout
          }
        );

        const balance: Balance = {
          exchange: exchange,
          type: isFutures ? 'futures' : 'spot',
          totalBalance: response.data.total_balance || 0,
          availableBalance: response.data.available_balance || 0,
          usedBalance: response.data.used_balance || 0,
          currency: response.data.currency || 'USDT',
          loading: false,
        };

        // ✅ Cache'e kaydet
        balanceCache.set(cacheKey, { data: balance, timestamp: now });
        
        console.log(`✅ Balance fetched for ${exchange}:`, balance.availableBalance);
        return balance;

      } catch (error: any) {
        console.error(`❌ Failed to fetch balance for ${exchange}:`, {
          status: error.response?.status,
          detail: error.response?.data?.detail,
          message: error.message,
        });

        let errorMessage = 'Bakiye alınamadı. API anahtarlarınızı kontrol edin.';

        // Özel hata mesajları
        if (error.response?.status === 401) {
          errorMessage = 'API anahtarları geçersiz. Lütfen ayarlardan kontrol edin.';
        } else if (error.response?.status === 404) {
          errorMessage = 'API anahtarları bulunamadı. Lütfen önce borsa bağlayın.';
        } else if (error.response?.status === 429) {
          errorMessage = 'Çok fazla istek. Lütfen 2 dakika bekleyin.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.';
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        }

        return {
          exchange: exchange,
          type: isFutures ? 'futures' : 'spot',
          totalBalance: 0,
          availableBalance: 0,
          usedBalance: 0,
          currency: 'USDT',
          loading: false,
          error: errorMessage,
        } as Balance;
      }
    });

    // ✅ Tüm istekleri paralel olarak bekle
    const fetchedBalances = await Promise.all(fetchPromises);
    
    setBalances(fetchedBalances);
    setLoading(false);
  }, [user, exchangeList, isFutures]); // ✅ exchangeList kullanıldı (exchanges değil)

  // ✅ İlk yükleme
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // ✅ refreshBalances fonksiyonu - cache'i bypass eder
  const refreshBalances = useCallback(async () => {
    await fetchBalances(true);
  }, [fetchBalances]);

  return { balances, loading, refreshBalances };
};
