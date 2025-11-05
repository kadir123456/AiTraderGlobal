import React, { createContext, useContext, useState, ReactNode } from 'react';

type Currency = 'USD' | 'TRY';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (usdPrice: number) => number;
  formatPrice: (usdPrice: number) => string;
  exchangeRate: number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Current exchange rate - in production, fetch from API
const USD_TO_TRY_RATE = 42.1132; // 25 USD = 1052.83 TRY, 299 USD = 12590.89 TRY

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('USD');

  const convertPrice = (usdPrice: number): number => {
    return currency === 'TRY' ? usdPrice * USD_TO_TRY_RATE : usdPrice;
  };

  const formatPrice = (usdPrice: number): string => {
    const converted = convertPrice(usdPrice);
    const symbol = currency === 'TRY' ? '₺' : '$';
    return `${symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertPrice,
        formatPrice,
        exchangeRate: USD_TO_TRY_RATE,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
