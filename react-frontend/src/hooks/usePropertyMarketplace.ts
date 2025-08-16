import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PropertyMarketplaceService, 
  MarketplaceProperty, 
  PropertyFilter, 
  InvestmentCalculation 
} from '../services/propertyMarketplaceService';
import { useCryptoPrices } from './useCryptoPrices';

interface MarketplaceHook {
  // Property data
  properties: MarketplaceProperty[];
  filteredProperties: MarketplaceProperty[];
  selectedProperty: MarketplaceProperty | null;
  marketplaceStats: {
    totalProperties: number;
    averageYield: number;
    totalValue: number;
    endingSoon: number;
    classCounts: { A: number; B: number; C: number };
  };
  
  // State management
  loading: boolean;
  error: string | null;
  filters: PropertyFilter;
  
  // Actions
  refreshProperties: () => Promise<void>;
  setFilters: (filters: Partial<PropertyFilter>) => void;
  resetFilters: () => void;
  selectProperty: (propertyId: string | null) => Promise<void>;
  createSampleData: () => Promise<void>;
  
  // Investment calculations
  calculateInvestment: (propertyId: string, shares?: number) => InvestmentCalculation | null;
}

const DEFAULT_FILTERS: PropertyFilter = {
  class: 'all',
  region: 'all',
  priceRange: undefined,
  affordableOnly: false,
  timeRemaining: 'all',
  sortBy: 'newest',
};

