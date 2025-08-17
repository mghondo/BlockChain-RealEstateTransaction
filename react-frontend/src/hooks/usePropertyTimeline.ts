import { useEffect } from 'react';
import { PropertyTimelineService } from '../services/propertyTimelineService';

/**
 * Background hook that manages property timeline without affecting UI
 * Starts automatically when app loads, runs silently in background
 */
export const usePropertyTimeline = () => {
  useEffect(() => {
    // Start the background processor once when app loads
    PropertyTimelineService.startBackgroundProcessor();
    
    // No cleanup needed - let it run continuously
    console.log('🎯 Property timeline system started (background mode)');
  }, []);

  // Return nothing - this is a background-only hook
  return {};
};