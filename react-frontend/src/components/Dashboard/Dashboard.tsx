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
import { AccountBalanceWallet, ContentCopy, LocationOn, TrendingUp as TrendingUpIcon } from '@mui/icons-material';

export default function Dashboard() {
  const { isConnected, address, ethBalance, restoreWallet, formatAddress, formatBalance } = useMockWallet();
  const { prices } = useCryptoPrices();

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);

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

  // Mock user properties data - in a real app this would come from a hook/API
  const userProperties = [
    {
      id: '1',
      address: '123 Blockchain Avenue',
      city: 'Miami',
      state: 'FL',
      class: 'A' as const,
      sharesOwned: 25,
      invested: 12500,
      currentValue: 13750,
      monthlyIncome: 425.50,
      status: 'Active' as const
    },
    {
      id: '2', 
      address: '456 DeFi Street',
      city: 'Austin',
      state: 'TX',
      class: 'B' as const,
      sharesOwned: 15,
      invested: 7500,
      currentValue: 8100,
      monthlyIncome: 245.25,
      status: 'Active' as const
    },
    {
      id: '3',
      address: '789 Smart Contract Boulevard',
      city: 'Denver',
      state: 'CO', 
      class: 'C' as const,
      sharesOwned: 40,
      invested: 8000,
      currentValue: 8480,
      monthlyIncome: 320.75,
      status: 'Under Review' as const
    }
  ];

  // Mock data for demonstration
  const portfolioStats = {
    totalInvestment: '$25,000',
    currentValue: '$27,500',
    totalReturn: '+$2,500 (+10%)',
    monthlyIncome: '$425'
  };

  const investments = [
    {
      id: '1',
      address: '123 Blockchain Ave, Crypto City',
      invested: '$5,000',
      currentValue: '$5,500',
      shares: 50,
      monthlyIncome: '$85',
      status: 'Active'
    },
    {
      id: '2',
      address: '456 DeFi Street, Web3 Town',
      invested: '$10,000',
      currentValue: '$11,000',
      shares: 100,
      monthlyIncome: '$180',
      status: 'Active'
    },
    {
      id: '3',
      address: '789 Smart Contract Blvd',
      invested: '$10,000',
      currentValue: '$11,000',
      shares: 75,
      monthlyIncome: '$160',
      status: 'Under Inspection'
    }
  ];

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
            <Chip label={`${userProperties.length} Properties`} size="small" color="primary" />
          </Box>

          {userProperties.length === 0 ? (
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
                  {/* Property Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: property.class === 'A' ? '#FFD700' : 
                                 property.class === 'B' ? '#C0C0C0' : '#CD7F32',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontWeight: 700,
                        fontSize: '0.875rem'
                      }}
                    >
                      {property.class}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {property.address}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {property.city}, {property.state}
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
                        Monthly Income
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        ${property.monthlyIncome.toFixed(0)}/mo
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
      <Box sx={{ mb: 4 }}>
        <PortfolioOverview className="rounded-lg" />
      </Box>

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
        {investments.map((investment) => (
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
      {investments.length === 0 && (
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