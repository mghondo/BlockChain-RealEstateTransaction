import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  Security,
  AccountBalance,
  Speed,
  Visibility,
  VerifiedUser
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';

const features = [
  {
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    title: 'High Returns',
    description: 'Earn up to 12% APY through real estate tokenization and DeFi yield farming'
  },
  {
    icon: <Security sx={{ fontSize: 40 }} />,
    title: 'Secure Investment',
    description: 'Smart contracts ensure transparent and secure property transactions'
  },
  {
    icon: <AccountBalance sx={{ fontSize: 40 }} />,
    title: 'Fractional Ownership',
    description: 'Invest in premium real estate with as little as $100'
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: 'Instant Liquidity',
    description: 'Trade your property tokens on secondary markets anytime'
  },
  {
    icon: <Visibility sx={{ fontSize: 40 }} />,
    title: 'Full Transparency',
    description: 'All transactions and property data recorded on blockchain'
  },
  {
    icon: <VerifiedUser sx={{ fontSize: 40 }} />,
    title: 'KYC Verified',
    description: 'All properties and investors undergo thorough verification'
  }
];

const stats = [
  { label: 'Total Value Locked', value: '$12.5M' },
  { label: 'Properties Listed', value: '150+' },
  { label: 'Active Investors', value: '2,500+' },
  { label: 'Average APY', value: '8.5%' }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isConnected, connectWallet } = useWallet();

  const handleGetStarted = async () => {
    if (!isConnected) {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      navigate('/properties');
    }
  };

  const handleViewProperties = () => {
    navigate('/properties');
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
              fontWeight: 700,
              mb: 3,
              background: 'linear-gradient(45deg, #00d4ff 30%, #ffffff 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Fractional Real Estate
          </Typography>
          
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '1.5rem', md: '2.5rem' },
              fontWeight: 400,
              mb: 4,
              color: 'text.secondary'
            }}
          >
            Powered by Blockchain
          </Typography>

          <Typography
            variant="h5"
            sx={{
              maxWidth: 600,
              mb: 6,
              color: 'text.secondary',
              lineHeight: 1.6
            }}
          >
            Invest in premium real estate properties through blockchain technology. 
            Own fractions of high-value properties, earn yield, and trade tokens seamlessly.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2
              }}
            >
              {isConnected ? 'Explore Properties' : 'Connect Wallet'}
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={handleViewProperties}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 2
              }}
            >
              View Properties
            </Button>
          </Box>
        </Box>
      </Container>

      {/* Stats Section */}
      <Box sx={{ py: 6, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      color: 'primary.main'
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg">
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 2,
              fontWeight: 600
            }}
          >
            Why Choose FracEstate?
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              mb: 8,
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            Experience the future of real estate investment with cutting-edge blockchain technology
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                    <Box sx={{ color: 'primary.main', mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              mb: 8,
              fontWeight: 600
            }}
          >
            How It Works
          </Typography>

          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  label="1"
                  sx={{
                    width: 60,
                    height: 60,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    mb: 3,
                    backgroundColor: 'primary.main',
                    color: 'black'
                  }}
                />
                <Typography variant="h6" gutterBottom>
                  Connect Your Wallet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect your MetaMask wallet to access the platform and start investing
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  label="2"
                  sx={{
                    width: 60,
                    height: 60,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    mb: 3,
                    backgroundColor: 'primary.main',
                    color: 'black'
                  }}
                />
                <Typography variant="h6" gutterBottom>
                  Choose Properties
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse verified properties and select the ones that match your investment goals
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  label="3"
                  sx={{
                    width: 60,
                    height: 60,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    mb: 3,
                    backgroundColor: 'primary.main',
                    color: 'black'
                  }}
                />
                <Typography variant="h6" gutterBottom>
                  Start Earning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receive property tokens and start earning rental income and appreciation
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="lg">
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h3"
            sx={{ mb: 3, fontWeight: 600 }}
          >
            Ready to Start Investing?
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              mb: 6,
              color: 'text.secondary',
              maxWidth: 500,
              mx: 'auto'
            }}
          >
            Join thousands of investors already earning passive income through fractional real estate
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              px: 6,
              py: 2,
              fontSize: '1.2rem',
              borderRadius: 2
            }}
          >
            {isConnected ? 'Start Investing Now' : 'Connect Wallet to Begin'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}