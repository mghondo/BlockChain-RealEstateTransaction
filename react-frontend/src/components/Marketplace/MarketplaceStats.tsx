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
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 ${className}`}>
      {/* Total Properties */}
      <div className="relative bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl border border-blue-500/30 p-6 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <span className="text-2xl">🏢</span>
            </div>
            {stats.endingSoon > 0 && (
              <div className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full text-xs">
                {stats.endingSoon} ending soon
              </div>
            )}
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {stats.totalProperties}
          </div>
          <div className="text-sm text-blue-300 font-medium">Available Properties</div>
          <div className="text-xs text-gray-400 mt-1">Ready for investment</div>
        </div>
      </div>

      {/* Average Yield */}
      <div className="relative bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl border border-green-500/30 p-6 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-emerald-600/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <span className="text-2xl">📈</span>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            {stats.averageYield ? stats.averageYield.toFixed(1) : '0.0'}%
          </div>
          <div className="text-sm text-green-300 font-medium">Average Yield</div>
          <div className="text-xs text-gray-400 mt-1">Annual rental return</div>
        </div>
      </div>

      {/* Total Market Value */}
      <div className="relative bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-xl border border-yellow-500/30 p-6 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-orange-600/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <span className="text-2xl">💎</span>
            </div>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            {formatCurrency(stats.totalValue)}
          </div>
          <div className="text-sm text-yellow-300 font-medium">Total Market Value</div>
          <div className="text-xs text-gray-400 mt-1">All available properties</div>
        </div>
      </div>

      {/* Property Classes */}
      <div className="relative bg-gradient-to-br from-indigo-900/40 to-pink-900/40 rounded-xl border border-indigo-500/30 p-6 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-pink-600/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
          <div className="text-lg font-bold text-white mb-3">Property Mix</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-purple-300 text-sm font-medium">Class A:</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 bg-purple-500/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500" 
                    style={{ width: `${(stats.classCounts.A / Math.max(stats.totalProperties, 1)) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white text-sm font-bold">{stats.classCounts.A}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-300 text-sm font-medium">Class B:</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 bg-blue-500/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${(stats.classCounts.B / Math.max(stats.totalProperties, 1)) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white text-sm font-bold">{stats.classCounts.B}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-300 text-sm font-medium">Class C:</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 bg-green-500/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${(stats.classCounts.C / Math.max(stats.totalProperties, 1)) * 100}%` }}
                  ></div>
                </div>
                <span className="text-white text-sm font-bold">{stats.classCounts.C}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};