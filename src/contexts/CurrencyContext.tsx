import React, { createContext, useContext, useState, ReactNode } from 'react';

type Currency = 'USD' | 'TRY';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (usdPrice: number) => number;
  formatPrice: (usdPrice: number | undefined | null) => string;
  exchangeRate: number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const USD_TO_TRY_RATE = 42.1132;

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>('USD');

  const convertPrice = (usdPrice: number): number => {
    return currency === 'TRY' ? usdPrice * USD_TO_TRY_RATE : usdPrice;
  };

  const formatPrice = (usdPrice: number | undefined | null): string => {
    if (usdPrice === undefined || usdPrice === null || isNaN(usdPrice)) {
      return currency === 'TRY' ? '₺0.00' : '$0.00';
    }
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