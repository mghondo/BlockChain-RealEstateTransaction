import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid, 
  CircularProgress, 
  Pagination, 
  Stack,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Paper,
  Collapse,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { FilterList, ExpandMore, ExpandLess, Share, AttachMoney, Search } from '@mui/icons-material';
import { useUserScopedPropertyPool } from '../../hooks/useUserScopedPropertyPool';
import { useAuth } from '../../contexts/AuthContext';
import { PropertyDetailModal } from '../PropertyDetail/PropertyDetailModal';
import { getRentalIncomeDisplay } from '../../utils/rentalCalculations';
import { backfillPropertyTimestamps } from '../../utils/backfillPropertyTimestamps';

export default function FinalPropertyList() {
  const { isAuthenticated } = useAuth();
  const { properties, loading, error, refreshProperties } = useUserScopedPropertyPool();
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['A', 'B', 'C']); // All selected by default
  const [priceRanges, setPriceRanges] = useState<Record<string, number[]>>({
    A: [0, 50000000],
    B: [0, 50000000], 
    C: [0, 50000000]
  }); // Individual price ranges for each class
  const [searchMode, setSearchMode] = useState('total'); // 'total' or 'shares'
  const [numberOfShares, setNumberOfShares] = useState(1); // Number of shares to calculate price for
  const [selectedState, setSelectedState] = useState('all'); // Selected state filter
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null); // Property for modal
  const [modalOpen, setModalOpen] = useState(false); // Modal open state
  const [searchTerm, setSearchTerm] = useState(''); // Search functionality
  
  const PROPERTIES_PER_PAGE = 20;

  // US States mapping for dropdown
  const US_STATES = {
    'all': 'All States',
    'AL': 'Alabama - AL',
    'AK': 'Alaska - AK', 
    'AZ': 'Arizona - AZ',
    'AR': 'Arkansas - AR',
    'CA': 'California - CA',
    'CO': 'Colorado - CO',
    'CT': 'Connecticut - CT',
    'DE': 'Delaware - DE',
    'FL': 'Florida - FL',
    'GA': 'Georgia - GA',
    'HI': 'Hawaii - HI',
    'ID': 'Idaho - ID',
    'IL': 'Illinois - IL',
    'IN': 'Indiana - IN',
    'IA': 'Iowa - IA',
    'KS': 'Kansas - KS',
    'KY': 'Kentucky - KY',
    'LA': 'Louisiana - LA',
    'ME': 'Maine - ME',
    'MD': 'Maryland - MD',
    'MA': 'Massachusetts - MA',
    'MI': 'Michigan - MI',
    'MN': 'Minnesota - MN',
    'MS': 'Mississippi - MS',
    'MO': 'Missouri - MO',
    'MT': 'Montana - MT',
    'NE': 'Nebraska - NE',
    'NV': 'Nevada - NV',
    'NH': 'New Hampshire - NH',
    'NJ': 'New Jersey - NJ',
    'NM': 'New Mexico - NM',
    'NY': 'New York - NY',
    'NC': 'North Carolina - NC',
    'ND': 'North Dakota - ND',
    'OH': 'Ohio - OH',
    'OK': 'Oklahoma - OK',
    'OR': 'Oregon - OR',
    'PA': 'Pennsylvania - PA',
    'RI': 'Rhode Island - RI',
    'SC': 'South Carolina - SC',
    'SD': 'South Dakota - SD',
    'TN': 'Tennessee - TN',
    'TX': 'Texas - TX',
    'UT': 'Utah - UT',
    'VT': 'Vermont - VT',
    'VA': 'Virginia - VA',
    'WA': 'Washington - WA',
    'WV': 'West Virginia - WV',
    'WI': 'Wisconsin - WI',
    'WY': 'Wyoming - WY'
  };


  // Calculate price for comparison (total or per shares)
  const getComparisonPrice = (property: any) => {
    if (searchMode === 'shares') {
      // Each property has 100 total shares, calculate price per specified shares
      const pricePerShare = property.price / 100;
      return pricePerShare * numberOfShares;
    }
    return property.price;
  };

  // Filter properties based on selected criteria
  const filteredProperties = properties.filter(property => {
    const classMatch = selectedClasses.includes(property.class);
    if (!classMatch) return false;
    
    const stateMatch = selectedState === 'all' || property.state === selectedState;
    if (!stateMatch) return false;
    
    const classRange = priceRanges[property.class];
    const comparisonPrice = getComparisonPrice(property);
    const priceMatch = comparisonPrice >= classRange[0] && comparisonPrice <= classRange[1];
    if (!priceMatch) return false;
    
    // Search filter - case insensitive address and city search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const addressLower = (property.address || '').toLowerCase();
      const cityLower = (property.city || '').toLowerCase();
      const searchMatch = addressLower.includes(searchLower) || cityLower.includes(searchLower);
      if (!searchMatch) return false;
    }
    
    return true;
  });

  // Calculate pagination for filtered properties
  const totalPages = Math.ceil(filteredProperties.length / PROPERTIES_PER_PAGE);
  const startIndex = (currentPage - 1) * PROPERTIES_PER_PAGE;
  const endIndex = startIndex + PROPERTIES_PER_PAGE;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClassChange = (className: string) => {
    setSelectedClasses(prev => {
      const newClasses = prev.includes(className)
        ? prev.filter(c => c !== className)
        : [...prev, className];
      setCurrentPage(1); // Reset to page 1 when filters change
      return newClasses;
    });
  };

  const handlePriceRangeChange = (className: string, newValue: number | number[]) => {
    setPriceRanges(prev => ({
      ...prev,
      [className]: newValue as number[]
    }));
    setCurrentPage(1); // Reset to page 1 when filters change
  };

  const resetFilters = () => {
    setSelectedClasses(['A', 'B', 'C']);
    setPriceRanges({
      A: [0, 50000000],
      B: [0, 50000000], 
      C: [0, 50000000]
    });
    setSearchMode('total');
    setNumberOfShares(1);
    setSelectedState('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleSharesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 1;
    const clampedValue = Math.max(1, Math.min(100, value)); // Ensure between 1-100
    setNumberOfShares(clampedValue);
    setCurrentPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to page 1 when search changes
  };

  const handlePropertyClick = (property: any) => {
    setSelectedProperty(property);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProperty(null);
  };

  // Check if property is newly listed (within 30 minutes)
  const isJustListed = (property: any) => {
    if (!property.createdAt) return false;
    
    const now = new Date();
    const createdAt = property.createdAt.toDate ? property.createdAt.toDate() : new Date(property.createdAt);
    const timeDiff = now.getTime() - createdAt.getTime();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    return timeDiff < thirtyMinutes;
  };

  const toggleSelectAll = () => {
    if (selectedClasses.length === 3) {
      // If all are selected, select none
      setSelectedClasses([]);
    } else {
      // If some or none are selected, select all
      setSelectedClasses(['A', 'B', 'C']);
    }
    setCurrentPage(1);
  };

  // Calculate price range bounds based on selected classes
  const getClassPrices = (className: string) => {
    return properties.filter(p => p.class === className).map(p => {
      const price = p.price || 0;
      return searchMode === 'shares' ? (price / 100) * numberOfShares : price;
    });
  };

  const selectedClassPrices = selectedClasses.length > 0 
    ? selectedClasses.flatMap(className => getClassPrices(className))
    : properties.map(p => p.price || 0);

  const minPrice = selectedClassPrices.length > 0 ? Math.min(...selectedClassPrices) : 0;
  const maxPrice = selectedClassPrices.length > 0 ? Math.max(...selectedClassPrices) : 50000000;

  // Get individual class ranges for marks
  const getClassRanges = () => {
    if (selectedClasses.length === 0) return [];
    
    return selectedClasses.map(className => {
      const classPrices = getClassPrices(className);
      if (classPrices.length === 0) return null;
      
      return {
        class: className,
        min: Math.min(...classPrices),
        max: Math.max(...classPrices),
        color: className === 'A' ? '#FFD700' : className === 'B' ? '#C0C0C0' : '#CD7F32'
      };
    }).filter(Boolean);
  };

  const classRanges = getClassRanges();

  // Show authentication prompt if user is not logged in
  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          🔐 Please Sign In
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You need to be signed in to view your property portfolio.
        </Typography>
      </Box>
    );
  }

  useEffect(() => {
    // Initialize individual class price ranges when properties load or search mode changes
    if (properties.length > 0) {
      const newRanges: Record<string, number[]> = {};
      
      ['A', 'B', 'C'].forEach(className => {
        const classPrices = getClassPrices(className);
        if (classPrices.length > 0) {
          newRanges[className] = [Math.min(...classPrices), Math.max(...classPrices)];
        } else {
          const defaultMax = searchMode === 'shares' ? 500000 : 50000000;
          newRanges[className] = [0, defaultMax];
        }
      });
      
      setPriceRanges(newRanges);
    }
  }, [properties, searchMode, numberOfShares]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading properties...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" color="error" gutterBottom>Error: {error}</Typography>
        <Button variant="contained" onClick={refreshProperties}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🏠 FracEstate Property Marketplace
      </Typography>
      
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search properties by address or city (e.g., '123', 'Main St', 'Denver', 'Miami')..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 600,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
            },
          }}
        />
        {searchTerm && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Searching for: "{searchTerm}"
          </Typography>
        )}
      </Box>
      
      {/* Filter Toggle and Results */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            {filteredProperties.length} Properties Available
            {(filteredProperties.length !== properties.length || searchTerm.trim()) && (
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                {searchTerm.trim() ? 
                  `(${filteredProperties.length} matching "${searchTerm}" from ${properties.length} total)` :
                  `(filtered from ${properties.length} total)`
                }
              </Typography>
            )}
          </Typography>
          {filteredProperties.length > PROPERTIES_PER_PAGE && (
            <Typography variant="body2" color="text.secondary">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} of {filteredProperties.length}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<FilterList />}
            endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </Box>
      </Box>

      {/* Filter Panel */}
      <Collapse in={showFilters}>
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          {/* Search Mode and State Filter Dropdowns */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(0, 212, 255, 0.05)', borderRadius: 2 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Search Mode</InputLabel>
                  <Select
                    value={searchMode}
                    label="Search Mode"
                    onChange={(e) => {
                      setSearchMode(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <MenuItem value="total">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AttachMoney sx={{ mr: 1, fontSize: 20 }} />
                        <Typography>Total Purchase Price</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="shares">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Share sx={{ mr: 1, fontSize: 20 }} />
                        <Typography>Price by Shares</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>State</InputLabel>
                  <Select
                    value={selectedState}
                    label="State"
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {Object.entries(US_STATES).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        <Typography>{label}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {searchMode === 'shares' && (
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Number of Shares"
                    type="number"
                    value={numberOfShares}
                    onChange={handleSharesChange}
                    size="small"
                    inputProps={{ 
                      min: 1, 
                      max: 100,
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
                    helperText="Max 100 shares per property"
                    sx={{ minWidth: 200 }}
                  />
                </Grid>
              )}
            </Grid>
          </Box>

          <Grid container spacing={3}>
            {/* Property Class Filters */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Property Class
              </Typography>
              <FormGroup row>
                {['A', 'B', 'C'].map((className) => (
                  <FormControlLabel
                    key={className}
                    control={
                      <Checkbox
                        checked={selectedClasses.includes(className)}
                        onChange={() => handleClassChange(className)}
                        sx={{
                          color: 
                            className === 'A' ? '#FFD700' :
                            className === 'B' ? '#C0C0C0' : '#CD7F32',
                          '&.Mui-checked': {
                            color: 
                              className === 'A' ? '#FFD700' :
                              className === 'B' ? '#C0C0C0' : '#CD7F32',
                          }
                        }}
                      />
                    }
                    label={
                      <Box sx={{
                        backgroundColor: 
                          className === 'A' ? '#FFD700' :
                          className === 'B' ? '#C0C0C0' : '#CD7F32',
                        color: '#000',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}>
                        Class {className}
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
              <Button 
                variant="outlined" 
                size="small"
                onClick={toggleSelectAll}
                sx={{ 
                  mt: 2,
                  borderRadius: '10px',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)'
                  }
                }}
              >
                {selectedClasses.length === 3 ? 'Select None' : 'Select All'}
              </Button>
            </Grid>

            {/* Price Range Filters */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {searchMode === 'shares' ? `Price for ${numberOfShares} Share${numberOfShares !== 1 ? 's' : ''}` : 'Total Property Price'}
                {selectedClasses.length > 0 && (
                  <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                    ({selectedClasses.length} class{selectedClasses.length !== 1 ? 'es' : ''} selected)
                  </Typography>
                )}
              </Typography>
              
              {/* Individual Price Sliders for Each Selected Class */}
              {selectedClasses.length > 0 ? (
                <Stack spacing={3}>
                  {selectedClasses.map((className) => {
                    const classPrices = getClassPrices(className);
                    const classMin = classPrices.length > 0 ? Math.min(...classPrices) : 0;
                    const classMax = classPrices.length > 0 ? Math.max(...classPrices) : 50000000;
                    const classColor = className === 'A' ? '#FFD700' : className === 'B' ? '#C0C0C0' : '#CD7F32';
                    
                    return (
                      <Box key={className}>
                        {/* Class Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{
                            backgroundColor: classColor,
                            color: '#000',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            mr: 2
                          }}>
                            Class {className}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {searchMode === 'shares' ? (
                              classMin >= 1000000 ? 
                                `$${(classMin / 1000000).toFixed(1)}M - $${(classMax / 1000000).toFixed(1)}M` :
                                `$${(classMin / 1000).toFixed(0)}K - $${(classMax / 1000).toFixed(0)}K`
                            ) : (
                              `$${(classMin / 1000000).toFixed(1)}M - $${(classMax / 1000000).toFixed(1)}M`
                            )}
                          </Typography>
                        </Box>
                        
                        {/* Individual Class Slider */}
                        <Box sx={{ px: 2 }}>
                          <Slider
                            value={priceRanges[className] || [classMin, classMax]}
                            onChange={(event, newValue) => handlePriceRangeChange(className, newValue)}
                            valueLabelDisplay="auto"
                            min={classMin}
                            max={classMax}
                            step={Math.max(10000, Math.floor((classMax - classMin) / 100))}
                            valueLabelFormat={(value) => 
                              searchMode === 'shares' ? (
                                value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`
                              ) : `$${(value / 1000000).toFixed(1)}M`
                            }
                            marks={[
                              { 
                                value: classMin, 
                                label: searchMode === 'shares' ? (
                                  classMin >= 1000000 ? `$${(classMin / 1000000).toFixed(1)}M` : `$${(classMin / 1000).toFixed(0)}K`
                                ) : `$${(classMin / 1000000).toFixed(1)}M`
                              },
                              { 
                                value: classMax, 
                                label: searchMode === 'shares' ? (
                                  classMax >= 1000000 ? `$${(classMax / 1000000).toFixed(1)}M` : `$${(classMax / 1000).toFixed(0)}K`
                                ) : `$${(classMax / 1000000).toFixed(1)}M`
                              }
                            ]}
                            sx={{ 
                              color: classColor,
                              '& .MuiSlider-thumb': {
                                backgroundColor: classColor,
                              },
                              '& .MuiSlider-track': {
                                backgroundColor: classColor,
                              },
                              '& .MuiSlider-rail': {
                                opacity: 0.3,
                              }
                            }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                              Selected: ${(priceRanges[className]?.[0] || classMin).toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                              to ${(priceRanges[className]?.[1] || classMax).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Select property classes to see price range filters
                </Typography>
              )}
            </Grid>

            {/* Filter Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  {filteredProperties.length} of {properties.length} properties match your filters
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      <Grid container spacing={3}>
        {currentProperties.map((property, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={property.id || index}>
            <Card 
              onClick={() => handlePropertyClick(property)}
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme => theme.shadows[8],
                }
              }}
            >
              {/* Property Image */}
              {property.imageUrl && (
                <Box
                  component="img"
                  src={property.imageUrl}
                  alt="Property"
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                {/* Price Display */}
                {searchMode === 'shares' ? (
                  <Box>
                    {/* Total Property Price - Always shown prominently */}
                    <Typography variant="h6" gutterBottom color="primary.main" sx={{ fontWeight: 700 }}>
                      ${(property.price || 0).toLocaleString()}
                    </Typography>
                    {/* Price for Selected Shares - Below total price */}
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                      Price for {numberOfShares} Share{numberOfShares !== 1 ? 's' : ''}: ${Math.round((property.price || 0) / 100 * numberOfShares).toLocaleString()}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="h6" gutterBottom color="primary.main" sx={{ fontWeight: 700 }}>
                    ${(property.price || 0).toLocaleString()}
                  </Typography>
                )}
                
                {/* Address */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {property.address || 'Address N/A'}
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  {property.city || 'City'}, {property.state || 'State'}
                </Typography>
                
                {/* Property Details */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ 
                      backgroundColor: 
                        property.class === 'A' ? '#FFD700' :
                        property.class === 'B' ? '#C0C0C0' : '#CD7F32',
                      color: '#000',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontWeight: 600
                    }}>
                      Class {property.class || '?'}
                    </Typography>
                    
                    {/* Just Listed Badge */}
                    {isJustListed(property) && (
                      <Typography variant="caption" sx={{
                        backgroundColor: '#ff4444',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.7 },
                          '100%': { opacity: 1 }
                        }
                      }}>
                        🆕 JUST LISTED
                      </Typography>
                    )}
                  </Box>
                  
                  <Typography variant="body2" color={
                    property.status === 'available' ? 'success.main' :
                    property.status === 'ending_soon' ? 'warning.main' :
                    'success.main'
                  }>
                    {property.status === 'available' ? 'Available' :
                     property.status === 'ending_soon' ? 'Ending Soon' :
                     'Available'}
                  </Typography>
                </Box>
                
                {/* Beds/Baths/Sqft */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {property.bedrooms || 0}bd • {property.bathrooms || 0}ba • {(property.sqft || 0).toLocaleString()} sqft
                </Typography>
                
                {/* Year Built */}
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Built {property.yearBuilt || 'Unknown'}
                </Typography>

                
                {/* Rental Yield */}
                {property.rentalYield && (
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    {(property.rentalYield * 100).toFixed(1)}% Annual Yield
                  </Typography>
                )}

                {/* Monthly Rental Income */}
                {property.rentalYield && (
                  <>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      {getRentalIncomeDisplay(property.price || 0, property.rentalYield, 'total', 100)}
                    </Typography>
                    {searchMode === 'shares' && (
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {getRentalIncomeDisplay(property.price || 0, property.rentalYield, searchMode, numberOfShares)}
                      </Typography>
                    )}
                  </>
                )}
                
                {/* Region */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {property.region || 'Unknown'} Region
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Stack spacing={2} alignItems="center" sx={{ mt: 4, mb: 2 }}>
          <Pagination 
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
          <Typography variant="body2" color="text.secondary">
            Page {currentPage} of {totalPages}
          </Typography>
        </Stack>
      )}
      
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
        🎉 FracEstate Phase 1 - Property Generation & Marketplace System
      </Typography>

      {/* Property Detail Modal */}
      <PropertyDetailModal
        open={modalOpen}
        onClose={handleModalClose}
        property={selectedProperty}
        searchMode={searchMode}
        numberOfShares={numberOfShares}
      />
    </Box>
  );
}