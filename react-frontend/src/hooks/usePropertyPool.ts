import { useState, useEffect, useCallback, useRef } from 'react';
import { Property, PropertyStatus } from '../types/property';
import { propertyService } from '../services/firebaseService';
import { propertyPoolManager } from '../services/propertyPoolManager';

interface PropertyPoolState {
  properties: Property[];
  loading: boolean;
  error: string | null;
  poolStats: {
    total: number;
    available: number;
    endingSoon: number;
    soldOut: number;
    classDistribution: { A: number; B: number; C: number };
    isHealthy: boolean;
  } | null;
}

interface UsePropertyPoolReturn extends PropertyPoolState {
  refreshProperties: () => Promise<void>;
  startPoolManager: () => Promise<void>;
  stopPoolManager: () => void;
  getPoolStats: () => Promise<void>;
  isPoolManagerRunning: boolean;
}

export function usePropertyPool(autoStart = true): UsePropertyPoolReturn {
  const [state, setState] = useState<PropertyPoolState>({
    properties: [],
    loading: true,
    error: null,
    poolStats: null
  });
  
  const [isPoolManagerRunning, setIsPoolManagerRunning] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start listening to property changes
  const startPropertyListener = useCallback(() => {
    // Clean up existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to real-time property updates
    unsubscribeRef.current = propertyService.subscribeToProperties(
      (properties) => {
        setState(prev => ({
          ...prev,
          properties,
          loading: false,
          error: null
        }));
      },
      { status: ['available', 'ending_soon', 'sold_out'] } // Get all properties
    );
  }, []);

  // Update property statuses based on time
  const updatePropertyStatuses = useCallback(() => {
    setState(prev => ({
      ...prev,
      properties: prev.properties.map(property => {
        const now = new Date().getTime();
        const selloutTime = property.selloutTime.toDate().getTime();
        const timeDiff = selloutTime - now;
        const thirtyMinutes = 30 * 60 * 1000;

        let newStatus: PropertyStatus = property.status;

        if (timeDiff <= 0 && property.status !== 'sold_out') {
          newStatus = 'sold_out';
        } else if (timeDiff <= thirtyMinutes && timeDiff > 0 && property.status === 'available') {
          newStatus = 'ending_soon';
        }

        return newStatus !== property.status ? { ...property, status: newStatus } : property;
      })
    }));
  }, []);

  // Start the property pool manager
  const startPoolManager = useCallback(async () => {
    try {
      if (!propertyPoolManager.isManagerRunning()) {
        await propertyPoolManager.start();
        setIsPoolManagerRunning(true);
        console.log('Property pool manager started');
      }
    } catch (error) {
      console.error('Failed to start property pool manager:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to start property pool manager'
      }));
    }
  }, []);

  // Stop the property pool manager
  const stopPoolManager = useCallback(() => {
    if (propertyPoolManager.isManagerRunning()) {
      propertyPoolManager.stop();
      setIsPoolManagerRunning(false);
      console.log('Property pool manager stopped');
    }
  }, []);

  // Get current pool statistics
  const getPoolStats = useCallback(async () => {
    try {
      const stats = await propertyPoolManager.getPoolStats();
      setState(prev => ({
        ...prev,
        poolStats: stats
      }));
    } catch (error) {
      console.error('Failed to get pool stats:', error);
    }
  }, []);

  // Refresh properties manually
  const refreshProperties = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const properties = await propertyService.getProperties(
        { status: ['available', 'ending_soon', 'sold_out'] },
        { field: 'createdAt', direction: 'desc' }
      );
      
      setState(prev => ({
        ...prev,
        properties,
        loading: false
      }));
    } catch (error) {
      console.error('Failed to refresh properties:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to refresh properties'
      }));
    }
  }, []);

  // Initialize the hook
  useEffect(() => {
    const initialize = async () => {
      try {
        // Start property listener
        startPropertyListener();

        // Auto-start pool manager if requested
        if (autoStart) {
          await startPoolManager();
        }

        // Get initial pool stats
        await getPoolStats();

        // Start client-side status updates
        statusUpdateIntervalRef.current = setInterval(updatePropertyStatuses, 60000); // Every minute

      } catch (error) {
        console.error('Failed to initialize property pool:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize property pool'
        }));
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
      }
    };
  }, [autoStart, startPropertyListener, startPoolManager, getPoolStats, updatePropertyStatuses]);

  // Update pool manager running status
  useEffect(() => {
    const checkManagerStatus = () => {
      setIsPoolManagerRunning(propertyPoolManager.isManagerRunning());
    };

    // Check status periodically
    const statusInterval = setInterval(checkManagerStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, []);

  // Handle page visibility changes to update timers
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, update all property statuses
        updatePropertyStatuses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePropertyStatuses]);

  return {
    ...state,
    refreshProperties,
    startPoolManager,
    stopPoolManager,
    getPoolStats,
    isPoolManagerRunning
  };
}

// Hook for individual property timer management
export function usePropertyTimer(property: Property) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [status, setStatus] = useState<PropertyStatus>(property.status);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const selloutTime = property.selloutTime.toDate().getTime();
      const timeDiff = selloutTime - now;

      if (timeDiff <= 0) {
        setTimeRemaining('Sold Out');
        setStatus('sold_out');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      let display = '';
      if (days > 0) {
        display = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        display = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        display = `${minutes}m ${seconds}s`;
      } else {
        display = `${seconds}s`;
      }

      setTimeRemaining(display);

      // Update status based on time remaining
      const thirtyMinutes = 30 * 60 * 1000;
      if (timeDiff <= thirtyMinutes && status === 'available') {
        setStatus('ending_soon');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second for live countdown

    return () => clearInterval(interval);
  }, [property.selloutTime, status]);

  return {
    timeRemaining,
    status,
    isExpired: status === 'sold_out',
    isEndingSoon: status === 'ending_soon'
  };
}

// Hook for property pool statistics
export function usePropertyPoolStats() {
  const [stats, setStats] = useState<{
    total: number;
    available: number;
    endingSoon: number;
    soldOut: number;
    classDistribution: { A: number; B: number; C: number };
    isHealthy: boolean;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const poolStats = await propertyPoolManager.getPoolStats();
      setStats(poolStats);
    } catch (err) {
      console.error('Failed to get pool stats:', err);
      setError('Failed to get pool statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
}