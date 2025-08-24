import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Button,
  IconButton
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Home,
  Timeline
} from '@mui/icons-material';
import { useMockWallet } from '../../hooks/useMockWallet';
import { PriceDisplay } from '../Currency/PriceDisplay';
import { EscrowTracker } from '../Escrow/EscrowTracker';
import { PortfolioOverview } from '../Portfolio/PortfolioOverview';
import { setupTestInvestments } from '../../utils/createSampleData';
import { DashboardCharts } from './DashboardCharts';
import { useCryptoPrices } from '../../hooks/useCryptoPrices';
import { useAuth } from '../../contexts/AuthContext';
import { useUserInvestments } from '../../hooks/useUserInvestments';
import { useRentalPayments } from '../../hooks/useRentalPayments';
import { useHourlyRental } from '../../hooks/useHourlyRental';
import { fixMissingTimestamps } from '../../utils/fixMissingTimestamps';
import { AccountBalanceWallet, ContentCopy, LocationOn, TrendingUp as TrendingUpIcon } from '@mui/icons-material';

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected, address, ethBalance, restoreWallet, formatAddress, formatBalance } = useMockWallet({ userId: user?.uid });
  const { prices } = useCryptoPrices();
  const { investments, portfolioSummary, loading: investmentsLoading, error: investmentsError } = useUserInvestments();
  const { paymentData, collectRental, canCollect } = useRentalPayments(investments);
  const { triggerManualCollection, getNextCollectionTime, isCollectionTime, isActive } = useHourlyRental({ 
    investments, 
    enabled: true 
  });

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);

  // Fix missing timestamps on component mount
  useEffect(() => {
    const fixTimestamps = async () => {
      if (user?.uid) {
        try {
          const fixed = await fixMissingTimestamps(user.uid);
          if (fixed > 0) {
            console.log(`🔧 Fixed ${fixed} investment timestamps - refreshing page...`);
            // Refresh the page after fixing timestamps
            setTimeout(() => window.location.reload(), 1000);
          }
        } catch (error) {
          console.error('Failed to fix timestamps:', error);
        }
      }
    };

    fixTimestamps();
  }, [user?.uid]);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      // Could add a toast notification here
    }
  };

  if (!isConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Connect Your Wallet
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Please connect your wallet to view your investment dashboard.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Go to the header and click "Connect Test Wallet" to get started.
          </Typography>
        </Box>
      </Container>
    );
  }

  // Transform real investment data to match the existing UI structure
  const userProperties = investments.map(investment => {
    console.log(`🏠 Transforming investment for UI:`, {
      address: investment.propertyAddress,
      purchaseUsdValue: investment.purchaseUsdValue,
      totalReturn: investment.totalReturn,
      monthlyRentalIncome: investment.monthlyRentalIncome,
      sharesOwned: investment.sharesOwned,
      bedrooms: investment.propertyBedrooms,
      bathrooms: investment.propertyBathrooms,
      sqft: investment.propertySqft
    });
    
    return {
      id: investment.id,
      address: investment.propertyAddress,
      city: investment.propertyCity,
      state: investment.propertyState,
      class: investment.propertyClass as 'A' | 'B' | 'C',
      sharesOwned: investment.sharesOwned,
      invested: Math.round(investment.purchaseUsdValue || 0), // USD invested
      currentValue: Math.round((investment.purchaseUsdValue || 0) + (investment.totalReturn || 0)), // Current USD value
      monthlyIncome: investment.monthlyRentalIncome || 0,
      status: 'Active' as const,
      // Additional real data for enhanced display
      imageUrl: investment.propertyImageUrl,
      totalRentalEarned: investment.totalRentalEarned || 0,
      appreciationAmount: investment.appreciationAmount || 0,
      totalReturnPercentage: investment.totalReturnPercentage || 0,
      ownershipPercentage: investment.ownershipPercentage || 0,
      purchaseDate: investment.purchaseDate,
      bedrooms: investment.propertyBedrooms || 0,
      bathrooms: investment.propertyBathrooms || 0,
      sqft: investment.propertySqft || 0,
      yearBuilt: investment.propertyYearBuilt || 0
    };
  });

  // Mock data for demonstration
  const portfolioStats = {
    totalInvestment: '$25,000',
    currentValue: '$27,500',
    totalReturn: '+$2,500 (+10%)',
    monthlyIncome: '$425'
  };

  // Convert investments for the old Investment List section (keeping for now)
  const legacyInvestmentFormat = investments.map(investment => ({
    id: investment.id,
    address: `${investment.propertyAddress}, ${investment.propertyCity}, ${investment.propertyState}`,
    invested: `$${Math.round(investment.purchaseUsdValue).toLocaleString()}`,
    currentValue: `$${Math.round(investment.purchaseUsdValue + investment.totalReturn).toLocaleString()}`,
    shares: investment.sharesOwned,
    monthlyIncome: `$${Math.round(investment.monthlyRentalIncome)}`,
    status: 'Active'
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to Dashboard
      </Typography>

      {/* Wallet Details Card */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(0, 200, 83, 0.05) 100%)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AccountBalanceWallet sx={{ color: 'primary.main' }} />
            <Typography variant="h6">
              🎮 Test Wallet Connected
            </Typography>
            <Chip label="Simulation" color="secondary" size="small" />
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Test Wallet Address
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {address}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={handleCopyAddress}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Box>
              
              <Typography variant="caption" color="text.secondary" display="block">
                Blockchain wallet connected - Sepolia Testnet
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Test Balances
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  💎 {formatBalance(ethBalance)} ETH
                </Typography>
                {prices && (
                  <Typography variant="body2" color="success.main" style={{ fontSize: '1.25rem' }}>
                    💵 ≈ ${(ethBalance * prices.ethToUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                  </Typography>
                )}
              </Box>
              
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 900, fontSize: '1.25rem' }}>
                ✅ Ready to invest!
              </Typography>
            </Grid>

            {/* Rental Income Collection */}
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Rental Income Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  💰 Total Accrued: ${paymentData.totalAccrued.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="body2" color="success.main">
                  ✅ Already Collected: ${paymentData.alreadyPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="h6" color="primary.main" sx={{ mt: 1 }}>
                  🎯 Pending: ${paymentData.pendingAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </Box>
              
              {/* Automatic Collection Status */}
              <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(0,128,0,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, display: 'block' }}>
                  🤖 AUTOMATIC COLLECTION
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  System Active: {isActive ? 'YES' : 'NO'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Current Time Collection: {isCollectionTime() ? 'YES (:00 or :30)' : 'NO'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Next Collection: {getNextCollectionTime()?.toLocaleTimeString() || 'N/A'}
                </Typography>
              </Box>

              {/* Debug: Rental Payment Data */}
              <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(255,0,0,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, display: 'block' }}>
                  🔍 RENTAL DEBUG
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Raw totalAccrued: {paymentData.totalAccrued}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Raw alreadyPaid: {paymentData.alreadyPaid}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Raw pendingAmount: {paymentData.pendingAmount}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Is Collecting: {paymentData.isCollecting ? 'YES' : 'NO'}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                  Can Collect: {canCollect ? 'YES' : 'NO'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {canCollect ? (
                  <Button 
                    variant="contained" 
                    color="success"
                    disabled={paymentData.isCollecting}
                    onClick={async () => {
                      const result = await collectRental();
                      if (result.success) {
                        console.log(`💰 Successfully collected $${result.amountPaid.toFixed(2)}`);
                      }
                    }}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {paymentData.isCollecting ? '⏳ Collecting...' : '💰 Manual Collect'}
                  </Button>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {paymentData.pendingAmount < 0.01 ? '✨ No pending income' : 'Processing...'}
                  </Typography>
                )}
                
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={async () => {
                    const success = await triggerManualCollection();
                    console.log('🧪 Manual hourly collection result:', success);
                  }}
                  sx={{ fontWeight: 'bold' }}
                >
                  🧪 Test Hourly
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* User Properties Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Home sx={{ color: 'primary.main' }} />
            <Typography variant="h6">
              Your Properties
            </Typography>
            <Chip 
              label={investmentsLoading ? 'Loading...' : `${userProperties.length} Properties`} 
              size="small" 
              color="primary" 
            />
            {portfolioSummary && (
              <Chip 
                label={`$${Math.round(portfolioSummary.totalInvestedUSD).toLocaleString()} Invested`} 
                size="small" 
                color="success" 
                sx={{ ml: 1 }}
              />
            )}
          </Box>

          {investmentsLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1">Loading your properties...</Typography>
            </Box>
          ) : investmentsError ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="error">Error: {investmentsError}</Typography>
            </Box>
          ) : userProperties.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Home sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Properties Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Start investing in fractional real estate to see your portfolio here.
              </Typography>
              <Button variant="contained" href="/properties">
                Browse Properties
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {userProperties.map((property, index) => (
                <Box
                  key={property.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      transform: 'translateX(4px)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  {/* Property Info with Image */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    {/* Property Image */}
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                        bgcolor: 'grey.200'
                      }}
                    >
                      <img
                        src={property.imageUrl}
                        alt={property.address}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          // Fallback to class badge if image fails
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                        }}
                      />
                      {/* Class Badge Overlay */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 20,
                          height: 20,
                          borderRadius: 1,
                          bgcolor: property.class === 'A' ? '#FFD700' : 
                                   property.class === 'B' ? '#C0C0C0' : '#CD7F32',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#000',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}
                      >
                        {property.class}
                      </Box>
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {property.address}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {property.city}, {property.state}
                          {property.bedrooms > 0 && property.bathrooms > 0 && ` • ${property.bedrooms}bed/${property.bathrooms}bath`}
                          {property.sqft > 0 && ` • ${property.sqft.toLocaleString()} sqft`}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                        Purchased {new Date(property.purchaseDate).toLocaleDateString()}
                      </Typography>
                      
                      {/* Debug: Show all timestamp information and rental data */}
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,255,0,0.1)', borderRadius: 1 }}>
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, display: 'block' }}>
                          🔍 PROPERTY DEBUG
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                          Purchase: {property.purchaseDate ? new Date(property.purchaseDate).toISOString() : 'NOT SET'}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                          Current Time: {new Date().toISOString()}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                          Rental Earned: ${property.totalRentalEarned.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', fontFamily: 'monospace' }}>
                          Monthly Rate: ${property.monthlyIncome.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Investment Details */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, textAlign: 'right' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Shares Owned
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {property.sharesOwned}/100
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Investment
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        ${property.invested.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Current Value
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ${property.currentValue.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        💰 Rental Income (PAID)
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ${property.totalRentalEarned.toFixed(0)} earned
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        ${property.monthlyIncome.toFixed(0)}/mo rate
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        📈 Appreciation (UNREALIZED)
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                        ${property.appreciationAmount ? property.appreciationAmount.toFixed(0) : '0'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Paper gains only
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Return
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600, 
                          color: property.totalReturnPercentage >= 0 ? 'success.main' : 'error.main' 
                        }}
                      >
                        {property.totalReturnPercentage >= 0 ? '+' : ''}{property.totalReturnPercentage.toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        ${(property.currentValue - property.invested).toFixed(0)}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: 80 }}>
                      <Chip
                        label={property.status}
                        size="small"
                        color={property.status === 'Active' ? 'success' : 'warning'}
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Test Data Button (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="outlined"
            size="small"
            onClick={() => setupTestInvestments(address || '')}
            sx={{ mr: 2 }}
          >
            🧪 Create Test Investments
          </Button>
          <Button 
            variant="outlined"
            size="small"
            onClick={async () => {
              const { PropertyTimelineService } = await import('../../services/propertyTimelineService');
              console.log('🔧 Manually triggering timeline initialization...');
              await PropertyTimelineService.initializePropertyTimelines();
            }}
            sx={{ mr: 2 }}
          >
            ⏰ Initialize Timelines
          </Button>
          <Button 
            variant="outlined"
            size="small"
            onClick={async () => {
              const { PropertyTimelineService } = await import('../../services/propertyTimelineService');
              console.log('🔧 Manually triggering property sales check...');
              const soldCount = await PropertyTimelineService.processPropertySales();
              console.log(`Manual check result: ${soldCount} properties sold`);
            }}
            sx={{ mr: 2 }}
          >
            💰 Check Sales Now
          </Button>
          <Typography variant="caption" color="text.secondary">
            Development only: Creates sample properties and investments for testing rental income
          </Typography>
        </Box>
      )}

      {/* Crypto Price Display */}
      <PriceDisplay className="mb-6" />

      {/* Portfolio Analytics Charts */}
      <Box sx={{ mb: 4 }}>
        <DashboardCharts />
      </Box>


      {/* Escrow Tracking Section */}
      <Box sx={{ mb: 4 }}>
        <EscrowTracker />
      </Box>

      {/* Portfolio Overview - Real Data */}
      {/* <Box sx={{ mb: 4 }}>
        <PortfolioOverview className="rounded-lg" />
      </Box> */}

      {/* Mock Portfolio Overview - Keep for reference but remove */}
      <Grid container spacing={3} sx={{ mb: 4, display: 'none' }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalance sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Total Investment</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {portfolioStats.totalInvestment}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Current Value</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {portfolioStats.currentValue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Timeline sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6">Total Return</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {portfolioStats.totalReturn}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Home sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Monthly Income</Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {portfolioStats.monthlyIncome}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Investment List */}
      <Typography variant="h6" gutterBottom>
        Your Investments
      </Typography>
      
      <Grid container spacing={3}>
        {legacyInvestmentFormat.map((investment) => (
          <Grid item xs={12} md={6} lg={4} key={investment.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" noWrap>
                    Property #{investment.id}
                  </Typography>
                  <Chip 
                    label={investment.status} 
                    color={investment.status === 'Active' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {investment.address}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Invested</Typography>
                    <Typography variant="body2">{investment.invested}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Current Value</Typography>
                    <Typography variant="body2" color="success.main">
                      {investment.currentValue}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Shares</Typography>
                    <Typography variant="body2">{investment.shares}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2">Monthly Income</Typography>
                    <Typography variant="body2" color="primary.main">
                      {investment.monthlyIncome}
                    </Typography>
                  </Box>

                  <LinearProgress 
                    variant="determinate" 
                    value={75} 
                    sx={{ height: 6, borderRadius: 3, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    75% funding completed
                  </Typography>
                </Box>

                <Button 
                  variant="outlined" 
                  fullWidth 
                  sx={{ mt: 2 }}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {legacyInvestmentFormat.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Home sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Investments Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Start investing in fractional real estate to see your portfolio here.
            </Typography>
            <Button variant="contained" href="/properties">
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}