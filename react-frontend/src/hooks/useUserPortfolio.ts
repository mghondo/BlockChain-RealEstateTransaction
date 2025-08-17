import { useState, useEffect, useCallback } from 'react';
import { EscrowService, type EscrowProcess } from '../services/escrowService';
import { RentalIncomeService, type UserInvestment } from '../services/rentalIncomeService';
import { PropertyAppreciationService } from '../services/propertyAppreciationService';

interface PortfolioSummary {
  totalInvestments: number;
  totalValue: number;
  totalShares: number;
  propertiesOwned: number;
  monthlyIncome: number;
  totalRentalEarned: number;
  portfolioReturn: number;
  totalAppreciation: number;
  totalAppreciationPercent: number;
  rentalReturn: number;
  appreciationReturn: number;
  activeEscrows: number;
  completedInvestments: UserInvestment[];
  activeEscrowProcesses: EscrowProcess[];
}

export const useUserPortfolio = (userId: string) => {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Load all portfolio data in parallel
      const [
        investments,
        escrowProcesses,
        totalRentalEarned,
        monthlyProjection,
        appreciationData
      ] = await Promise.all([
        RentalIncomeService.getUserInvestments(userId),
        EscrowService.getUserEscrowProcesses(userId),
        RentalIncomeService.getTotalRentalIncome(userId),
        RentalIncomeService.getProjectedMonthlyIncome(userId),
        PropertyAppreciationService.getUserTotalAppreciation(userId)
      ]);

      // Calculate portfolio metrics
      const totalInvestments = investments.reduce((sum, inv) => sum + inv.purchasePrice, 0);
      const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
      const totalShares = investments.reduce((sum, inv) => sum + inv.sharesOwned, 0);
      const propertiesOwned = investments.length;
      const portfolioReturn = totalInvestments > 0 ? ((totalValue - totalInvestments) / totalInvestments) * 100 : 0;
      
      // Calculate appreciation metrics
      const totalAppreciation = appreciationData.totalAppreciation;
      const totalAppreciationPercent = appreciationData.totalAppreciationPercent;
      
      // Calculate return breakdown (rental vs appreciation)
      const rentalReturn = totalInvestments > 0 ? (totalRentalEarned / totalInvestments) * 100 : 0;
      const appreciationReturn = totalAppreciationPercent;
      
      const activeEscrows = escrowProcesses.filter(p => 
        ['pending', 'inspection', 'lender_approval', 'approved'].includes(p.status)
      ).length;

      const portfolioSummary: PortfolioSummary = {
        totalInvestments,
        totalValue,
        totalShares,
        propertiesOwned,
        monthlyIncome: monthlyProjection,
        totalRentalEarned,
        portfolioReturn,
        totalAppreciation,
        totalAppreciationPercent,
        rentalReturn,
        appreciationReturn,
        activeEscrows,
        completedInvestments: investments,
        activeEscrowProcesses: escrowProcesses.filter(p => 
          ['pending', 'inspection', 'lender_approval', 'approved'].includes(p.status)
        ),
      };

      setPortfolio(portfolioSummary);

    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPortfolio();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadPortfolio, 60000);
    return () => clearInterval(interval);
  }, [loadPortfolio]);

  return {
    portfolio,
    loading,
    error,
    refreshPortfolio: loadPortfolio,
  };
};