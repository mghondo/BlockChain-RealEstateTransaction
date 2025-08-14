import { Timestamp } from 'firebase/firestore';

export type PropertyClass = 'A' | 'B' | 'C';

export type PropertyStatus = 'available' | 'ending_soon' | 'sold_out';

export type PropertyRegion = 'midwest' | 'southwest' | 'southeast' | 'northwest' | 'anywhere';

export interface MockInvestor {
  id: string;
  name: string;
  avatar: string;
  sharesOwned: number;
  investmentAmount: number;
  investmentDate: Date;
}

export interface Property {
  id: string;
  class: PropertyClass;
  address: string;
  city: string;
  state: string;
  region: PropertyRegion;
  price: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  rentalYield: number; // Percentage as decimal (e.g., 0.08 for 8%)
  currentValue: number;
  imageUrl: string;
  createdAt: Timestamp;
  selloutTime: Timestamp;
  status: PropertyStatus;
  mockInvestors: MockInvestor[];
  // Additional metadata for enhanced experience
  description?: string;
  amenities?: string[];
  totalShares?: number;
  availableShares?: number;
  sharePrice?: number;
}

export interface PropertyFilters {
  class?: PropertyClass[];
  priceRange?: {
    min: number;
    max: number;
  };
  region?: PropertyRegion[];
  status?: PropertyStatus[];
  rentalYieldRange?: {
    min: number;
    max: number;
  };
}

export interface PropertySortOptions {
  field: 'price' | 'rentalYield' | 'timeRemaining' | 'createdAt' | 'sqft';
  direction: 'asc' | 'desc';
}

export interface WatchlistItem {
  id: string;
  userId: string; // For future authentication integration
  propertyId: string;
  addedDate: Timestamp;
}

// Property class configuration
export interface PropertyClassConfig {
  priceRange: {
    min: number;
    max: number;
  };
  sqftRange: {
    min: number;
    max: number;
  };
  bedroomRange: {
    min: number;
    max: number;
  };
  bathroomRange: {
    min: number;
    max: number;
  };
  yearBuiltRange: {
    min: number;
    max: number;
  };
  rentalYieldRange: {
    min: number;
    max: number;
  };
  types: string[];
  targetAreas: string[];
  financingRequired: boolean;
  distributionWeight: number; // 0.4 for C&B, 0.2 for A
}

// US States mapping for regional classification
export interface StateRegionMapping {
  [state: string]: PropertyRegion;
}

// Image hosting configuration
export interface ImageConfig {
  baseUrl: string;
  classes: PropertyClass[];
  regions: PropertyRegion[];
  fallbackRegion: PropertyRegion;
}

// Property generation configuration
export interface PropertyGenerationConfig {
  minPoolSize: number;
  selloutTimeRange: {
    min: number; // minutes
    max: number; // minutes
  };
  endingSoonThreshold: number; // minutes
  classDistribution: {
    A: number;
    B: number;
    C: number;
  };
  generateContinuously: boolean;
}

// Timer and status update configuration
export interface TimerConfig {
  updateInterval: number; // milliseconds
  endingSoonThreshold: number; // minutes
  backgroundUpdateInterval: number; // milliseconds
}

// Filter and sort state for UI
export interface PropertyListState {
  properties: Property[];
  filteredProperties: Property[];
  loading: boolean;
  error: string | null;
  filters: PropertyFilters;
  sortOptions: PropertySortOptions;
  searchQuery: string;
  totalCount: number;
  hasMore: boolean;
}

// Watchlist state
export interface WatchlistState {
  items: WatchlistItem[];
  loading: boolean;
  error: string | null;
}

// Property detail state with additional information
export interface PropertyDetailState {
  property: Property | null;
  loading: boolean;
  error: string | null;
  relatedProperties: Property[];
  investmentCalculation: {
    sharePrice: number;
    availableShares: number;
    totalShares: number;
    expectedAnnualReturn: number;
    monthlyRentalIncome: number;
  };
}

// Error types for better error handling
export interface PropertyError {
  code: string;
  message: string;
  details?: any;
}

// Analytics and tracking types
export interface PropertyInteraction {
  propertyId: string;
  action: 'view' | 'watchlist_add' | 'watchlist_remove' | 'share' | 'filter' | 'sort';
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Mobile responsive breakpoints
export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

// API response types for external services
export interface LocationData {
  city: string;
  state: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
}

// Property validation schema
export interface PropertyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}