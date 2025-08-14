import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Slider,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  Drawer,
  useTheme,
  useMediaQuery,
  Autocomplete,
  Switch,
  FormControlLabel,
  Divider,
  Collapse,
  Tab,
  Tabs
} from '@mui/material';
import {
  Search,
  Clear,
  Refresh,
  Home,
  SearchOff,
  FilterList,
  GridView,
  ViewList,
  Sort,
  Close,
  ExpandMore,
  ExpandLess,
  TrendingUp,
  LocationOn,
  Schedule
} from '@mui/icons-material';
import { Property, PropertyFilters, PropertySortOptions, PropertyClass, PropertyRegion, PropertyStatus } from '../../types/property';
import { propertyService } from '../../services/firebaseService';
import FracEstatePropertyCard from '../PropertyCard/FracEstatePropertyCard';
import { STATE_REGION_MAPPING } from '../../utils/propertyGenerator';

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

export default function FracEstatePropertyList() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debug logging
  console.log('FracEstatePropertyList render:', { 
    propertiesCount: properties.length, 
    filteredCount: filteredProperties.length, 
    loading, 
    error 
  });
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState<PropertyFilters>({
    class: [],
    priceRange: { min: 0, max: 50000000 },
    region: [],
    status: ['available', 'ending_soon'],
    rentalYieldRange: { min: 0, max: 0.15 }
  });
  
  const [sortOptions, setSortOptions] = useState<PropertySortOptions>({
    field: 'createdAt',
    direction: 'desc'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load properties
  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const propertiesData = await propertyService.getProperties(filters, sortOptions);
      setProperties(propertiesData);
    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, sortOptions]);

  // Real-time property updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (autoRefresh) {
      unsubscribe = propertyService.subscribeToProperties(
        (updatedProperties) => {
          setProperties(updatedProperties);
        },
        filters,
        sortOptions
      );
    } else {
      loadProperties();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [filters, sortOptions, autoRefresh, loadProperties]);

  // Apply search and client-side filters
  useEffect(() => {
    let filtered = [...properties];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property => 
        property.address.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query) ||
        property.state.toLowerCase().includes(query) ||
        property.class.toLowerCase().includes(query)
      );
    }

    // Apply tab filters
    switch (tabValue) {
      case 0: // All properties
        break;
      case 1: // Available
        filtered = filtered.filter(p => p.status === 'available');
        break;
      case 2: // Ending soon
        filtered = filtered.filter(p => p.status === 'ending_soon');
        break;
      case 3: // Watchlist
        filtered = filtered.filter(p => watchlist.has(p.id));
        break;
    }

    setFilteredProperties(filtered);
  }, [properties, searchQuery, tabValue, watchlist]);

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSortChange = (newSort: Partial<PropertySortOptions>) => {
    setSortOptions(prev => ({ ...prev, ...newSort }));
  };

  const clearFilters = () => {
    setFilters({
      class: [],
      priceRange: { min: 0, max: 50000000 },
      region: [],
      status: ['available', 'ending_soon'],
      rentalYieldRange: { min: 0, max: 0.15 }
    });
    setSearchQuery('');
    setTabValue(0);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.class && filters.class.length > 0 ||
      filters.region && filters.region.length > 0 ||
      filters.status && filters.status.length < 3 ||
      filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max < 50000000) ||
      filters.rentalYieldRange && (filters.rentalYieldRange.min > 0 || filters.rentalYieldRange.max < 0.15) ||
      searchQuery.trim() !== ''
    );
  }, [filters, searchQuery]);

  // Watchlist handlers
  const handleToggleWatchlist = (property: Property) => {
    setWatchlist(prev => {
      const newWatchlist = new Set(prev);
      if (newWatchlist.has(property.id)) {
        newWatchlist.delete(property.id);
      } else {
        newWatchlist.add(property.id);
      }
      return newWatchlist;
    });
  };

  const handleShare = (property: Property) => {
    if (navigator.share) {
      navigator.share({
        title: `Check out this property: ${property.address}`,
        text: `${property.address}, ${property.city}, ${property.state} - $${property.price.toLocaleString()}`,
        url: window.location.href
      });
    } else {
      // Fallback to clipboard
      const url = `${window.location.origin}/property/${property.id}`;
      navigator.clipboard.writeText(url);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get unique states for filter dropdown
  const availableStates = useMemo(() => {
    const states = new Set(properties.map(p => p.state));
    return Array.from(states).sort();
  }, [properties]);

  // Property counts by status
  const propertyCounts = useMemo(() => {
    const counts = {
      all: properties.length,
      available: properties.filter(p => p.status === 'available').length,
      ending_soon: properties.filter(p => p.status === 'ending_soon').length,
      watchlist: Array.from(watchlist).length
    };
    return counts;
  }, [properties, watchlist]);

  // Filter Panel Component
  const FilterPanel = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Filters</Typography>
        {isMobile && (
          <IconButton onClick={() => setFilterDrawerOpen(false)}>
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Property Class Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Property Class</InputLabel>
        <Select
          multiple
          value={filters.class || []}
          label="Property Class"
          onChange={(e) => handleFilterChange({ class: e.target.value as PropertyClass[] })}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as PropertyClass[]).map((value) => (
                <Chip key={value} label={`Class ${value}`} size="small" />
              ))}
            </Box>
          )}
        >
          <MenuItem value="A">Class A (Premium)</MenuItem>
          <MenuItem value="B">Class B (Mid-tier)</MenuItem>
          <MenuItem value="C">Class C (Entry-level)</MenuItem>
        </Select>
      </FormControl>

      {/* Region Filter */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Region</InputLabel>
        <Select
          multiple
          value={filters.region || []}
          label="Region"
          onChange={(e) => handleFilterChange({ region: e.target.value as PropertyRegion[] })}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as PropertyRegion[]).map((value) => (
                <Chip key={value} label={value.charAt(0).toUpperCase() + value.slice(1)} size="small" />
              ))}
            </Box>
          )}
        >
          <MenuItem value="southeast">Southeast</MenuItem>
          <MenuItem value="southwest">Southwest</MenuItem>
          <MenuItem value="midwest">Midwest</MenuItem>
          <MenuItem value="northwest">Northwest</MenuItem>
          <MenuItem value="anywhere">Anywhere</MenuItem>
        </Select>
      </FormControl>

      {/* State Filter */}
      <Autocomplete
        multiple
        options={availableStates}
        value={[]} // This would need to be managed in state
        onChange={(_, value) => {
          // Filter properties by selected states
          // This would require extending the filter system
        }}
        renderInput={(params) => (
          <TextField {...params} label="States" placeholder="Select states" />
        )}
        sx={{ mb: 3 }}
      />

      {/* Price Range */}
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Price Range: {formatCurrency(filters.priceRange?.min || 0)} - {formatCurrency(filters.priceRange?.max || 50000000)}
        </Typography>
        <Slider
          value={[filters.priceRange?.min || 0, filters.priceRange?.max || 50000000]}
          onChange={(_, value) => {
            const [min, max] = value as number[];
            handleFilterChange({ priceRange: { min, max } });
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={formatCurrency}
          min={0}
          max={50000000}
          step={100000}
        />
      </Box>

      {/* Rental Yield Range */}
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>
          Rental Yield: {((filters.rentalYieldRange?.min || 0) * 100).toFixed(1)}% - {((filters.rentalYieldRange?.max || 0.15) * 100).toFixed(1)}%
        </Typography>
        <Slider
          value={[filters.rentalYieldRange?.min || 0, filters.rentalYieldRange?.max || 0.15]}
          onChange={(_, value) => {
            const [min, max] = value as number[];
            handleFilterChange({ rentalYieldRange: { min, max } });
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
          min={0}
          max={0.15}
          step={0.005}
        />
      </Box>

      {/* Sort Options */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>Sort</Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Sort by</InputLabel>
        <Select
          value={sortOptions.field}
          label="Sort by"
          onChange={(e) => handleSortChange({ field: e.target.value as any })}
        >
          <MenuItem value="createdAt">Date Listed</MenuItem>
          <MenuItem value="price">Price</MenuItem>
          <MenuItem value="rentalYield">Rental Yield</MenuItem>
          <MenuItem value="timeRemaining">Time Remaining</MenuItem>
          <MenuItem value="sqft">Square Footage</MenuItem>
        </Select>
      </FormControl>

      <ToggleButtonGroup
        value={sortOptions.direction}
        exclusive
        onChange={(_, value) => value && handleSortChange({ direction: value })}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="asc">Ascending</ToggleButton>
        <ToggleButton value="desc">Descending</ToggleButton>
      </ToggleButtonGroup>

      {/* Clear Filters */}
      <Button
        variant="outlined"
        fullWidth
        onClick={clearFilters}
        startIcon={<Clear />}
        disabled={!hasActiveFilters}
      >
        Clear All Filters
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Property Marketplace
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body1" color="text.secondary">
            {filteredProperties.length} of {properties.length} properties
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-refresh"
            />
            <IconButton onClick={loadProperties} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Search and View Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              variant="outlined"
              label="Search properties"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
              }}
              placeholder="Search by address, city, state, or class"
              sx={{ flexGrow: 1, minWidth: 300 }}
            />
            
            {!isMobile && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, value) => value && setViewMode(value)}
              >
                <ToggleButton value="grid">
                  <GridView />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            )}

            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => isMobile ? setFilterDrawerOpen(true) : setFiltersExpanded(!filtersExpanded)}
            >
              Filters
              {isMobile ? null : (filtersExpanded ? <ExpandLess /> : <ExpandMore />)}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Desktop Filters */}
      {!isMobile && (
        <Collapse in={filtersExpanded}>
          <Card sx={{ mb: 3 }}>
            <FilterPanel />
          </Card>
        </Collapse>
      )}

      {/* Mobile Filter Drawer */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        sx={{ display: { md: 'none' } }}
      >
        <Box sx={{ width: 320 }}>
          <FilterPanel />
        </Box>
      </Drawer>

      {/* Property Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, value) => setTabValue(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={`All (${propertyCounts.all})`} />
          <Tab label={`Available (${propertyCounts.available})`} />
          <Tab label={`Ending Soon (${propertyCounts.ending_soon})`} />
          <Tab label={`Watchlist (${propertyCounts.watchlist})`} />
        </Tabs>
      </Card>

      {/* Active Filters */}
      {hasActiveFilters && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {searchQuery && (
              <Chip
                label={`Search: ${searchQuery}`}
                onDelete={() => setSearchQuery('')}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.class && filters.class.length > 0 && (
              <Chip
                label={`Class: ${filters.class.join(', ')}`}
                onDelete={() => handleFilterChange({ class: [] })}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.region && filters.region.length > 0 && (
              <Chip
                label={`Region: ${filters.region.join(', ')}`}
                onDelete={() => handleFilterChange({ region: [] })}
                color="primary"
                variant="outlined"
              />
            )}
            <Button size="small" onClick={clearFilters} startIcon={<Clear />}>
              Clear All
            </Button>
          </Box>
        </Box>
      )}

      {/* Content */}
      <TabPanel value={tabValue} index={tabValue}>
        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Loading properties...
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <Typography variant="h6" color="error" gutterBottom>
              {error}
            </Typography>
            <Button variant="contained" onClick={loadProperties} startIcon={<Refresh />}>
              Try Again
            </Button>
          </Box>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProperties.length === 0 && properties.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <Home sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Properties Available
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              There are currently no properties available for investment.
            </Typography>
            <Button variant="contained" onClick={loadProperties} startIcon={<Refresh />}>
              Refresh
            </Button>
          </Box>
        )}

        {/* No Results State */}
        {!loading && !error && filteredProperties.length === 0 && properties.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <SearchOff sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No Properties Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              No properties match your current filters. Try adjusting your search criteria.
            </Typography>
            <Button variant="outlined" onClick={clearFilters} startIcon={<Clear />}>
              Clear All Filters
            </Button>
          </Box>
        )}

        {/* Properties Grid */}
        {!loading && !error && filteredProperties.length > 0 && (
          <Grid container spacing={3}>
            {filteredProperties.map((property) => (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={viewMode === 'grid' ? 4 : 12} 
                lg={viewMode === 'grid' ? 3 : 12} 
                key={property.id}
              >
                <FracEstatePropertyCard
                  property={property}
                  isInWatchlist={watchlist.has(property.id)}
                  onToggleWatchlist={handleToggleWatchlist}
                  onShare={handleShare}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setFilterDrawerOpen(true)}
        >
          <FilterList />
        </Fab>
      )}
    </Box>
  );
}