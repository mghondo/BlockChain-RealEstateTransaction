import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Button
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Home,
  Timeline
} from '@mui/icons-material';
import { useWallet } from '../../hooks/useWallet';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { PriceDisplay } from '../Currency/PriceDisplay';

export default function Dashboard() {
  const { isConnected, account, balance, connectWallet } = useWallet();
  const { tokenBalances } = useTokenBalance();

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
          <Button variant="contained" size="large" onClick={connectWallet}>
            Connect Wallet
          </Button>
        </Box>
      </Container>
    );
  }

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
        Investment Dashboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Welcome back! Here's your portfolio overview.
      </Typography>

      {/* Crypto Price Display */}
      <PriceDisplay className="mb-6" />

      {/* Portfolio Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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

      {/* Wallet Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Wallet Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Connected Account
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                {account}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                ETH Balance
              </Typography>
              <Typography variant="h6">
                {parseFloat(balance).toFixed(4)} ETH
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Token Balances
              </Typography>
              {tokenBalances.map((token) => (
                <Box key={token.symbol} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{token.symbol}</Typography>
                  <Typography variant="body2">{token.formatted}</Typography>
                </Box>
              ))}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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