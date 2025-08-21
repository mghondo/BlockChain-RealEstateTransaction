import React, { useState, useEffect } from 'react';
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
import { useMockWallet } from '../../hooks/useMockWallet';
import { MockWallet } from '../MockWallet/MockWallet';
import { useAuth } from '../../contexts/AuthContext';
import { TimelineDebug } from '../Debug/TimelineDebug';
import type { PropertyClass } from '../../types/property';
import imageInventory from '../../utils/imageInventory.json';

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

// Background slideshow configuration
const baseUrl = 'https://fractional-real-estate.netlify.app';

interface BackgroundImage {
  src: string;
  direction: 'left' | 'right' | 'up' | 'down' | 'diagonal-up' | 'diagonal-down';
  duration: number;
  delay: number;
}

// Function to get random images from inventory
const getRandomBackgroundImages = (): BackgroundImage[] => {
  const images: BackgroundImage[] = [];
  const directions: BackgroundImage['direction'][] = ['left', 'right', 'up', 'down', 'diagonal-up', 'diagonal-down'];
  
  // Get 2 images from each class (A, B, C)
  const classes: PropertyClass[] = ['A', 'B', 'C'];
  
  classes.forEach(propertyClass => {
    const anywhereImages = (imageInventory as any)[propertyClass]?.['Anywhere'] || [];
    if (anywhereImages.length > 0) {
      // Get 2 random images from this class
      for (let i = 0; i < 2; i++) {
        const randomIndex = Math.floor(Math.random() * anywhereImages.length);
        const filename = anywhereImages[randomIndex];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        
        images.push({
          src: `${baseUrl}/${propertyClass}/Anywhere/${filename}`,
          direction: randomDirection,
          duration: 20 + Math.random() * 20, // 20-40 seconds
          delay: Math.random() * 5 // 0-5 second delay
        });
      }
    }
  });
  
  // Shuffle the array for random order
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [images[i], images[j]] = [images[j], images[i]];
  }
  
  return images;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, restoreWallet, connectWallet } = useMockWallet({ userId: user?.uid });
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Generate random background images on component mount
  useEffect(() => {
    setBackgroundImages(getRandomBackgroundImages());
  }, []);

  // Restore wallet on component mount
  useEffect(() => {
    restoreWallet();
  }, [restoreWallet]);

  // Auto-advance slideshow every 5 seconds
  useEffect(() => {
    if (backgroundImages.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  const handleGetStarted = () => {
    if (!isConnected) {
      setShowWalletModal(true);
    } else {
      navigate('/properties');
    }
  };

  const handleWalletConnect = (walletData: any) => {
    connectWallet(walletData);
    setShowWalletModal(false);
  };

  const handleViewProperties = () => {
    navigate('/properties');
  };

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Hero Section with Background Slideshow */}
      <Container maxWidth="lg">
        {/* Background Image Slideshow */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1, // NEGATIVE Z-INDEX so it stays behind header
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {backgroundImages.map((img, index) => {
            // Generate random pan direction for each image
            const getPanAnimation = (direction: string) => {
              const panAmount = '3%';
              switch (direction) {
                case 'left':
                  return {
                    '0%': { transform: 'scale(1.2) translateX(0%)' },
                    '100%': { transform: `scale(1.2) translateX(-${panAmount})` }
                  };
                case 'right':
                  return {
                    '0%': { transform: 'scale(1.2) translateX(0%)' },
                    '100%': { transform: `scale(1.2) translateX(${panAmount})` }
                  };
                case 'up':
                  return {
                    '0%': { transform: 'scale(1.2) translateY(0%)' },
                    '100%': { transform: `scale(1.2) translateY(-${panAmount})` }
                  };
                case 'down':
                  return {
                    '0%': { transform: 'scale(1.2) translateY(0%)' },
                    '100%': { transform: `scale(1.2) translateY(${panAmount})` }
                  };
                case 'diagonal-up':
                  return {
                    '0%': { transform: 'scale(1.2) translate(0%, 0%)' },
                    '100%': { transform: `scale(1.2) translate(-${panAmount}, -${panAmount})` }
                  };
                case 'diagonal-down':
                  return {
                    '0%': { transform: 'scale(1.2) translate(0%, 0%)' },
                    '100%': { transform: `scale(1.2) translate(${panAmount}, ${panAmount})` }
                  };
                default:
                  return {
                    '0%': { transform: 'scale(1.2) translateX(0%)' },
                    '100%': { transform: `scale(1.2) translateX(${panAmount})` }
                  };
              }
            };

            return (
              <Box
                key={index}
                component="img"
                src={img.src}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: index === currentImageIndex ? 0.2 : 0,
                  transition: 'opacity 1s ease-in-out',
                  animation: `slowPan-${img.direction} 5s ease-in-out infinite alternate`,
                  [`@keyframes slowPan-${img.direction}`]: getPanAnimation(img.direction)
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            );
          })}
        </Box>

        <Box
          sx={{
            py: { xs: 8, md: 12 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
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
            {!isConnected && (
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
                Connect Wallet
              </Button>
            )}
            
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

          {!isConnected ? (
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
              Connect Wallet to Begin
            </Button>
          ) : (
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
              Start Investing Now
            </Button>
          )}
        </Box>
      </Container>

      {/* Development Debug Panel */}
      {process.env.NODE_ENV === 'development' && <TimelineDebug />}

      {/* Mock Wallet Modal */}
      <MockWallet
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </Box>
  );
}