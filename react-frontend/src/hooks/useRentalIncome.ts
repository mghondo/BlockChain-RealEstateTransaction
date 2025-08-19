import { useState, useEffect, useCallback } from 'react';
import { rentalIncomeService, type RentalIncomePayment } from '../services/rentalIncomeServiceNew';
import { useMockWallet } from './useMockWallet';

interface RentalIncomeStats {
  propertiesOwned: number;
  totalSharesOwned: number;
  lastPaymentAmount: number;
  lastPaymentDate: Date | null;
  projectedAnnualIncome: number;
  projectedDailyIncome: number;
}

interface UseRentalIncomeReturn {
  totalEarned: number;
  monthlyProjection: number;
  recentPayments: RentalPayment[];
  investments: UserInvestment[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useRentalIncome = (userId: string): UseRentalIncomeReturn => {
  const [totalEarned, setTotalEarned] = useState(0);
  const [monthlyProjection, setMonthlyProjection] = useState(0);
  const [recentPayments, setRecentPayments] = useState<RentalPayment[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch all rental income data in parallel
      const [totalIncome, projectedIncome, payments, userInvestments] = await Promise.all([
        RentalIncomeService.getTotalRentalIncome(userId),
        RentalIncomeService.getProjectedMonthlyIncome(userId),
        RentalIncomeService.getRentalHistory(userId, 20),
        RentalIncomeService.getUserInvestments(userId)
      ]);

      setTotalEarned(totalIncome);
      setMonthlyProjection(projectedIncome);
      setRecentPayments(payments);
      setInvestments(userInvestments);
      
    } catch (err) {
      console.error('Error fetching rental income data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rental income data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      fetchData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData, userId]);

  return {
    totalEarned,
    monthlyProjection,
    recentPayments,
    investments,
    loading,
    error,
    refreshData,
  };
};

export const useRentalIncomeStats = (userId: string): RentalIncomeStats => {
  const { recentPayments, investments, monthlyProjection } = useRentalIncome(userId);

  const stats: RentalIncomeStats = {
    propertiesOwned: investments.length,
    totalSharesOwned: investments.reduce((total, inv) => total + inv.sharesOwned, 0),
    lastPaymentAmount: recentPayments.length > 0 ? recentPayments[0].amount : 0,
    lastPaymentDate: recentPayments.length > 0 ? recentPayments[0].gameDate : null,
    projectedAnnualIncome: monthlyProjection * 12,
    projectedDailyIncome: monthlyProjection / 30,
  };

  return stats;
};