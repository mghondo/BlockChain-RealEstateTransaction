import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Close,
  LocationOn,
  Home,
  Bathtub,
  SquareFoot,
  CalendarToday,
  TrendingUp,
  CheckCircle,
  AttachMoney
} from '@mui/icons-material';
import { calculateRentalIncome, formatRentalIncome } from '../../utils/rentalCalculations';
import { useMockWallet } from '../../hooks/useMockWallet';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';

interface PropertyDetailModalProps {
  open: boolean;
  onClose: () => void;
  property: any | null;
  searchMode?: string;
  numberOfShares?: number;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  open,
  onClose,
  property,
  searchMode = 'total',
  numberOfShares = 1
}) => {
  const [modalShares, setModalShares] = useState(numberOfShares);
  
  // Real wallet data
  const { ethBalance, isConnected, restoreWallet } = useMockWallet();
  const { getUsdValue, convertCurrency, prices } = useCryptoPrices();

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);
  
  if (!property) return null;

  const calculateSharePrice = () => {
    return Math.round((property.price || 0) / 100 * numberOfShares);
  };

  const getRentalIncome = () => {
    if (!property.rentalYield) return { monthly: 0, perShare: 0, forShares: 0 };
    
    const calculation = calculateRentalIncome(
      property.price || 0, 
      property.rentalYield, 
      100
    );
    
    const modalSharesCalculation = calculateRentalIncome(
      property.price || 0, 
      property.rentalYield, 
      modalShares
    );
    
    return {
      monthly: calculation.monthlyIncome,
      perShare: calculation.monthlyIncome / 100,
      forShares: modalSharesCalculation.monthlyIncomePerShare
    };
  };

  const handleSharesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '') {
      setModalShares(0);
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(0, Math.min(100, numValue));
      setModalShares(clampedValue);
    }
  };

  const canAffordShares = () => {
    const totalCostUsd = Math.round((property.price || 0) / 100 * modalShares);
    const walletBalanceUsd = getUsdValue(ethBalance, 'ETH');
    return walletBalanceUsd >= totalCostUsd;
  };

  const getWalletBalanceDisplay = () => {
    if (!isConnected) return null;
    
    const usdValue = getUsdValue(ethBalance, 'ETH');
    const usdcEquivalent = convertCurrency(ethBalance, 'ETH', 'USDC');
    
    console.log('💰 Wallet Debug:', { ethBalance, usdValue, usdcEquivalent, prices });
    
    return {
      eth: ethBalance,
      usd: usdValue,
      usdc: usdcEquivalent
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'ending_soon': return 'warning'; 
      case 'sold_out': return 'error';
      default: return 'default';
    }
  };

  const getClassColor = (className: string) => {
    switch (className) {
      case 'A': return '#FFD700';
      case 'B': return '#C0C0C0';
      case 'C': return '#CD7F32';
      default: return '#gray';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      sx={{
        '& .MuiDialog-paper': {
          width: '80%',
          height: '80%',
          maxWidth: '1200px',
          maxHeight: '800px',
          borderRadius: 2
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            zIndex: 10,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }
          }}
        >
          <Close />
        </IconButton>

        <Grid container sx={{ height: '100%' }}>
          {/* Left Side - Large Image */}
          <Grid item xs={12} md={6} sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={property.imageUrl}
              alt="Property"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            
            {/* Property Status Overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                zIndex: 5
              }}
            >
              <Chip
                label={property.status || 'unknown'}
                color={getStatusColor(property.status)}
                sx={{ mb: 1, display: 'block' }}
              />
              <Box
                sx={{
                  backgroundColor: getClassColor(property.class),
                  color: '#000',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  fontWeight: 700,
                  fontSize: '1rem'
                }}
              >
                Class {property.class || '?'}
              </Box>
            </Box>
          </Grid>

          {/* Right Side - Property Details */}
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
              {/* Header Section */}
              <Box sx={{ mb: 3 }}>
                {/* Price Display */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                    ${(property.price || 0).toLocaleString()}
                  </Typography>
                  {searchMode === 'shares' && (
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                      Price for {numberOfShares} Share{numberOfShares !== 1 ? 's' : ''}: ${calculateSharePrice().toLocaleString()}
                    </Typography>
                  )}
                </Box>

                {/* Address */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="h6">
                    {property.address || 'Address N/A'}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 4 }}>
                  {property.city || 'City'}, {property.state || 'State'} • {property.region || 'Unknown'} Region
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Property Specifications */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Property Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Home sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Bedrooms
                        </Typography>
                        <Typography variant="h6">
                          {property.bedrooms || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Bathtub sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Bathrooms
                        </Typography>
                        <Typography variant="h6">
                          {property.bathrooms || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SquareFoot sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Square Feet
                        </Typography>
                        <Typography variant="h6">
                          {(property.sqft || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalendarToday sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Year Built
                        </Typography>
                        <Typography variant="h6">
                          {property.yearBuilt || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Investment Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Investment Details
                </Typography>
                
                {/* Share Calculator */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Calculate Your Investment
                  </Typography>
                  
                  {/* Wallet Balance and Insufficient Funds Warning */}
                  <Box sx={{ mb: 2 }}>
                    {isConnected && getWalletBalanceDisplay() ? (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Wallet Balance:
                        </Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {getWalletBalanceDisplay()!.eth.toFixed(4)} ETH
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          ≈ ${getWalletBalanceDisplay()!.usd.toLocaleString()} USD | {getWalletBalanceDisplay()!.usdc.toFixed(2)} USDC
                        </Typography>
                        {!canAffordShares() && (
                          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                            ⚠️ Insufficient funds for {modalShares} share{modalShares !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                        ⚠️ Wallet not connected
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    label="Number of Shares"
                    type="number"
                    value={modalShares}
                    onChange={handleSharesChange}
                    size="small"
                    inputProps={{ 
                      min: 0, 
                      max: Math.min(100, property.availableShares || 85),
                      step: 1 
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="body2" color="text.secondary">
                            / 100 shares
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    helperText={`Max ${Math.min(100, property.availableShares || 85)} available shares`}
                    sx={{ minWidth: 200 }}
                  />
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600, mt: 1 }}>
                    Price: {modalShares === 0 ? '$0' : `$${Math.round((property.price || 0) / 100 * modalShares).toLocaleString()}`}
                  </Typography>
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                          <Typography variant="h6" color="success.main">
                            {((property.rentalYield || 0) * 100).toFixed(1)}% Annual Yield
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Expected annual rental return
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <AttachMoney sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="h6" color="primary.main">
                            {formatRentalIncome(getRentalIncome().monthly)}/mo
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Total monthly rental income
                        </Typography>
                        <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                          <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
                            {modalShares === 0 ? '$0.00/mo' : `${formatRentalIncome(getRentalIncome().forShares)}/mo`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {modalShares === 0 ? 'Select shares to see your income' : `Your income for ${modalShares} share${modalShares !== 1 ? 's' : ''}`}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Shares
                    </Typography>
                    <Typography variant="h6">
                      100
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Available Shares
                    </Typography>
                    <Typography variant="h6">
                      {property.availableShares || 85} {/* Use actual data or default to 85 */}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Price per Share
                    </Typography>
                    <Typography variant="h6">
                      ${Math.round((property.price || 0) / 100).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Your Investment ({modalShares} shares)
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {modalShares === 0 ? '$0' : `$${Math.round((property.price || 0) / 100 * modalShares).toLocaleString()}`}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Amenities
                    </Typography>
                    <List dense>
                      {property.amenities.map((amenity: string, index: number) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                          </ListItemIcon>
                          <ListItemText primary={amenity} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </>
              )}

              {/* Description */}
              {property.description && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {property.description}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};