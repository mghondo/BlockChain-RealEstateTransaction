import React from 'react';

interface MarketplaceStatsProps {
  stats: {
    totalProperties: number;
    averageYield: number;
    totalValue: number;
    endingSoon: number;
    classCounts: { A: number; B: number; C: number };
  };
  className?: string;
}

export const MarketplaceStats: React.FC<MarketplaceStatsProps> = ({ 
  stats, 
  className = '' 
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {/* Total Properties */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="text-2xl font-bold text-white">{stats.totalProperties}</div>
        <div className="text-sm text-gray-400">Available Properties</div>
        <div className="text-xs text-gray-500 mt-1">
          {stats.endingSoon > 0 && `${stats.endingSoon} ending soon`}
        </div>
      </div>

      {/* Average Yield */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="text-2xl font-bold text-green-400">
          {stats.averageYield ? stats.averageYield.toFixed(1) : '0.0'}%
        </div>
        <div className="text-sm text-gray-400">Average Yield</div>
        <div className="text-xs text-gray-500 mt-1">Annual rental return</div>
      </div>

      {/* Total Market Value */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="text-2xl font-bold text-blue-400">
          {formatCurrency(stats.totalValue)}
        </div>
        <div className="text-sm text-gray-400">Total Market Value</div>
        <div className="text-xs text-gray-500 mt-1">All available properties</div>
      </div>

      {/* Property Classes */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="text-lg font-bold text-white mb-2">Property Mix</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-purple-400">Class A:</span>
            <span className="text-white">{stats.classCounts.A}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-400">Class B:</span>
            <span className="text-white">{stats.classCounts.B}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-400">Class C:</span>
            <span className="text-white">{stats.classCounts.C}</span>
          </div>
        </div>
      </div>
    </div>
  );
};