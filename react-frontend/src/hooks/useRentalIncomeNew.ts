import { useState, useEffect, useCallback } from 'react';
import { rentalIncomeService, type RentalIncomePayment } from '../services/rentalIncomeServiceNew';
import { useMockWallet } from './useMockWallet';

interface RentalIncomeData {
  totalRentalIncome: number;
  recentPayments: RentalIncomePayment[];
  isLoading: boolean;
  refresh: () => void;
}

export const useRentalIncome = (): RentalIncomeData => {
  const { address } = useMockWallet();
  const [totalRentalIncome, setTotalRentalIncome] = useState(0);
  const [recentPayments, setRecentPayments] = useState<RentalIncomePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!address) {
      setTotalRentalIncome(0);
      setRecentPayments([]);
      return;
    }

    setIsLoading(true);
    
    try {
      // Get total rental income for the user
      const total = rentalIncomeService.getUserTotalRentalIncome(address);
      setTotalRentalIncome(total);

      // Get recent payments
      const recent = rentalIncomeService.getUserRecentRentalPayments(address, 10);
      setRecentPayments(recent);

      console.log(`💰 Rental income data refreshed for ${address}:`, {
        total: total.toFixed(6),
        recentPayments: recent.length
      });
    } catch (error) {
      console.error('Error refreshing rental income data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Refresh data when wallet address changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 30 seconds to catch new payments
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    totalRentalIncome,
    recentPayments,
    isLoading,
    refresh
  };
};