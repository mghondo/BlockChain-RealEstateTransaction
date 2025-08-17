import React from 'react';
import { useUserPortfolio } from '../../hooks/useUserPortfolio';
import { useAuth } from '../../hooks/useAuth';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface PortfolioOverviewProps {
  className?: string;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { portfolio, loading, error } = useUserPortfolio(user?.uid || '');
  const { getUsdValue } = useCryptoPrices();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number): string => {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const getReturnColor = (percentage: number): string => {
    if (percentage > 10) return 'text-green-400';
    if (percentage > 0) return 'text-green-500';
    if (percentage > -5) return 'text-yellow-500';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-red-600 p-6 ${className}`}>
        <div className="text-red-400">Error loading portfolio: {error}</div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">Investment Portfolio</h3>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-gray-400 mb-2">No investments yet</div>
          <div className="text-sm text-gray-500">
            Start investing in properties to build your portfolio
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Investment Portfolio</h3>
        <div className="flex items-center space-x-4">
          {portfolio.activeEscrows > 0 && (
            <div className="bg-blue-900 border border-blue-600 rounded px-3 py-1">
              <span className="text-blue-400 text-sm font-medium">
                {portfolio.activeEscrows} in escrow
              </span>
            </div>
          )}
          <div className="text-sm text-gray-400">
            {portfolio.propertiesOwned} properties
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Value */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Portfolio Value</div>
          <div className="text-xl font-bold text-white">
            {portfolio.totalValue.toFixed(4)} ETH
          </div>
          <div className="text-xs text-gray-500">
            ≈ {formatCurrency(getUsdValue(portfolio.totalValue, 'ETH'))}
          </div>
        </div>

        {/* Total Return */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Return</div>
          <div className={`text-xl font-bold ${getReturnColor(portfolio.portfolioReturn)}`}>
            {formatPercentage(portfolio.portfolioReturn)}
          </div>
          <div className="text-xs text-gray-500">
            {formatCurrency(getUsdValue(portfolio.totalValue - portfolio.totalInvestments, 'ETH'))}
          </div>
        </div>

        {/* Capital Appreciation */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Appreciation</div>
          <div className={`text-xl font-bold ${getReturnColor(portfolio.totalAppreciationPercent)}`}>
            {formatPercentage(portfolio.totalAppreciationPercent)}
          </div>
          <div className="text-xs text-gray-500">
            {portfolio.totalAppreciation >= 0 ? '+' : ''}{portfolio.totalAppreciation.toFixed(4)} ETH
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Monthly Income</div>
          <div className="text-xl font-bold text-green-400">
            ${portfolio.monthlyIncome.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">USDC per month</div>
        </div>
      </div>

      {/* Return Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Rental Income Return */}
        <div className="bg-green-900 border border-green-600 rounded-lg p-4">
          <div className="text-green-400 text-sm mb-1">Rental Income</div>
          <div className="text-xl font-bold text-green-300">
            ${portfolio.totalRentalEarned.toFixed(2)} USDC
          </div>
          <div className="text-xs text-green-400">
            {formatPercentage(portfolio.rentalReturn)} cash-on-cash return
          </div>
        </div>

        {/* Property Appreciation */}
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-4">
          <div className="text-blue-400 text-sm mb-1">Property Appreciation</div>
          <div className="text-xl font-bold text-blue-300">
            {portfolio.totalAppreciation >= 0 ? '+' : ''}{portfolio.totalAppreciation.toFixed(4)} ETH
          </div>
          <div className="text-xs text-blue-400">
            {formatPercentage(portfolio.appreciationReturn)} capital gains
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {portfolio.completedInvestments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Investments</h4>
          <div className="space-y-2">
            {portfolio.completedInvestments.slice(0, 3).map((investment, index) => (
              <div key={index} className="bg-gray-700 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">
                    {investment.sharesOwned} shares
                  </div>
                  <div className="text-xs text-gray-400">
                    {investment.purchaseDate.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">
                    {investment.currentValue.toFixed(4)} ETH
                  </div>
                  <div className={`text-xs ${
                    investment.currentValue > investment.purchasePrice ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {investment.currentValue > investment.purchasePrice ? '↗' : '→'} 
                    {formatPercentage(((investment.currentValue - investment.purchasePrice) / investment.purchasePrice) * 100)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      {(portfolio.totalRentalEarned > 0 || portfolio.totalAppreciation !== 0) && (
        <div className="mt-6 pt-6 border-t border-gray-600">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Investment Performance</h4>
          <div className="bg-gray-700 rounded p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">
                  {formatPercentage(portfolio.portfolioReturn)}
                </div>
                <div className="text-xs text-gray-400">Total Return</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">
                  {formatPercentage(portfolio.rentalReturn)}
                </div>
                <div className="text-xs text-gray-400">Cash Flow Return</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {formatPercentage(portfolio.appreciationReturn)}
                </div>
                <div className="text-xs text-gray-400">Capital Appreciation</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};