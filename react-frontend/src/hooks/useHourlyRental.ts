import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HourlyRentalService } from '../services/hourlyRentalService';

interface UseHourlyRentalProps {
  investments: any[];
  enabled?: boolean;
}

export const useHourlyRental = ({ investments, enabled = true }: UseHourlyRentalProps) => {
  const { user } = useAuth();

  // Initialize hourly rental system when user logs in
  const initializeRentalSystem = useCallback(async () => {
    if (!user?.uid || !enabled || investments.length === 0) {
      console.log('⏳ Skipping rental system initialization:', {
        hasUser: !!user?.uid,
        enabled,
        investmentCount: investments.length
      });
      return;
    }

    console.log('🚀 Initializing hourly rental system...');
    await HourlyRentalService.initializeForUser(user.uid, investments);
  }, [user?.uid, enabled, investments]);

  // Initialize on mount and when dependencies change
  useEffect(() => {
    initializeRentalSystem();
  }, [initializeRentalSystem]);

  // Cleanup on user logout or component unmount
  useEffect(() => {
    return () => {
      if (user?.uid) {
        HourlyRentalService.cleanupForUser(user.uid);
      }
    };
  }, [user?.uid]);

  // Manual trigger for testing
  const triggerManualCollection = useCallback(async (): Promise<boolean> => {
    if (!user?.uid || investments.length === 0) {
      console.warn('Cannot trigger manual collection: no user or investments');
      return false;
    }

    console.log('🔧 Triggering manual rental collection...');
    return await HourlyRentalService.performHourlyCollection(user.uid, investments);
  }, [user?.uid, investments]);

  // Get next collection time for UI display
  const getNextCollectionTime = useCallback((): Date | null => {
    if (!enabled) return null;
    return HourlyRentalService.getNextCollectionTime();
  }, [enabled]);

  // Check if it's currently a collection time
  const isCollectionTime = useCallback((): boolean => {
    return HourlyRentalService.isCollectionTime();
  }, []);

  return {
    triggerManualCollection,
    getNextCollectionTime,
    isCollectionTime,
    isActive: enabled && !!user?.uid && investments.length > 0
  };
};