export const usePropertyMarketplace = (userEthBalance: number = 0): MarketplaceHook => {
  const [properties, setProperties] = useState<MarketplaceProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<MarketplaceProperty | null>(null);
  const [marketplaceStats, setMarketplaceStats] = useState({
    totalProperties: 0,
    averageYield: 0,
    totalValue: 0,
    endingSoon: 0,
    classCounts: { A: 0, B: 0, C: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PropertyFilter>(DEFAULT_FILTERS);

  const { prices } = useCryptoPrices();

  // Load marketplace properties
  const loadProperties = useCallback(async (currentFilters: PropertyFilter = filters) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading marketplace properties with filters:', currentFilters);

      // Add user balance to filters for affordability checking
      const filtersWithBalance = {
        ...currentFilters,
        userEthBalance: userEthBalance,
      };

      const [propertiesData, statsData] = await Promise.all([
        PropertyMarketplaceService.getAvailableProperties(filtersWithBalance),
        PropertyMarketplaceService.getMarketplaceStats(),
      ]);

      setProperties(propertiesData);
      setMarketplaceStats(statsData);

      console.log(`Loaded ${propertiesData.length} properties`);

    } catch (err) {
      console.error('Error loading marketplace properties:', err);
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [filters, userEthBalance]);

  // Apply filters to properties
  const filteredProperties = useMemo(() => {
    if (!properties.length) return [];

    let filtered = [...properties];

    // Apply filters
    if (filters.class && filters.class !== 'all') {
      filtered = filtered.filter(p => p.class === filters.class);
    }

    if (filters.region && filters.region !== 'all') {
      filtered = filtered.filter(p => p.region === filters.region);
    }

    if (filters.priceRange) {
      filtered = filtered.filter(p => 
        p.currentValue >= filters.priceRange!.min && 
        p.currentValue <= filters.priceRange!.max
      );
    }

    if (filters.affordableOnly && userEthBalance > 0) {
      filtered = filtered.filter(p => p.pricePerShare <= userEthBalance);
    }

    if (filters.timeRemaining === 'ending_soon') {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      filtered = filtered.filter(p => p.selloutTime <= oneHourFromNow);
    }

    // Sort results
    switch (filters.sortBy) {
      case 'price':
        filtered.sort((a, b) => a.currentValue - b.currentValue);
        break;
      case 'yield':
        filtered.sort((a, b) => b.rentalYield - a.rentalYield);
        break;
      case 'timeRemaining':
        filtered.sort((a, b) => a.selloutTime.getTime() - b.selloutTime.getTime());
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return filtered;
  }, [properties, filters, userEthBalance]);

  // Set filters and reload if needed
  const setFilters = useCallback((newFilters: Partial<PropertyFilter>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    
    // Reload properties if server-side filtering is needed
    const serverFilters = ['class', 'region'];
    const needsReload = serverFilters.some(key => 
      newFilters[key as keyof PropertyFilter] !== undefined
    );
    
    if (needsReload) {
      loadProperties(updatedFilters);
    }
  }, [filters, loadProperties]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    loadProperties(DEFAULT_FILTERS);
  }, [loadProperties]);

  // Refresh properties
  const refreshProperties = useCallback(async () => {
    await loadProperties();
  }, [loadProperties]);

  // Select a specific property
  const selectProperty = useCallback(async (propertyId: string | null) => {
    if (!propertyId) {
      setSelectedProperty(null);
      return;
    }

    try {
      const property = await PropertyMarketplaceService.getPropertyDetails(propertyId);
      setSelectedProperty(property);
    } catch (err) {
      console.error('Error selecting property:', err);
      setError('Failed to load property details');
    }
  }, []);

  // Create sample marketplace data
  const createSampleData = useCallback(async () => {
    try {
      setLoading(true);
      await PropertyMarketplaceService.createSampleProperties();
      await loadProperties();
    } catch (err) {
      console.error('Error creating sample data:', err);
      setError('Failed to create sample properties');
    }
  }, [loadProperties]);

  // Calculate investment for a property
  const calculateInvestment = useCallback((propertyId: string, shares?: number): InvestmentCalculation | null => {
    const property = properties.find(p => p.id === propertyId);
    if (!property || !prices) return null;

    return PropertyMarketplaceService.calculateInvestment(property, userEthBalance, shares);
  }, [properties, userEthBalance, prices]);

  // Initial load
  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Auto-refresh when ETH balance changes significantly
  useEffect(() => {
    if (userEthBalance > 0 && filters.affordableOnly) {
      loadProperties();
    }
  }, [userEthBalance, filters.affordableOnly, loadProperties]);

  return {
    // Property data
    properties,
    filteredProperties,
    selectedProperty,
    marketplaceStats,
    
    // State management
    loading,
    error,
    filters,
    
    // Actions
    refreshProperties,
    setFilters,
    resetFilters,
    selectProperty,
    createSampleData,
    
    // Investment calculations
    calculateInvestment,
  };
};

// Hook for property filtering UI
export const usePropertyFilters = () => {
  const [activeFilters, setActiveFilters] = useState<PropertyFilter>(DEFAULT_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const filterOptions = {
    classes: [
      { value: 'all', label: 'All Classes' },
      { value: 'C', label: 'Class C ($100k-$500k)' },
      { value: 'B', label: 'Class B ($500k-$2M)' },
      { value: 'A', label: 'Class A ($2M+)' },
    ],
    regions: [
      { value: 'all', label: 'All Regions' },
      { value: 'midwest', label: 'Midwest' },
      { value: 'southwest', label: 'Southwest' },
      { value: 'southeast', label: 'Southeast' },
      { value: 'anywhere', label: 'Anywhere' },
    ],
    sortOptions: [
      { value: 'newest', label: 'Newest' },
      { value: 'price', label: 'Price: Low to High' },
      { value: 'yield', label: 'Highest Yield' },
      { value: 'timeRemaining', label: 'Ending Soon' },
    ],
    priceRanges: [
      { min: 0, max: 200000, label: 'Under $200k' },
      { min: 200000, max: 500000, label: '$200k - $500k' },
      { min: 500000, max: 1000000, label: '$500k - $1M' },
      { min: 1000000, max: 5000000, label: '$1M - $5M' },
      { min: 5000000, max: Infinity, label: 'Over $5M' },
    ],
  };

  const updateFilter = useCallback((key: keyof PropertyFilter, value: any) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(activeFilters).some(key => {
      const filterKey = key as keyof PropertyFilter;
      const value = activeFilters[filterKey];
      const defaultValue = DEFAULT_FILTERS[filterKey];
      return JSON.stringify(value) !== JSON.stringify(defaultValue);
    });
  }, [activeFilters]);

  return {
    activeFilters,
    setActiveFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    isFilterModalOpen,
    setIsFilterModalOpen,
    filterOptions,
  };
};

// Hook for investment calculations
export const useInvestmentCalculator = (property: MarketplaceProperty | null, userEthBalance: number) => {
  const [desiredShares, setDesiredShares] = useState<number>(1);
  const { prices } = useCryptoPrices();

  const calculation = useMemo(() => {
    if (!property || !prices) return null;
    
    return PropertyMarketplaceService.calculateInvestment(property, userEthBalance, desiredShares);
  }, [property, userEthBalance, desiredShares, prices]);

  const setSharesPercentage = useCallback((percentage: number) => {
    if (!calculation) return;
    
    const shares = Math.max(1, Math.floor((calculation.maxAffordableShares * percentage) / 100));
    setDesiredShares(Math.min(shares, 100));
  }, [calculation]);

  const setMaxAffordableShares = useCallback(() => {
    if (calculation) {
      setDesiredShares(calculation.maxAffordableShares);
    }
  }, [calculation]);

  return {
    desiredShares,
    setDesiredShares,
    setSharesPercentage,
    setMaxAffordableShares,
    calculation,
  };
};