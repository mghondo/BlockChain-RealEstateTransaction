import { useState, useEffect, useCallback } from 'react';
import { Property, WatchlistItem } from '../types/property';
import { watchlistService } from '../services/firebaseService';

interface WatchlistState {
  items: WatchlistItem[];
  watchedPropertyIds: Set<string>;
  loading: boolean;
  error: string | null;
}

interface UseWatchlistReturn extends WatchlistState {
  addToWatchlist: (property: Property) => Promise<void>;
  removeFromWatchlist: (propertyId: string) => Promise<void>;
  toggleWatchlist: (property: Property) => Promise<void>;
  isInWatchlist: (propertyId: string) => boolean;
  clearWatchlist: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
  getWatchlistCount: () => number;
}

export function useWatchlist(userId = 'default-user'): UseWatchlistReturn {
  const [state, setState] = useState<WatchlistState>({
    items: [],
    watchedPropertyIds: new Set(),
    loading: true,
    error: null
  });

  // Load watchlist items
  const loadWatchlist = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const items = await watchlistService.getUserWatchlist(userId);
      const watchedPropertyIds = new Set(items.map(item => item.propertyId));
      
      setState(prev => ({
        ...prev,
        items,
        watchedPropertyIds,
        loading: false
      }));
    } catch (error) {
      console.error('Failed to load watchlist:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load watchlist'
      }));
    }
  }, [userId]);

  // Add property to watchlist
  const addToWatchlist = useCallback(async (property: Property) => {
    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        watchedPropertyIds: new Set([...prev.watchedPropertyIds, property.id])
      }));

      await watchlistService.addToWatchlist(userId, property.id);
      
      // Refresh to get the actual data
      await loadWatchlist();
      
      // Show success feedback
      console.log(`Added ${property.address} to watchlist`);
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
      
      // Revert optimistic update
      setState(prev => {
        const newSet = new Set(prev.watchedPropertyIds);
        newSet.delete(property.id);
        return {
          ...prev,
          watchedPropertyIds: newSet,
          error: 'Failed to add to watchlist'
        };
      });
    }
  }, [userId, loadWatchlist]);

  // Remove property from watchlist
  const removeFromWatchlist = useCallback(async (propertyId: string) => {
    try {
      // Optimistic update
      setState(prev => {
        const newSet = new Set(prev.watchedPropertyIds);
        newSet.delete(propertyId);
        return {
          ...prev,
          watchedPropertyIds: newSet
        };
      });

      await watchlistService.removeFromWatchlist(userId, propertyId);
      
      // Refresh to get the actual data
      await loadWatchlist();
      
      // Show success feedback
      console.log('Removed from watchlist');
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
      
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        watchedPropertyIds: new Set([...prev.watchedPropertyIds, propertyId]),
        error: 'Failed to remove from watchlist'
      }));
    }
  }, [userId, loadWatchlist]);

  // Toggle property in watchlist
  const toggleWatchlist = useCallback(async (property: Property) => {
    if (state.watchedPropertyIds.has(property.id)) {
      await removeFromWatchlist(property.id);
    } else {
      await addToWatchlist(property);
    }
  }, [state.watchedPropertyIds, addToWatchlist, removeFromWatchlist]);

  // Check if property is in watchlist
  const isInWatchlist = useCallback((propertyId: string): boolean => {
    return state.watchedPropertyIds.has(propertyId);
  }, [state.watchedPropertyIds]);

  // Clear entire watchlist
  const clearWatchlist = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Remove all items
      const removePromises = state.items.map(item => 
        watchlistService.removeFromWatchlist(userId, item.propertyId)
      );
      
      await Promise.all(removePromises);
      
      setState(prev => ({
        ...prev,
        items: [],
        watchedPropertyIds: new Set(),
        loading: false
      }));
      
      console.log('Watchlist cleared');
    } catch (error) {
      console.error('Failed to clear watchlist:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to clear watchlist'
      }));
    }
  }, [userId, state.items]);

  // Refresh watchlist
  const refreshWatchlist = useCallback(async () => {
    await loadWatchlist();
  }, [loadWatchlist]);

  // Get watchlist count
  const getWatchlistCount = useCallback((): number => {
    return state.items.length;
  }, [state.items.length]);

  // Initialize watchlist on mount
  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = watchlistService.subscribeToWatchlist(
      userId,
      (watchlist) => {
        const watchedPropertyIds = new Set(watchlist.map(item => item.propertyId));
        setState(prev => ({
          ...prev,
          items: watchlist,
          watchedPropertyIds,
          loading: false
        }));
      }
    );

    return unsubscribe;
  }, [userId]);

  return {
    ...state,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    clearWatchlist,
    refreshWatchlist,
    getWatchlistCount
  };
}

// Hook for watchlist with property details
export function useWatchlistWithProperties(userId = 'default-user') {
  const watchlist = useWatchlist(userId);
  const [watchedProperties, setWatchedProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  // Load property details for watchlist items
  useEffect(() => {
    const loadWatchedProperties = async () => {
      if (watchlist.items.length === 0) {
        setWatchedProperties([]);
        return;
      }

      setPropertiesLoading(true);
      
      try {
        // Import propertyService here to avoid circular dependencies
        const { propertyService } = await import('../services/firebaseService');
        
        const propertyPromises = watchlist.items.map(item =>
          propertyService.getProperty(item.propertyId)
        );
        
        const properties = await Promise.all(propertyPromises);
        const validProperties = properties.filter((p): p is Property => p !== null);
        
        setWatchedProperties(validProperties);
      } catch (error) {
        console.error('Failed to load watched properties:', error);
      } finally {
        setPropertiesLoading(false);
      }
    };

    loadWatchedProperties();
  }, [watchlist.items]);

  return {
    ...watchlist,
    watchedProperties,
    propertiesLoading
  };
}

// Hook for watchlist statistics
export function useWatchlistStats(userId = 'default-user') {
  const { items, watchedProperties, propertiesLoading } = useWatchlistWithProperties(userId);
  
  const stats = {
    totalProperties: items.length,
    totalValue: watchedProperties.reduce((sum, property) => sum + property.price, 0),
    averagePrice: watchedProperties.length > 0 
      ? watchedProperties.reduce((sum, property) => sum + property.price, 0) / watchedProperties.length 
      : 0,
    classDistribution: watchedProperties.reduce((acc, property) => {
      acc[property.class] = (acc[property.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    statusDistribution: watchedProperties.reduce((acc, property) => {
      acc[property.status] = (acc[property.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    regionDistribution: watchedProperties.reduce((acc, property) => {
      acc[property.region] = (acc[property.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageRentalYield: watchedProperties.length > 0
      ? watchedProperties.reduce((sum, property) => sum + property.rentalYield, 0) / watchedProperties.length
      : 0,
    estimatedAnnualIncome: watchedProperties.reduce((sum, property) => 
      sum + (property.price * property.rentalYield), 0
    )
  };

  return {
    stats,
    loading: propertiesLoading,
    properties: watchedProperties
  };
}

// Local storage backup for offline functionality
export function useWatchlistBackup(userId = 'default-user') {
  const storageKey = `fracestate_watchlist_${userId}`;

  const saveToLocalStorage = useCallback((items: WatchlistItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save watchlist to local storage:', error);
    }
  }, [storageKey]);

  const loadFromLocalStorage = useCallback((): WatchlistItem[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load watchlist from local storage:', error);
      return [];
    }
  }, [storageKey]);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear watchlist from local storage:', error);
    }
  }, [storageKey]);

  return {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  };
}