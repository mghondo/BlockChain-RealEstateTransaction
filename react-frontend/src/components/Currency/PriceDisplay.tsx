import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface PriceDisplayProps {
  compact?: boolean;
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({ compact = false, className = '' }) => {
  const { prices, loading, error, lastUpdated } = useCryptoPrices();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-400">Loading prices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm text-red-400">Price error</span>
      </div>
    );
  }

  if (!prices) return null;

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: { xs: 0.5, sm: 2 },
          mr: 1,
          pl: { xs: 0, sm: '10px' }
        }}
      >
        {/* ETH Price Column */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box 
            sx={{ 
              width: 8, 
              height: 8, 
              backgroundColor: error ? 'error.main' : 'success.main',
              borderRadius: '50%',
              animation: error ? 'none' : 'priceFlicker 0.2s infinite',
              '@keyframes priceFlicker': {
                '0%, 50%': {
                  backgroundColor: 'success.main'
                },
                '51%, 100%': {
                  backgroundColor: '#2e7d58'
                }
              }
            }} 
          />
          <Typography variant="caption" color="text.secondary">
            ETH:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 'fit-content' }}>
            {formatPrice(prices.ethToUsd)}
          </Typography>
        </Box>

        {/* Separator - hidden on mobile */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          •
        </Typography>

        {/* Gas Price Column */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: { xs: 0, sm: '10px' } }}>
          <Typography variant="caption" color="text.secondary">
            Gas:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 400 }}>
            {prices.gasPrice} gwei
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Live Prices</h3>
        <div className="flex items-center text-green-500">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-xs">LIVE</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              Ξ
            </div>
            <span className="text-gray-300">Ethereum</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-white">{formatPrice(prices.ethToUsd)}</div>
            <div className="text-xs text-gray-400">ETH/USD</div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              $
            </div>
            <span className="text-gray-300">USD Coin</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-white">{formatPrice(prices.usdcToUsd)}</div>
            <div className="text-xs text-gray-400">USDC/USD</div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Exchange Rate</span>
            <span className="text-sm text-white font-medium">
              1 ETH = {prices.ethToUsdc.toFixed(2)} USDC
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-400">Gas Price</span>
            <span className="text-sm text-white">{prices.gasPrice} gwei</span>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Last updated: {formatTime(lastUpdated!)}
        </div>
      </div>
    </div>
  );
};