import { useState, useEffect, useCallback } from 'react';
import { PropertyContractService } from '../services/propertyContractService';
import type { Property } from '../types/property';

interface PropertyContractState {
  contractedProperties: Property[];
  isProcessing: boolean;
  error: string | null;
  lastProcessedTime: Date | null;
}

export const usePropertyContracts = (gameTime: Date | null, gameStartTime: Date | null) => {
  const [state, setState] = useState<PropertyContractState>({
    contractedProperties: [],
    isProcessing: false,
    error: null,
    lastProcessedTime: null
  });

  // Initialize contract times when game starts
  useEffect(() => {
    if (!gameStartTime) return;

    const initializeContracts = async () => {
      try {
        setState(prev => ({ ...prev, isProcessing: true, error: null }));
        
        await PropertyContractService.initializePropertyContractTimes(gameStartTime);
        
        console.log('🏠 Property contract times initialized');
        setState(prev => ({ ...prev, isProcessing: false }));
        
      } catch (error) {
        console.error('❌ Error initializing property contracts:', error);
        setState(prev => ({ 
          ...prev, 
          isProcessing: false, 
          error: error instanceof Error ? error.message : 'Failed to initialize contracts'
        }));
      }
    };

    initializeContracts();
  }, [gameStartTime]);

  // Process contract updates every game time tick
  useEffect(() => {
    if (!gameTime) return;

    const processContracts = async () => {
      try {
        const contractedProperties = await PropertyContractService.processContractUpdates(gameTime);
        
        if (contractedProperties.length > 0) {
          setState(prev => ({
            ...prev,
            contractedProperties: [...prev.contractedProperties, ...contractedProperties],
            lastProcessedTime: new Date()
          }));

          console.log(`📋 ${contractedProperties.length} properties went under contract at game time:`, gameTime);
        }

      } catch (error) {
        console.error('❌ Error processing contracts:', error);
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to process contracts'
        }));
      }
    };

    // Process contracts every minute (when game time updates)
    processContracts();
  }, [gameTime]);

  // Manual trigger for contract processing (for testing)
  const triggerContractProcessing = useCallback(async () => {
    if (!gameTime) return [];

    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const contractedProperties = await PropertyContractService.processContractUpdates(gameTime);
      
      setState(prev => ({
        ...prev,
        contractedProperties: [...prev.contractedProperties, ...contractedProperties],
        lastProcessedTime: new Date(),
        isProcessing: false
      }));

      return contractedProperties;
    } catch (error) {
      console.error('❌ Error in manual contract processing:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process contracts'
      }));
      return [];
    }
  }, [gameTime]);

  // Get contract timing for a property
  const getContractTiming = useCallback((propertyClass: 'A' | 'B' | 'C') => {
    return PropertyContractService.getContractTimingDisplay(propertyClass);
  }, []);

  // Get time until contract for a property
  const getTimeUntilContract = useCallback((contractTime: Date) => {
    return PropertyContractService.getTimeUntilContract(contractTime);
  }, []);

  // Clear contracted properties notifications
  const clearContractedProperties = useCallback(() => {
    setState(prev => ({ ...prev, contractedProperties: [] }));
  }, []);

  return {
    // State
    contractedProperties: state.contractedProperties,
    isProcessing: state.isProcessing,
    error: state.error,
    lastProcessedTime: state.lastProcessedTime,
    
    // Actions
    triggerContractProcessing,
    clearContractedProperties,
    
    // Utilities
    getContractTiming,
    getTimeUntilContract
  };
};