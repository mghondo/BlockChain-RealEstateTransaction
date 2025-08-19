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
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useTheme,
  useMediaQuery,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Paper,
  Collapse,
  ImageList,
  ImageListItem
} from '@mui/material';
import {
  ArrowBack,
  LocationOn,
  Home,
  TrendingUp,
  AccessTime,
  Favorite,
  FavoriteBorder,
  Share,
  CalendarToday,
  AttachMoney,
  PhotoLibrary,
  ExpandMore,
  ExpandLess,
  Person,
  AccountBalance,
  Security,
  Timeline,
  Analytics
} from '@mui/icons-material';
import { Property } from '../../types/property';
import { propertyService } from '../../services/firebaseService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function FracEstatePropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Investment state
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const [shareCount, setShareCount] = useState<number>(1);
  const [investing, setInvesting] = useState(false);
  
  // UI state
  const [tabValue, setTabValue] = useState(0);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  // Load property details
  useEffect(() => {
    const loadProperty = async () => {
      if (!id) {
        setError('Property ID is required');
        setLoading(false);
        return;
      }

      try {
        const propertyData = await propertyService.getProperty(id);
        if (propertyData) {
          setProperty(propertyData);
        } else {
          setError('Property not found');
        }
      } catch (err) {
        console.error('Failed to load property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  // Update time remaining
  useEffect(() => {
    if (!property) return;

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const selloutTime = property.selloutTime.toDate().getTime();
      const timeDiff = selloutTime - now;

      if (timeDiff <= 0) {
        setTimeRemaining('Sold Out');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(interval);
  }, [property]);

  // Calculate investment details
  const calculateInvestment = () => {
    if (!property?.sharePrice) return null;
    
    const shares = Math.floor(investmentAmount / property.sharePrice);
    const actualInvestment = shares * property.sharePrice;
    const expectedAnnualReturn = actualInvestment * property.rentalYield;
    const expectedMonthlyReturn = expectedAnnualReturn / 12;
    
    return {
      shares,
      actualInvestment,
      expectedAnnualReturn,
      expectedMonthlyReturn
    };
  };

  const investment = calculateInvestment();

  // Handlers
  const handleInvest = async () => {
    if (!property || !investment) return;
    
    setInvesting(true);
    
    // Simulate investment process
    setTimeout(() => {
      setInvesting(false);
      setInvestDialogOpen(false);
      // In a real app, this would integrate with blockchain
      alert(`Successfully invested $${investment.actualInvestment.toLocaleString()} for ${investment.shares} shares!`);
    }, 2000);
  };

  const handleToggleWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    // In a real app, this would save to Firebase watchlist
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Check out this property: ${property?.address}`,
        text: `${property?.address}, ${property?.city}, ${property?.state} - $${property?.price.toLocaleString()}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'ending_soon': return 'warning';
      case 'sold_out': return 'error';
      default: return 'default';
    }
  };

  const getClassColor = (propertyClass: string) => {
    switch (propertyClass) {
      case 'A': return '#FFD700';
      case 'B': return '#C0C0C0';
      case 'C': return '#CD7F32';
      default: return theme.palette.primary.main;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  // Error state
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

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Button 
            onClick={() => navigate('/properties')} 
            startIcon={<ArrowBack />}
            variant="outlined"
          >
            Back to Properties
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleToggleWatchlist} color={isInWatchlist ? 'error' : 'default'}>
              {isInWatchlist ? <Favorite /> : <FavoriteBorder />}
            </IconButton>
            <IconButton onClick={handleShare}>
              <Share />
            </IconButton>
          </Box>
        </Box>

        {/* Property Header */}
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={8}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              {formatCurrency(property.price)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                {property.address}, {property.city}, {property.state}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                label={`Class ${property.class}`}
                sx={{
                  backgroundColor: getClassColor(property.class),
                  color: '#000',
                  fontWeight: 700
                }}
              />
              <Chip
                label={property.status.replace('_', ' ').toUpperCase()}
                color={getStatusColor(property.status)}
                variant="outlined"
              />
              <Chip
                label={`${property.region.charAt(0).toUpperCase() + property.region.slice(1)} Region`}
                variant="outlined"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <AccessTime sx={{ fontSize: 20, mr: 1, color: 'warning.main' }} />
                <Typography variant="h6" color="warning.main" fontWeight={600}>
                  {timeRemaining}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Time Remaining
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Property Image */}
          <Card sx={{ mb: 3 }}>
            <Box
              component="img"
              src={property.imageUrl}
              alt={`${property.address}, ${property.city}`}
              onClick={() => setImageDialogOpen(true)}
              sx={{
                width: '100%',
                height: { xs: 250, md: 400 },
                objectFit: 'cover',
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.02)'
                }
              }}
            />
            <IconButton
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
              }}
              onClick={() => setImageDialogOpen(true)}
            >
              <PhotoLibrary />
            </IconButton>
          </Card>

          {/* Property Details Tabs */}
          <Card>
            <Tabs
              value={tabValue}
              onChange={(_, value) => setTabValue(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" />
              <Tab label="Details" />
              <Tab label="Investors" />
              <Tab label="Analytics" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {/* Overview */}
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Property Overview
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Home sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">{property.bedrooms}</Typography>
                      <Typography variant="body2" color="text.secondary">Bedrooms</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Home sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">{property.bathrooms}</Typography>
                      <Typography variant="body2" color="text.secondary">Bathrooms</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Home sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">{property.sqft.toLocaleString()}</Typography>
                      <Typography variant="body2" color="text.secondary">Sq Ft</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <CalendarToday sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">{property.yearBuilt}</Typography>
                      <Typography variant="body2" color="text.secondary">Year Built</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Typography variant="body1" paragraph>
                  {property.description}
                </Typography>

                <Typography variant="h6" gutterBottom>
                  Amenities
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {property.amenities?.map((amenity, index) => (
                    <Chip key={index} label={amenity} variant="outlined" />
                  ))}
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Details */}
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Property Details
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Property Class</Typography>
                    <Typography variant="body1" gutterBottom>Class {property.class}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Region</Typography>
                    <Typography variant="body1" gutterBottom>{property.region}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Property Value</Typography>
                    <Typography variant="body1" gutterBottom>{formatCurrency(property.currentValue)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Rental Yield</Typography>
                    <Typography variant="body1" gutterBottom>{formatPercentage(property.rentalYield)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Total Shares</Typography>
                    <Typography variant="body1" gutterBottom>{property.totalShares?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Available Shares</Typography>
                    <Typography variant="body1" gutterBottom>{property.availableShares?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Share Price</Typography>
                    <Typography variant="body1" gutterBottom>{formatCurrency(property.sharePrice || 0)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Listed Date</Typography>
                    <Typography variant="body1" gutterBottom>
                      {property.createdAt.toDate().toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {/* Mock Investors */}
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Current Investors ({property.mockInvestors.length})
                </Typography>
                
                <List>
                  {property.mockInvestors.map((investor, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar src={investor.avatar} alt={investor.name}>
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={investor.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {investor.sharesOwned} shares • {formatCurrency(investor.investmentAmount)}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Invested {investor.investmentDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              {/* Analytics */}
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Investment Analytics
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="h6">{formatPercentage(property.rentalYield)}</Typography>
                      <Typography variant="body2" color="text.secondary">Annual Yield</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h6">{formatCurrency(property.price / 12 * property.rentalYield)}</Typography>
                      <Typography variant="body2" color="text.secondary">Monthly Income</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </Card>
        </Grid>

        {/* Investment Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Investment Calculator
              </Typography>

              {/* Investment Amount Slider */}
              <Box sx={{ mb: 3 }}>
                <Typography gutterBottom>
                  Investment Amount: {formatCurrency(investmentAmount)}
                </Typography>
                <Slider
                  value={investmentAmount}
                  onChange={(_, value) => setInvestmentAmount(value as number)}
                  min={property.sharePrice || 1000}
                  max={Math.min(50000, (property.availableShares || 1) * (property.sharePrice || 1000))}
                  step={property.sharePrice || 1000}
                  marks={[
                    { value: property.sharePrice || 1000, label: formatCurrency(property.sharePrice || 1000) },
                    { value: Math.min(50000, (property.availableShares || 1) * (property.sharePrice || 1000)), label: 'Max' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatCurrency}
                />
              </Box>

              {/* Investment Summary */}
              {investment && (
                <Box sx={{ mb: 3 }}>
                  <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                    <Typography variant="body2" color="text.secondary">Investment Summary</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Shares</Typography>
                      <Typography variant="body2" fontWeight={600}>{investment.shares}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Total Investment</Typography>
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(investment.actualInvestment)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Expected Annual Return</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {formatCurrency(investment.expectedAnnualReturn)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Expected Monthly Return</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {formatCurrency(investment.expectedMonthlyReturn)}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Investment Button */}
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => setInvestDialogOpen(true)}
                disabled={property.status === 'sold_out'}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                {property.status === 'sold_out' ? 'Sold Out' : 'Invest Now'}
              </Button>

              {/* Property Stats */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Property Statistics
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Available Shares</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {property.availableShares?.toLocaleString()} / {property.totalShares?.toLocaleString()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Share Price</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(property.sharePrice || 0)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total Investment</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(((property.totalShares || 0) - (property.availableShares || 0)) * (property.sharePrice || 0))}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Funding Progress</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(((property.totalShares || 0) - (property.availableShares || 0)) / (property.totalShares || 1) * 100).toFixed(1)}%
                </Typography>
              </Box>

              {/* Progress Bar */}
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: 8,
                    backgroundColor: 'grey.300',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${((property.totalShares || 0) - (property.availableShares || 0)) / (property.totalShares || 1) * 100}%`,
                      height: '100%',
                      backgroundColor: 'primary.main',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Investment Dialog */}
      <Dialog 
        open={investDialogOpen} 
        onClose={() => setInvestDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Invest in {property.address}
          {isMobile && (
            <IconButton
              onClick={() => setInvestDialogOpen(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <ArrowBack />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            You're about to invest in this property. Please review your investment details below.
          </Typography>
          
          {investment && (
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'background.default' }}>
              <Typography variant="h6" gutterBottom>Investment Summary</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Shares</Typography>
                  <Typography variant="h6">{investment.shares}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Investment</Typography>
                  <Typography variant="h6">{formatCurrency(investment.actualInvestment)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Annual Return</Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(investment.expectedAnnualReturn)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Monthly Return</Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(investment.expectedMonthlyReturn)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            🔗 Blockchain Investment: This will create actual transactions on Sepolia testnet with real smart contracts for property investment processing.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setInvestDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvest} 
            variant="contained"
            disabled={investing}
            size="large"
          >
            {investing ? <CircularProgress size={20} /> : `Invest ${formatCurrency(investment?.actualInvestment || 0)}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="img"
            src={property.imageUrl}
            alt={`${property.address}, ${property.city}`}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '80vh',
              objectFit: 'contain'
            }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
}