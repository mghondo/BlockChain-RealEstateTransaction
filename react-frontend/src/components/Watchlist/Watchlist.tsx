import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  FavoriteBorder,
  Delete,
  Share,
  Clear,
  Favorite,
  TrendingUp,
  LocationOn,
  AttachMoney,
  BarChart,
  PieChart
} from '@mui/icons-material';
import { useWatchlistWithProperties, useWatchlistStats } from '../../hooks/useWatchlist';
import FracEstatePropertyCard from '../PropertyCard/FracEstatePropertyCard';
import { Property } from '../../types/property';

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
      id={`watchlist-tabpanel-${index}`}
      aria-labelledby={`watchlist-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Watchlist() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    watchedProperties,
    propertiesLoading,
    loading: watchlistLoading,
    error,
    removeFromWatchlist,
    clearWatchlist,
    getWatchlistCount
  } = useWatchlistWithProperties();
  
  const { stats, loading: statsLoading } = useWatchlistStats();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [removingProperty, setRemovingProperty] = useState<string | null>(null);

  const handleRemoveProperty = async (propertyId: string) => {
    try {
      setRemovingProperty(propertyId);
      await removeFromWatchlist(propertyId);
    } catch (error) {
      console.error('Failed to remove property:', error);
    } finally {
      setRemovingProperty(null);
    }
  };

  const handleClearWatchlist = async () => {
    try {
      await clearWatchlist();
      setClearDialogOpen(false);
    } catch (error) {
      console.error('Failed to clear watchlist:', error);
    }
  };

  const handleShareProperty = (property: Property) => {
    if (navigator.share) {
      navigator.share({
        title: `Check out this property: ${property.address}`,
        text: `${property.address}, ${property.city}, ${property.state} - $${property.price.toLocaleString()}`,
        url: `${window.location.origin}/property/${property.id}`
      });
    } else {
      const url = `${window.location.origin}/property/${property.id}`;
      navigator.clipboard.writeText(url);
      // You could show a toast notification here
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

  // Loading state
  if (watchlistLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              My Watchlist
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {getWatchlistCount()} {getWatchlistCount() === 1 ? 'property' : 'properties'} saved
            </Typography>
          </Box>
          
          {getWatchlistCount() > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Clear />}
              onClick={() => setClearDialogOpen(true)}
            >
              Clear All
            </Button>
          )}
        </Box>
      </Box>

      {/* Empty State */}
      {getWatchlistCount() === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <FavoriteBorder sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Your Watchlist is Empty
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Save properties you're interested in to your watchlist for easy access later.
          </Typography>
          <Button
            variant="contained"
            href="/properties"
            size="large"
          >
            Browse Properties
          </Button>
        </Box>
      )}

      {/* Content */}
      {getWatchlistCount() > 0 && (
        <>
          {/* Tabs */}
          <Card sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={(_, value) => setTabValue(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`Properties (${watchedProperties.length})`} />
              <Tab label="Statistics" />
            </Tabs>
          </Card>

          {/* Properties Tab */}
          <TabPanel value={tabValue} index={0}>
            {propertiesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {watchedProperties.map((property) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={property.id}>
                    <Box sx={{ position: 'relative' }}>
                      <FracEstatePropertyCard
                        property={property}
                        isInWatchlist={true}
                        onToggleWatchlist={() => handleRemoveProperty(property.id)}
                        onShare={() => handleShareProperty(property)}
                      />
                      
                      {/* Remove Button Overlay */}
                      <IconButton
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          },
                          zIndex: 1
                        }}
                        size="small"
                        onClick={() => handleRemoveProperty(property.id)}
                        disabled={removingProperty === property.id}
                      >
                        {removingProperty === property.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Delete color="error" />
                        )}
                      </IconButton>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* Statistics Tab */}
          <TabPanel value={tabValue} index={1}>
            {statsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Overview Stats */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Portfolio Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main">
                          {stats.totalProperties}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Properties
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {formatCurrency(stats.totalValue)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Value
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                          {formatCurrency(stats.averagePrice)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Price
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                          {formatPercentage(stats.averageRentalYield)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg. Yield
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Income Projection */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="h6">
                          Income Projection
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Estimated Annual Income
                        </Typography>
                        <Typography variant="h5" color="success.main">
                          {formatCurrency(stats.estimatedAnnualIncome)}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Estimated Monthly Income
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(stats.estimatedAnnualIncome / 12)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        * Based on current rental yields and property values
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Distribution Charts */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BarChart sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">
                          Distribution
                        </Typography>
                      </Box>
                      
                      {/* Class Distribution */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          By Property Class
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {Object.entries(stats.classDistribution).map(([className, count]) => (
                            <Chip
                              key={className}
                              label={`Class ${className}: ${count}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>

                      {/* Status Distribution */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          By Status
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {Object.entries(stats.statusDistribution).map(([status, count]) => (
                            <Chip
                              key={status}
                              label={`${status.replace('_', ' ')}: ${count}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>

                      {/* Region Distribution */}
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          By Region
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {Object.entries(stats.regionDistribution).map(([region, count]) => (
                            <Chip
                              key={region}
                              label={`${region}: ${count}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </>
      )}

      {/* Clear Watchlist Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clear Watchlist</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove all properties from your watchlist? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleClearWatchlist}
            color="error"
            variant="contained"
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}