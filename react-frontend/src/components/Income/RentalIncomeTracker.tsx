import React, { useState } from 'react';
import { useRentalIncome, useRentalIncomeStats } from '../../hooks/useRentalIncome';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { useAuth } from '../../hooks/useAuth';

interface RentalIncomeTrackerProps {
  className?: string;
  showDetailed?: boolean;
}

export const RentalIncomeTracker: React.FC<RentalIncomeTrackerProps> = ({ 
  className = '', 
  showDetailed = false 
}) => {
  const { user } = useAuth();
  const { 
    totalEarned, 
    monthlyProjection, 
    recentPayments, 
    loading, 
    error,
    refreshData 
  } = useRentalIncome(user?.uid || '');
  
  const stats = useRentalIncomeStats(user?.uid || '');
  const { getUsdValue } = useCryptoPrices();
  const [showHistory, setShowHistory] = useState(false);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 border border-red-700 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            <span className="text-red-400 text-sm">Error loading rental income</span>
          </div>
          <button 
            onClick={refreshData}
            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = () => {
    if (monthlyProjection > 500) return 'text-green-500';
    if (monthlyProjection > 100) return 'text-yellow-500';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (monthlyProjection === 0) return 'NO INCOME';
    if (monthlyProjection > 500) return 'HIGH YIELD';
    if (monthlyProjection > 100) return 'EARNING';
    return 'LOW YIELD';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Rental Income</h3>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center ${getStatusColor()}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              monthlyProjection > 0 ? 'animate-pulse bg-current' : 'bg-gray-500'
            }`}></div>
            <span className="text-xs font-medium">{getStatusText()}</span>
          </div>
          <button
            onClick={refreshData}
            className="text-gray-400 hover:text-white text-xs p-1 rounded hover:bg-gray-700"
            title="Refresh data"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="space-y-4">
        {/* Total Earned */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Total Earned</div>
          <div className="text-2xl font-bold text-green-500">
            ${formatCurrency(totalEarned)} <span className="text-sm font-normal">USDC</span>
          </div>
          <div className="text-xs text-gray-500">
            ≈ ${formatCurrency(getUsdValue(totalEarned, 'USDC'))} USD
          </div>
        </div>

        {/* Monthly Projection */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Monthly Projection</div>
          <div className="text-lg font-semibold text-white">
            ${formatCurrency(monthlyProjection)} <span className="text-sm font-normal text-gray-400">USDC/month</span>
          </div>
          {monthlyProjection > 0 && (
            <div className="text-xs text-gray-500">
              ${formatCurrency(stats.projectedAnnualIncome)}/year • ${formatCurrency(stats.projectedDailyIncome)}/day
            </div>
          )}
        </div>

        {/* Portfolio Stats */}
        {showDetailed && stats.propertiesOwned > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Properties</div>
                <div className="text-white font-medium">{stats.propertiesOwned}</div>
              </div>
              <div>
                <div className="text-gray-400">Total Shares</div>
                <div className="text-white font-medium">{stats.totalSharesOwned}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentPayments.length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400">Recent Activity</div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
            
            {/* Last Payment */}
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="text-white">+${formatCurrency(stats.lastPaymentAmount)}</div>
                <div className="text-xs text-gray-500">
                  {stats.lastPaymentDate && formatDate(stats.lastPaymentDate)}
                </div>
              </div>
              <div className="text-green-500 text-xs">USDC</div>
            </div>

            {/* Payment History */}
            {showHistory && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                {recentPayments.slice(0, 8).map((payment, index) => (
                  <div key={payment.id || index} className="flex items-center justify-between text-xs py-1">
                    <div>
                      <div className="text-white">${formatCurrency(payment.amount)}</div>
                      <div className="text-gray-500">{formatDate(payment.gameDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400">{payment.sharesOwned} shares</div>
                      <div className="text-gray-500">{payment.rentalYield.toFixed(1)}% yield</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Income State */}
        {totalEarned === 0 && monthlyProjection === 0 && (
          <div className="pt-3 border-t border-gray-700 text-center">
            <div className="text-gray-400 text-sm mb-2">No rental income yet</div>
            <div className="text-xs text-gray-500">
              Invest in properties to start earning monthly USDC payments
            </div>
          </div>
        )}

        {/* Next Payment Info */}
        {monthlyProjection > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Next Payment</div>
            <div className="text-sm text-white">
              ~${formatCurrency(monthlyProjection)} USDC
            </div>
            <div className="text-xs text-gray-500">
              Expected in {Math.ceil(Math.random() * 25 + 5)} game days
            </div>
          </div>
        )}
      </div>
    </div>
  );
};