import { useState, useEffect, useCallback, useRef } from 'react';
import { Property, PropertyStatus } from '../types/property';
import { userScopedPropertyService } from '../services/userScopedFirebaseService';
import { UserScopedPropertyPoolManager } from '../services/userScopedPropertyPoolManager';
import { useAuth } from '../contexts/AuthContext';

interface UserPropertyPoolState {
  properties: Property[];
  loading: boolean;
  error: string | null;
  poolStats: {
    total: number;
    available: number;
    endingSoon: number;
    classDistribution: { A: number; B: number; C: number };
    isHealthy: boolean;
  } | null;
}

interface UseUserPropertyPoolReturn extends UserPropertyPoolState {
  refreshProperties: () => Promise<void>;
  getPoolStats: () => Promise<void>;
  isPoolManagerRunning: boolean;
  poolManager: UserScopedPropertyPoolManager | null;
}

export function useUserScopedPropertyPool(): UseUserPropertyPoolReturn {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<UserPropertyPoolState>({
    properties: [],
    loading: true,
    error: null,
    poolStats: null
  });
  
  const [isPoolManagerRunning, setIsPoolManagerRunning] = useState(false);
  const [poolManager, setPoolManager] = useState<UserScopedPropertyPoolManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start listening to property changes for the authenticated user
  const startPropertyListener = useCallback(() => {
    if (!user?.uid) return;

    // Clean up existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to real-time property updates for this user
    unsubscribeRef.current = userScopedPropertyService.subscribeToProperties(
      user.uid,
      (properties) => {
        setState(prev => ({
          ...prev,
          properties,
          loading: false,
          error: null
        }));
      },
      { status: ['available', 'ending_soon'] } // Get all active properties
    );
  }, [user?.uid]);

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

        // Expired properties will be instantly replaced by PropertyPoolManager
        // Only update to ending_soon status here
        if (timeDiff <= thirtyMinutes && timeDiff > 0 && property.status === 'available') {
          newStatus = 'ending_soon';
        }

        return newStatus !== property.status ? { ...property, status: newStatus } : property;
      })
    }));
  }, []);

  // Get current pool statistics
  const getPoolStats = useCallback(async () => {
    if (!poolManager) return;

    try {
      const stats = await poolManager.getPoolStats();
      setState(prev => ({
        ...prev,
        poolStats: stats
      }));
    } catch (error) {
      console.error('Failed to get pool stats:', error);
    }
  }, [poolManager]);

  // Refresh properties manually
  const refreshProperties = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const properties = await userScopedPropertyService.getProperties(
        user.uid,
        { status: ['available', 'ending_soon'] },
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
  }, [user?.uid]);

  // Initialize the hook when user changes
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      // Clean up when user logs out
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
        statusUpdateIntervalRef.current = null;
      }
      setState({
        properties: [],
        loading: true,
        error: null,
        poolStats: null
      });
      setPoolManager(null);
      setIsPoolManagerRunning(false);
      return;
    }

    const initialize = async () => {
      try {
        // Get pool manager for this user
        const manager = UserScopedPropertyPoolManager.getInstance(user.uid);
        setPoolManager(manager);
        setIsPoolManagerRunning(manager.isManagerRunning());

        // Start property listener
        startPropertyListener();

        // Get initial pool stats
        if (manager.isManagerRunning()) {
          await getPoolStats();
        }

        // Start client-side status updates
        statusUpdateIntervalRef.current = setInterval(updatePropertyStatuses, 60000); // Every minute

      } catch (error) {
        console.error('Failed to initialize user property pool:', error);
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
  }, [user?.uid, isAuthenticated, startPropertyListener, getPoolStats, updatePropertyStatuses]);

  // Update pool manager running status
  useEffect(() => {
    if (!poolManager) return;

    const checkManagerStatus = () => {
      setIsPoolManagerRunning(poolManager.isManagerRunning());
    };

    // Check status periodically
    const statusInterval = setInterval(checkManagerStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, [poolManager]);

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
    getPoolStats,
    isPoolManagerRunning,
    poolManager
  };
}

// Hook for individual property timer management (unchanged)
export function usePropertyTimer(property: Property) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const selloutTime = property.selloutTime.toDate().getTime();
      const timeDiff = selloutTime - now;

      if (timeDiff <= 0) {
        setTimeRemaining('Expired');
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
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000); // Update every second for live countdown

    return () => clearInterval(interval);
  }, [property.selloutTime]);

  return {
    timeRemaining,
    status: property.status,
    isExpired: timeRemaining === 'Expired',
    isEndingSoon: property.status === 'ending_soon'
  };
}

// Hook for property pool statistics
export function useUserPropertyPoolStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    total: number;
    available: number;
    endingSoon: number;
    classDistribution: { A: number; B: number; C: number };
    isHealthy: boolean;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const poolManager = UserScopedPropertyPoolManager.getInstance(user.uid);
      const poolStats = await poolManager.getPoolStats();
      setStats(poolStats);
    } catch (err) {
      console.error('Failed to get pool stats:', err);
      setError('Failed to get pool statistics');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setStats(null);
      setLoading(false);
      return;
    }

    refreshStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshStats, user?.uid]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
}