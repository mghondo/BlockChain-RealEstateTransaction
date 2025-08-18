import React from 'react';
import { Box, Chip, Typography, Card, CardContent, Divider, alpha } from '@mui/material';
import { TrendingUp, LocalGasStation } from '@mui/icons-material';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface PriceDisplayProps {
  compact?: boolean;
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({ compact = false, className = '' }) => {
  const { prices, loading, error, lastUpdated } = useCryptoPrices();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box 
          sx={{ 
            width: 8, 
            height: 8, 
            bgcolor: 'warning.main', 
            borderRadius: '50%',
            animation: 'pulse 1.5s infinite'
          }} 
        />
        <Typography variant="body2" color="text.secondary">
          Loading prices...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box 
          sx={{ 
            width: 8, 
            height: 8, 
            bgcolor: 'error.main', 
            borderRadius: '50%' 
          }} 
        />
        <Typography variant="body2" color="error.main">
          Price error
        </Typography>
      </Box>
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
    <Card 
      sx={{ 
        background: `linear-gradient(135deg, ${alpha('#1976d2', 0.1)} 0%, ${alpha('#00c853', 0.1)} 100%)`,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.1)}, transparent)`,
          animation: 'shimmer 3s infinite',
        },
        '@keyframes shimmer': {
          '0%': { left: '-100%' },
          '100%': { left: '100%' }
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Live Prices
            </Typography>
          </Box>
          <Chip
            label="LIVE"
            size="small"
            sx={{
              bgcolor: 'success.main',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              '& .MuiChip-label': {
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              },
              '&::before': {
                content: '""',
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'white',
                animation: 'pulse 1.5s infinite'
              }
            }}
          />
        </Box>

        {/* Price Grid */}
        <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
          {/* Ethereum */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              bgcolor: alpha('#1976d2', 0.1),
              border: '1px solid',
              borderColor: alpha('#1976d2', 0.2),
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha('#1976d2', 0.15),
                transform: 'translateY(-1px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box 
                sx={{ 
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: '#627eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(98, 126, 234, 0.3)'
                }}
              >
                Ξ
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Ethereum
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ETH/USD
                </Typography>
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {formatPrice(prices.ethToUsd)}
            </Typography>
          </Box>

          {/* USDC */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              bgcolor: alpha('#00c853', 0.1),
              border: '1px solid',
              borderColor: alpha('#00c853', 0.2),
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha('#00c853', 0.15),
                transform: 'translateY(-1px)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box 
                sx={{ 
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: '#26a69a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(38, 166, 154, 0.3)'
                }}
              >
                $
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  USD Coin
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  USDC/USD
                </Typography>
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
              {formatPrice(prices.usdcToUsd)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Exchange Rate & Gas */}
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp sx={{ fontSize: 16 }} />
              Exchange Rate
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
              1 ETH = {prices.ethToUsdc.toFixed(2)} USDC
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalGasStation sx={{ fontSize: 16 }} />
              Gas Price
            </Typography>
            <Chip 
              label={`${prices.gasPrice} gwei`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontFamily: 'monospace' }}
            />
          </Box>
        </Box>

        {/* Last Updated */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatTime(lastUpdated!)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};