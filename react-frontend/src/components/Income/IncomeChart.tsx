import React from 'react';
import { useRentalIncome } from '../../hooks/useRentalIncome';
import { useAuth } from '../../hooks/useAuth';

interface IncomeChartProps {
  className?: string;
  height?: number;
}

export const IncomeChart: React.FC<IncomeChartProps> = ({ 
  className = '', 
  height = 120 
}) => {
  const { user } = useAuth();
  const { recentPayments, loading } = useRentalIncome(user?.uid || '');

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
          <div className={`bg-gray-700 rounded`} style={{ height }}></div>
        </div>
      </div>
    );
  }

  if (recentPayments.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
        <h4 className="text-sm font-medium text-white mb-3">Income Trend</h4>
        <div 
          className="flex items-center justify-center text-gray-500 text-sm"
          style={{ height }}
        >
          No income data yet
        </div>
      </div>
    );
  }

  // Simple bar chart data (last 8 payments)
  const chartData = recentPayments.slice(0, 8).reverse();
  const maxAmount = Math.max(...chartData.map(p => p.amount));

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <h4 className="text-sm font-medium text-white mb-3">Income Trend</h4>
      
      <div className="flex items-end space-x-1" style={{ height }}>
        {chartData.map((payment, index) => {
          const barHeight = (payment.amount / maxAmount) * (height - 20);
          return (
            <div key={payment.id || index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-green-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: barHeight }}
                title={`${payment.amount.toFixed(2)} on ${payment.gameDate.toLocaleDateString()}`}
              ></div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                {payment.gameDate.getMonth() + 1}/{payment.gameDate.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>Past payments</span>
        <span>${maxAmount.toFixed(0)} max</span>
      </div>
    </div>
  );
};