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
  Divider,
  IconButton
} from '@mui/material';
import {
  Search,
  Clear,
  Refresh,
  Home,
  SearchOff
} from '@mui/icons-material';
import { useContracts } from '../../hooks/useContracts';
import { PropertyDetails } from '../../types/web3';
import PropertyCard from '../PropertyCard/PropertyCard';
import { ethers } from 'ethers';

interface PropertyFilters {
  searchTerm: string;
  priceRange: { min: number; max: number };
  statusFilter: string;
  sortBy: 'price' | 'funding' | 'shares' | 'newest';
  sortOrder: 'asc' | 'desc';
}

export default function PropertyList() {
  const { getPropertyDetails } = useContracts();
  
  const [allProperties, setAllProperties] = useState<Array<{ property: PropertyDetails; address: string }>>([]);
  const [filteredProperties, setFilteredProperties] = useState<Array<{ property: PropertyDetails; address: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PropertyFilters>({
    searchTerm: '',
    priceRange: { min: 0, max: 2000000 },
    statusFilter: '',
    sortBy: 'newest',
    sortOrder: 'desc'
  });

  const pageSize = 12;
  const [priceRange] = useState({ min: 0, max: 2000000 });

  // Mock property addresses - in a real app, these would come from your contract registry
  const propertyAddresses = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
    '0x3456789012345678901234567890123456789012',
    '0x4567890123456789012345678901234567890123',
    '0x5678901234567890123456789012345678901234'
  ];

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const propertyPromises = propertyAddresses.map(async (address) => {
        const property = await getPropertyDetails(address);
        return property ? { property, address } : null;
      });

      const results = await Promise.all(propertyPromises);
      const validProperties = results.filter((p): p is { property: PropertyDetails; address: string } => p !== null);
      
      setAllProperties(validProperties);
    } catch (error) {
      console.error('Failed to load properties:', error);
      setAllProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, [getPropertyDetails]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const applyFilters = useCallback(() => {
    let filtered = [...allProperties];

    // Apply search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(({ property }) => {
        return (
          property.config.nftID.toString().includes(searchTerm) ||
          property.config.seller.toLowerCase().includes(searchTerm) ||
          property.currentPhase.name.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply status filter
    if (filters.statusFilter) {
      const statusId = parseInt(filters.statusFilter);
      filtered = filtered.filter(({ property }) => property.currentPhase.id === statusId);
    }

    // Apply price range filter
    filtered = filtered.filter(({ property }) => {
      const price = Number(ethers.formatUnits(property.config.purchasePrice, 6));
      return price >= filters.priceRange.min && price <= filters.priceRange.max;
    });

    // Apply sorting
    filtered = filtered.sort(({ property: a }, { property: b }) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'price':
          comparison = Number(a.config.purchasePrice) - Number(b.config.purchasePrice);
          break;
        case 'funding':
          const aFunding = Number(a.totalEarnestDeposited) / Number(a.config.escrowAmount) || 0;
          const bFunding = Number(b.totalEarnestDeposited) / Number(b.config.escrowAmount) || 0;
          comparison = aFunding - bFunding;
          break;
        case 'shares':
          comparison = a.availableShares - b.availableShares;
          break;
        case 'newest':
        default:
          comparison = Number(b.currentPhase.timestamp) - Number(a.currentPhase.timestamp);
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(0, startIndex + pageSize);
    
    setFilteredProperties(paginated);
  }, [allProperties, filters, currentPage]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      priceRange: { ...priceRange },
      statusFilter: '',
      sortBy: 'newest',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const removeFilter = (filterType: string) => {
    switch (filterType) {
      case 'search':
        handleFilterChange('searchTerm', '');
        break;
      case 'status':
        handleFilterChange('statusFilter', '');
        break;
      case 'price':
        handleFilterChange('priceRange', { ...priceRange });
        break;
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' || 
      filters.statusFilter !== '' || 
      filters.priceRange.min !== priceRange.min || 
      filters.priceRange.max !== priceRange.max
    );
  }, [filters, priceRange]);

  const getStatusLabel = (statusId: string): string => {
    const labels: Record<string, string> = {
      '0': 'Available for Investment',
      '1': 'Under Inspection',
      '2': 'Pending Approval',
      '3': 'Funding Complete',
      '4': 'Completed',
      '5': 'Cancelled'
    };
    return labels[statusId] || 'Unknown';
  };

  const formatCurrency = (value: number): string => {
    return '$' + value.toLocaleString('en-US');
  };

  const canLoadMore = (): boolean => {
    const totalFiltered = allProperties.filter(({ property }) => {
      // Simplified filter check
      return true;
    }).length;
    return filteredProperties.length < totalFiltered && !isLoading;
  };

  const loadMoreProperties = () => {
    setIsLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    
    setTimeout(() => {
      setIsLoadingMore(false);
    }, 1000);
  };

  const handlePropertyAction = (action: 'view' | 'invest', property: PropertyDetails, address: string) => {
    console.log(`${action} property:`, property, 'at address:', address);
    // Implement navigation or modal opening logic here
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Available Properties
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {filteredProperties.length} of {allProperties.length} properties
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                variant="outlined"
                label="Search properties"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
                }}
                placeholder="Search by ID, seller, or status"
              />
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.statusFilter}
                  label="Status"
                  onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="0">Available for Investment</MenuItem>
                  <MenuItem value="1">Under Inspection</MenuItem>
                  <MenuItem value="2">Pending Approval</MenuItem>
                  <MenuItem value="3">Funding Complete</MenuItem>
                  <MenuItem value="4">Completed</MenuItem>
                  <MenuItem value="5">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort By */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="Sort by"
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="price">Price</MenuItem>
                  <MenuItem value="funding">Funding Progress</MenuItem>
                  <MenuItem value="shares">Available Shares</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort Order */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={filters.sortOrder}
                  label="Order"
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Clear Filters */}
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  startIcon={<Clear />}
                  disabled={!hasActiveFilters}
                >
                  Clear Filters
                </Button>
                <IconButton onClick={loadProperties} disabled={isLoading}>
                  <Refresh />
                </IconButton>
              </Box>
            </Grid>

            {/* Price Range Slider */}
            <Grid item xs={12}>
              <Typography gutterBottom>
                Price Range: {formatCurrency(filters.priceRange.min)} - {formatCurrency(filters.priceRange.max)}
              </Typography>
              <Slider
                value={[filters.priceRange.min, filters.priceRange.max]}
                onChange={(_, value) => {
                  const [min, max] = value as number[];
                  handleFilterChange('priceRange', { min, max });
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={formatCurrency}
                min={priceRange.min}
                max={priceRange.max}
                step={10000}
                marks={[
                  { value: priceRange.min, label: formatCurrency(priceRange.min) },
                  { value: priceRange.max, label: formatCurrency(priceRange.max) }
                ]}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {hasActiveFilters && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {filters.searchTerm && (
              <Chip
                label={`Search: ${filters.searchTerm}`}
                onDelete={() => removeFilter('search')}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.statusFilter && (
              <Chip
                label={`Status: ${getStatusLabel(filters.statusFilter)}`}
                onDelete={() => removeFilter('status')}
                color="primary"
                variant="outlined"
              />
            )}
            {(filters.priceRange.min !== priceRange.min || filters.priceRange.max !== priceRange.max) && (
              <Chip
                label={`Price: ${formatCurrency(filters.priceRange.min)} - ${formatCurrency(filters.priceRange.max)}`}
                onDelete={() => removeFilter('price')}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading properties...
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && filteredProperties.length === 0 && allProperties.length === 0 && (
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
      {!isLoading && filteredProperties.length === 0 && allProperties.length > 0 && (
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
      {!isLoading && filteredProperties.length > 0 && (
        <Grid container spacing={3}>
          {filteredProperties.map(({ property, address }) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${address}-${property.config.nftID}`}>
              <PropertyCard
                property={property}
                escrowAddress={address}
                onViewDetails={(prop, addr) => handlePropertyAction('view', prop, addr)}
                onInvest={(prop, addr) => handlePropertyAction('invest', prop, addr)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Load More Button */}
      {canLoadMore() && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            onClick={loadMoreProperties}
            disabled={isLoadingMore}
            size="large"
          >
            {isLoadingMore ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Loading...
              </>
            ) : (
              'Load More Properties'
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
}