import { useState, useCallback } from 'react';
import { web3Service, type PurchaseResult } from '../services/web3Service';
import { rentalIncomeService } from '../services/rentalIncomeServiceNew';
import { useMockWallet } from './useMockWallet';

interface InvestmentProcessState {
  isProcessing: boolean;
  currentStep: 'idle' | 'validating' | 'confirming_transaction' | 'success' | 'error';
  error: string | null;
  transactionHash?: string;
  purchaseResult?: PurchaseResult;
}

export const useInvestmentProcess = () => {
  const { address, isSimulationMode } = useMockWallet();
  const [state, setState] = useState<InvestmentProcessState>({
    isProcessing: false,
    currentStep: 'idle',
    error: null,
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
      });

      // Step 1: Validate investment (simulate network delay)
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isSimulationMode()) {
        return await processSimulationInvestment(propertyId, propertyClass, pricePerShare, userShares, userInvestmentAmount);
      } else {
        return await processBlockchainInvestment(propertyId, userShares);
      }

    } catch (error) {
      console.error('Investment process failed:', error);
      
      setState({
        isProcessing: false,
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Investment failed',
      });

      return false;
    }
  }, []);

  // Simulation mode investment processing
  const processSimulationInvestment = useCallback(async (
    propertyId: string,
    propertyClass: 'A' | 'B' | 'C',
    pricePerShare: number,
    userShares: number,
    userInvestmentAmount: number
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, currentStep: 'confirming_transaction' }));

    try {
      // Simulate transaction time
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🎮 Simulation purchase successful:', {
        propertyId,
        userShares,
        userInvestmentAmount,
        propertyClass
      });

      // Record purchase for rental income system
      if (address) {
        const mockTransactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        rentalIncomeService.recordPurchase({
          propertyId,
          userId: address,
          shares: userShares,
          purchasePrice: userInvestmentAmount,
          purchaseTime: Date.now(),
          transactionHash: mockTransactionHash
        });
        console.log('📊 Simulation purchase recorded for rental income system');
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'success',
        error: null,
        transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      }));

      return true;

    } catch (error) {
      console.error('❌ Simulation purchase failed:', error);
      throw error;
    }
  }, [address]);

  // Blockchain mode investment processing
  const processBlockchainInvestment = useCallback(async (
    propertyId: string,
    userShares: number
  ): Promise<boolean> => {
    if (!web3Service.isReady()) {
      throw new Error('Web3Service is not initialized. Please connect your wallet first.');
    }

    setState(prev => ({ ...prev, currentStep: 'confirming_transaction' }));

    try {
      // Convert propertyId to tokenId (assuming they match for now)
      const tokenId = parseInt(propertyId);
      
      console.log('🔗 Starting blockchain purchase:', { tokenId, userShares });

      // Purchase shares via smart contract
      const purchaseResult = await web3Service.purchaseShares(tokenId, userShares);

      console.log('✅ Blockchain purchase successful:', purchaseResult);

      // Record purchase for rental income system
      if (address) {
        rentalIncomeService.recordPurchase({
          propertyId,
          userId: address,
          shares: userShares,
          purchasePrice: userInvestmentAmount,
          purchaseTime: Date.now(),
          transactionHash: purchaseResult.transaction.hash
        });
        console.log('📊 Purchase recorded for rental income system');
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'success',
        error: null,
        purchaseResult,
        transactionHash: purchaseResult.transaction.hash,
      }));

      return true;

    } catch (error) {
      console.error('❌ Blockchain purchase failed:', error);
      throw error; // Re-throw to be caught by main processInvestment
    }
  }, []);

  const resetProcess = useCallback(() => {
    setState({
      isProcessing: false,
      currentStep: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    processInvestment,
    processSimulationInvestment,
    processBlockchainInvestment,
    resetProcess,
  };
};