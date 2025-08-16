import { useState, useCallback } from 'react';
import { MockInvestorService, InvestmentCompletion } from '../services/mockInvestorService';

interface InvestmentProcessState {
  isProcessing: boolean;
  currentStep: 'idle' | 'validating' | 'generating_investors' | 'completing' | 'success' | 'error';
  error: string | null;
  completion: InvestmentCompletion | null;
}

export const useInvestmentProcess = () => {
  const [state, setState] = useState<InvestmentProcessState>({
    isProcessing: false,
    currentStep: 'idle',
    error: null,
    completion: null,
  });

  const processInvestment = useCallback(async (
    propertyId: string,
    propertyClass: 'A' | 'B' | 'C',
    pricePerShare: number,
    userShares: number,
    userInvestmentAmount: number
  ): Promise<boolean> => {
    try {
      setState({
        isProcessing: true,
        currentStep: 'validating',
        error: null,
        completion: null,
      });

      // Step 1: Validate investment (simulate network delay)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setState(prev => ({ ...prev, currentStep: 'generating_investors' }));

      // Step 2: Generate mock investors
      await new Promise(resolve => setTimeout(resolve, 800));

      setState(prev => ({ ...prev, currentStep: 'completing' }));

      // Step 3: Complete investment with mock investors
      const completion = await MockInvestorService.completePropertyInvestment(
        propertyId,
        propertyClass,
        pricePerShare,
        userShares,
        userInvestmentAmount
      );

      setState({
        isProcessing: false,
        currentStep: 'success',
        error: null,
        completion,
      });

      return true;

    } catch (error) {
      console.error('Investment process failed:', error);
      
      setState({
        isProcessing: false,
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Investment failed',
        completion: null,
      });

      return false;
    }
  }, []);

  const resetProcess = useCallback(() => {
    setState({
      isProcessing: false,
      currentStep: 'idle',
      error: null,
      completion: null,
    });
  }, []);

  return {
    ...state,
    processInvestment,
    resetProcess,
  };
};