import { useState, useEffect, useCallback } from 'react';
import { CryptoPriceService, PriceData, GasFeeEstimate } from '../services/cryptoPriceService';

interface CryptoPriceHook {
  prices: PriceData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshPrices: () => Promise<void>;
  convertCurrency: (amount: number, from: 'ETH' | 'USDC', to: 'ETH' | 'USDC') => number;
  calculateGasFees: (transactionType: 'simple' | 'investment' | 'conversion') => GasFeeEstimate | null;
  getUsdValue: (amount: number, currency: 'ETH' | 'USDC') => number;
}

export const useCryptoPrices = (): CryptoPriceHook => {
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      const newPrices = await CryptoPriceService.fetchCurrentPrices();
      setPrices(newPrices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    setLoading(true);
    await fetchPrices();
  }, [fetchPrices]);

  // Initial price fetch
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Auto-refresh prices every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (prices && Date.now() - prices.lastUpdated.getTime() > 60 * 1000) {
        fetchPrices();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchPrices, prices]);

  const convertCurrency = useCallback((amount: number, from: 'ETH' | 'USDC', to: 'ETH' | 'USDC'): number => {
    if (!prices || from === to) return amount;

    if (from === 'USDC' && to === 'ETH') {
      return CryptoPriceService.convertUsdcToEth(amount, prices);
    } else if (from === 'ETH' && to === 'USDC') {
      return CryptoPriceService.convertEthToUsdc(amount, prices);
    }

    return amount;
  }, [prices]);

  const calculateGasFees = useCallback((transactionType: 'simple' | 'investment' | 'conversion'): GasFeeEstimate | null => {
    if (!prices) return null;
    return CryptoPriceService.calculateGasFees(transactionType, prices);
  }, [prices]);

  const getUsdValue = useCallback((amount: number, currency: 'ETH' | 'USDC'): number => {
    if (!prices) return amount;
    
    if (currency === 'ETH') {
      return amount * prices.ethToUsd;
    } else if (currency === 'USDC') {
      return amount * prices.usdcToUsd;
    }
    
    return amount;
  }, [prices]);

  return {
    prices,
    loading,
    error,
    lastUpdated: prices?.lastUpdated || null,
    refreshPrices,
    convertCurrency,
    calculateGasFees,
    getUsdValue,
  };
};