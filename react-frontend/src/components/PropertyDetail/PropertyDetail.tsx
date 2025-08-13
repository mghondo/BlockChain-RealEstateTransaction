import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  LocationOn,
  Home,
  TrendingUp,
  AccountBalance,
  Timeline,
  Security
} from '@mui/icons-material';
import { useContracts } from '../../hooks/useContracts';
import { useWallet } from '../../hooks/useWallet';
import { PropertyDetails } from '../../types/web3';
import { ethers } from 'ethers';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPropertyDetails, depositEarnest } = useContracts();
  const { isConnected, connectWallet } = useWallet();
  
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investing, setInvesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock escrow address - in a real app, you'd get this from the route or a registry
  const escrowAddress = id || '0x1234567890123456789012345678901234567890';

  useEffect(() => {
    loadPropertyDetails();
  }, [id]);

  const loadPropertyDetails = async () => {
    if (!id) {
      setError('Property ID is required');
      setLoading(false);
      return;
    }

    try {
      const details = await getPropertyDetails(escrowAddress);
      if (details) {
        setProperty(details);
      } else {
        setError('Property not found');
      }
    } catch (error) {
      console.error('Failed to load property details:', error);
      setError('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleInvest = async () => {
    if (!property || !isConnected) return;

    setInvesting(true);
    setError(null);

    try {
      const tx = await depositEarnest(escrowAddress, investAmount);
      if (tx) {
        console.log('Investment transaction:', tx.hash);
        // Wait for transaction confirmation
        await tx.wait();
        // Reload property details to show updated funding
        await loadPropertyDetails();
        setInvestDialogOpen(false);
        setInvestAmount('');
      }
    } catch (error: any) {
      console.error('Investment failed:', error);
      setError(error.message || 'Investment failed');
    } finally {
      setInvesting(false);
    }
  };

  const handleConnectAndInvest = async () => {
    try {
      await connectWallet();
      setInvestDialogOpen(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const formatCurrency = (value: bigint): string => {
    const amount = Number(ethers.formatUnits(value, 6));
    return '$' + amount.toLocaleString('en-US');
  };

  const formatEther = (value: bigint): string => {
    const amount = Number(ethers.formatEther(value));
    return amount.toFixed(4);
  };

  const getFundingProgress = (): number => {
    if (!property || property.config.escrowAmount === BigInt(0)) return 0;
    return (Number(property.totalEarnestDeposited) / Number(property.config.escrowAmount)) * 100;
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

  const isInvestable = (): boolean => {
    return property?.currentPhase.id === 0 && property?.availableShares > 0;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error || !property) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Property not found'}
        </Alert>
        <Button onClick={() => navigate('/properties')} startIcon={<ArrowBack />}>
          Back to Properties
        </Button>
      </Container>
    );
  }

  // Mock property data for display
  const mockData = {
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop'
    ],
    address: '123 Blockchain Avenue, Crypto City, CC 12345',
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2850,
    yearBuilt: 2020,
    description: 'Beautiful modern home in prime location with smart home features and sustainable design.',
    amenities: ['Smart Home System', 'Solar Panels', 'Electric Car Charging', 'Security System', 'Modern Kitchen', 'Hardwood Floors']
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button 
          onClick={() => navigate('/properties')} 
          startIcon={<ArrowBack />}
          sx={{ mb: 2 }}
        >
          Back to Properties
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" gutterBottom>
              {formatCurrency(property.config.purchasePrice)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                {mockData.address}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              NFT #{property.config.nftID.toString()}
            </Typography>
          </Box>
          
          <Chip
            label={property.currentPhase.name}
            color={getStatusColor(property.currentPhase.id)}
            size="large"
          />
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Property Images */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <Box
              component="img"
              src={mockData.images[0]}
              alt="Property"
              sx={{
                width: '100%',
                height: 400,
                objectFit: 'cover'
              }}
            />
          </Card>

          {/* Property Details */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Property Details
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Home sx={{ fontSize: 30, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">{mockData.bedrooms}</Typography>
                    <Typography variant="body2" color="text.secondary">Bedrooms</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Home sx={{ fontSize: 30, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">{mockData.bathrooms}</Typography>
                    <Typography variant="body2" color="text.secondary">Bathrooms</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Home sx={{ fontSize: 30, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">{mockData.squareFeet.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">Sq Ft</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Home sx={{ fontSize: 30, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">{mockData.yearBuilt}</Typography>
                    <Typography variant="body2" color="text.secondary">Year Built</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body1" paragraph>
                {mockData.description}
              </Typography>

              <Typography variant="h6" gutterBottom>
                Amenities
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {mockData.amenities.map((amenity, index) => (
                  <Chip key={index} label={amenity} variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Investment Panel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Investment Overview
              </Typography>

              {/* Funding Progress */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Funding Progress</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {getFundingProgress().toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getFundingProgress()} 
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatEther(property.totalEarnestDeposited)} ETH raised
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatEther(property.config.escrowAmount)} ETH goal
                  </Typography>
                </Box>
              </Box>

              {/* Investment Stats */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Available Shares</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {property.availableShares}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Expected APY</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    8.5%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Minimum Investment</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    0.1 ETH
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Investment Action */}
              {!isConnected ? (
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleConnectAndInvest}
                >
                  Connect Wallet to Invest
                </Button>
              ) : !isInvestable() ? (
                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  disabled
                >
                  Not Available for Investment
                </Button>
              ) : (
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => setInvestDialogOpen(true)}
                >
                  Invest Now
                </Button>
              )}

              {/* Property Information */}
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Seller
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  {property.config.seller}
                </Typography>
                
                {property.config.buyer !== ethers.ZeroAddress && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Buyer
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {property.config.buyer}
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Investment Dialog */}
      <Dialog open={investDialogOpen} onClose={() => setInvestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invest in Property</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Enter the amount of ETH you want to invest in this property.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Investment Amount (ETH)"
            type="number"
            fullWidth
            variant="outlined"
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
            inputProps={{
              min: "0.1",
              step: "0.1"
            }}
            helperText="Minimum investment: 0.1 ETH"
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvestDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvest} 
            variant="contained"
            disabled={investing || !investAmount || parseFloat(investAmount) < 0.1}
          >
            {investing ? <CircularProgress size={20} /> : 'Invest'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}