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
  
  // Real wallet data with volatility functions
  const { 
    ethBalance, 
    isConnected, 
    address, 
    mode, 
    restoreWallet,
    strikePrice,
    createdAt,
    initialUsdValue,
    getCurrentUsdValue,
    getProfitLoss,
    getWalletPerformance
  } = useMockWallet();
  const { getUsdValue, convertCurrency, prices } = useCryptoPrices();

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);

  // Debug wallet connection state
  useEffect(() => {
    console.log('🔍 PropertyDetailModal wallet debug:', {
      isConnected,
      ethBalance,
      address,
      mode,
      hasAddress: !!address,
      actuallyConnected: isConnected || !!address
    });
  }, [isConnected, ethBalance, address, mode]);
  
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
    if (!modalShares) return true; // Can always afford 0 shares
    
    const totalCostUsd = Math.round((property.price || 0) / 100 * modalShares);
    
    // Calculate wallet balance in USD
    let walletBalanceUsd = 0;
    
    if (mode === 'simulation') {
      // In simulation mode, ethBalance is ETH amount worth $20,000
      // Convert ETH to USD to get buying power
      walletBalanceUsd = getUsdValue(ethBalance, 'ETH') || 0;
    } else {
      // In blockchain mode, convert ETH to USD  
      walletBalanceUsd = getUsdValue(ethBalance, 'ETH') || 0;
    }
    
    const canAfford = walletBalanceUsd >= totalCostUsd;
    
    console.log('💰 Affordability check:', {
      mode,
      modalShares,
      propertyPrice: property.price,
      totalCostUsd,
      ethBalance,
      ethToUsdPrice: prices?.ethToUsd,
      walletBalanceUsd,
      canAfford,
      isConnected,
      hasAddress: !!address
    });
    
    return canAfford;
  };

  const getWalletBalanceDisplay = () => {
    // Check if wallet is connected (either isConnected flag or has address)
    const walletConnected = isConnected || !!address;
    if (!walletConnected || !ethBalance) return null;
    
    const currentEthPrice = prices?.ethToUsd || 4462;
    
    if (mode === 'simulation' && strikePrice && getCurrentUsdValue) {
      // Use volatility functions for simulation mode
      const currentUsdValue = getCurrentUsdValue(currentEthPrice);
      const profitLoss = getProfitLoss ? getProfitLoss(currentEthPrice) : 0;
      const performance = getWalletPerformance ? getWalletPerformance(currentEthPrice) : null;
      
      const displayValues = {
        eth: ethBalance,
        usd: currentUsdValue,
        usdc: currentUsdValue, // In simulation, USD and USDC are equivalent
        profitLoss,
        profitLossPercent: performance?.profitLossPercent || 0,
        strikePrice,
        currentPrice: currentEthPrice,
        initialValue: initialUsdValue || 20000
      };
      
      console.log('💰 Wallet Balance Display (Volatility):', { 
        mode, 
        ethBalance, 
        displayValues, 
        performance,
        walletConnected
      });
      
      return displayValues;
    } else {
      // Fallback for blockchain mode or simulation without volatility data
      const usdValue = getUsdValue(ethBalance, 'ETH') || 0;
      const usdcEquivalent = convertCurrency(ethBalance, 'ETH', 'USDC') || usdValue;
      
      const displayValues = {
        eth: ethBalance,
        usd: usdValue,
        usdc: usdcEquivalent
      };
      
      console.log('💰 Wallet Balance Display (Standard):', { 
        mode, 
        ethBalance, 
        displayValues, 
        prices,
        walletConnected
      });
      
      return displayValues;
    }
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
                  {/* Gas Price Display */}
                  {prices?.gasPrice && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <Box 
                        sx={{ 
                          width: 6, 
                          height: 6, 
                          backgroundColor: 'success.main',
                          borderRadius: '50%',
                          animation: 'gasFlicker 0.3s infinite',
                          '@keyframes gasFlicker': {
                            '0%, 50%': {
                              backgroundColor: 'success.main'
                            },
                            '51%, 100%': {
                              backgroundColor: '#2e7d58'
                            }
                          }
                        }} 
                      />
                      <Typography variant="body2" color="text.secondary">
                        Gas: {prices.gasPrice} gwei
                      </Typography>
                    </Box>
                  )}
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
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Wallet Status: {isConnected ? 'Connected' : 'Not Connected'} | 
                      Address: {address ? 'Yes' : 'No'} | 
                      Mode: {mode || 'unknown'} | 
                      Balance: {ethBalance}
                    </Typography>
                    
                    {(isConnected || !!address) ? (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Wallet Balance:
                        </Typography>
                        
                        {/* Always show balance even if conversion fails */}
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {ethBalance ? ethBalance.toFixed(4) : '0.0000'} ETH
                        </Typography>
                        
                        {getWalletBalanceDisplay() ? (
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              ≈ ${getWalletBalanceDisplay()!.usd.toLocaleString()} USD | {getWalletBalanceDisplay()!.usdc.toFixed(2)} USDC
                            </Typography>
                            
                            {/* Show volatility info for simulation mode */}
                            {mode === 'simulation' && getWalletBalanceDisplay()!.profitLoss !== undefined && (
                              <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0, 0, 0, 0.1)', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
                                  📈 Portfolio Performance:
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color={getWalletBalanceDisplay()!.profitLoss >= 0 ? 'success.main' : 'error.main'}
                                  sx={{ fontWeight: 600 }}
                                >
                                  {getWalletBalanceDisplay()!.profitLoss >= 0 ? '+' : ''}${getWalletBalanceDisplay()!.profitLoss.toFixed(2)} 
                                  ({getWalletBalanceDisplay()!.profitLossPercent >= 0 ? '+' : ''}{getWalletBalanceDisplay()!.profitLossPercent.toFixed(2)}%)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  ETH: ${getWalletBalanceDisplay()!.strikePrice?.toFixed(0)} → ${getWalletBalanceDisplay()!.currentPrice?.toFixed(0)}
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            USD conversion unavailable (ETH Price: {prices?.ethToUsd || 'Loading...'})
                          </Typography>
                        )}
                        
                        {modalShares > 0 && !canAffordShares() && (
                          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                            ⚠️ Insufficient funds for {modalShares} share{modalShares !== 1 ? 's' : ''} 
                            (Need: ${Math.round((property.price || 0) / 100 * modalShares).toLocaleString()})
                          </Typography>
                        )}
                        
                        {modalShares > 0 && canAffordShares() && (
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                            ✅ You can afford {modalShares} share{modalShares !== 1 ? 's' : ''}
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