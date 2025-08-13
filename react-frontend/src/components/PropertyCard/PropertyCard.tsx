import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Button,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  LocationOn,
  Home,
  TrendingUp,
  AccountBalance
} from '@mui/icons-material';
import { PropertyDetails } from '../../types/web3';
import { ethers } from 'ethers';

interface PropertyCardProps {
  property: PropertyDetails;
  escrowAddress: string;
  onViewDetails?: (property: PropertyDetails, escrowAddress: string) => void;
  onInvest?: (property: PropertyDetails, escrowAddress: string) => void;
}

export default function PropertyCard({ 
  property, 
  escrowAddress, 
  onViewDetails, 
  onInvest 
}: PropertyCardProps) {
  
  const formatCurrency = (value: bigint): string => {
    const amount = Number(ethers.formatUnits(value, 6)); // Assuming USDC (6 decimals)
    return '$' + amount.toLocaleString('en-US');
  };

  const formatEther = (value: bigint): string => {
    const amount = Number(ethers.formatEther(value));
    return amount.toFixed(4);
  };

  const getStatusColor = (phaseId: number) => {
    switch (phaseId) {
      case 0: return 'success';
      case 1: return 'warning';
      case 2: return 'info';
      case 3: return 'secondary';
      case 4: return 'success';
      case 5: return 'error';
      default: return 'default';
    }
  };

  const getFundingProgress = (): number => {
    if (property.config.escrowAmount === BigInt(0)) return 0;
    return (Number(property.totalEarnestDeposited) / Number(property.config.escrowAmount)) * 100;
  };

  const isInvestable = (): boolean => {
    return property.currentPhase.id === 0 && property.availableShares > 0;
  };

  // Mock property data for display purposes
  const mockImageUrl = `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=250&fit=crop`;
  const mockAddress = "123 Blockchain Ave, Crypto City, CC 12345";
  const mockBedrooms = 3;
  const mockBathrooms = 2;
  const mockSquareFeet = 1850;

  return (
    <Card 
      sx={{ 
        maxWidth: 400, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={mockImageUrl}
        alt="Property"
        sx={{ objectFit: 'cover' }}
      />
      
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Property Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Chip
            label={property.currentPhase.name}
            color={getStatusColor(property.currentPhase.id)}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            NFT #{property.config.nftID.toString()}
          </Typography>
        </Box>

        {/* Property Price */}
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {formatCurrency(property.config.purchasePrice)}
        </Typography>

        {/* Property Address */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {mockAddress}
          </Typography>
        </Box>

        {/* Property Details */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Home sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {mockBedrooms}bd {mockBathrooms}ba
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {mockSquareFeet.toLocaleString()} sqft
          </Typography>
        </Box>

        {/* Funding Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Funding Progress
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {getFundingProgress().toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={getFundingProgress()} 
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {formatEther(property.totalEarnestDeposited)} ETH raised
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatEther(property.config.escrowAmount)} ETH goal
            </Typography>
          </Box>
        </Box>

        {/* Investment Info */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
            <Typography variant="body2" color="success.main">
              {property.availableShares} shares left
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountBalance sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              8.5% APY
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onViewDetails?.(property, escrowAddress)}
          >
            View Details
          </Button>
          {isInvestable() && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => onInvest?.(property, escrowAddress)}
              color="primary"
            >
              Invest Now
            </Button>
          )}
        </Box>

        {/* Property Owner Info */}
        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Seller: {property.config.seller.substring(0, 10)}...
          </Typography>
          {property.config.buyer !== ethers.ZeroAddress && (
            <Typography variant="caption" color="text.secondary" display="block">
              Buyer: {property.config.buyer.substring(0, 10)}...
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}