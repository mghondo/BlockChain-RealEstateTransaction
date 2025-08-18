import { useState, useCallback } from 'react';
import { MockWalletData } from '../components/MockWallet/MockWallet';

interface MockWalletState {
  isConnected: boolean;
  address: string | null;
  ethBalance: number;
  isLoading: boolean;
  error: string | null;
}

export const useMockWallet = () => {
  const [wallet, setWallet] = useState<MockWalletState>({
    isConnected: false,
    address: null,
    ethBalance: 0,
    isLoading: false,
    error: null
  });

  const connectWallet = useCallback((walletData: MockWalletData) => {
    setWallet({
      isConnected: true,
      address: walletData.address,
      ethBalance: walletData.ethBalance,
      isLoading: false,
      error: null
    });
    
    // Store in localStorage for persistence
    localStorage.setItem('mockWallet', JSON.stringify(walletData));
    
    console.log('🎮 Mock wallet connected:', {
      address: walletData.address,
      ethBalance: walletData.ethBalance
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({
      isConnected: false,
      address: null,
      ethBalance: 0,
      isLoading: false,
      error: null
    });
    
    // Clear from localStorage
    localStorage.removeItem('mockWallet');
    
    console.log('🎮 Mock wallet disconnected');
  }, []);

  const updateBalance = useCallback((ethAmount: number) => {
    setWallet(prev => {
      const newWallet = {
        ...prev,
        ethBalance: Math.max(0, prev.ethBalance - ethAmount)
      };
      
      // Update localStorage
      if (prev.isConnected) {
        const storedData = localStorage.getItem('mockWallet');
        if (storedData) {
          const walletData = JSON.parse(storedData);
          walletData.ethBalance = newWallet.ethBalance;
          localStorage.setItem('mockWallet', JSON.stringify(walletData));
        }
      }
      
      return newWallet;
    });
  }, []);

  const addBalance = useCallback((ethAmount: number) => {
    setWallet(prev => {
      const newWallet = {
        ...prev,
        ethBalance: prev.ethBalance + ethAmount
      };
      
      // Update localStorage
      if (prev.isConnected) {
        const storedData = localStorage.getItem('mockWallet');
        if (storedData) {
          const walletData = JSON.parse(storedData);
          walletData.ethBalance = newWallet.ethBalance;
          localStorage.setItem('mockWallet', JSON.stringify(walletData));
        }
      }
      
      return newWallet;
    });
  }, []);

  const restoreWallet = useCallback(() => {
    const storedData = localStorage.getItem('mockWallet');
    if (storedData) {
      try {
        const walletData: MockWalletData = JSON.parse(storedData);
        setWallet({
          isConnected: true,
          address: walletData.address,
          ethBalance: walletData.ethBalance,
          isLoading: false,
          error: null
        });
        // console.log('🎮 Mock wallet restored from storage');
        return true;
      } catch (error) {
        console.error('Failed to restore wallet from storage:', error);
        localStorage.removeItem('mockWallet');
      }
    }
    return false;
  }, []);

  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const formatBalance = useCallback((balance: number, decimals: number = 4): string => {
    return balance.toFixed(decimals);
  }, []);

  const hasEnoughBalance = useCallback((ethAmount: number): boolean => {
    return wallet.ethBalance >= ethAmount;
  }, [wallet.ethBalance]);

  return {
    // State
    isConnected: wallet.isConnected,
    address: wallet.address,
    ethBalance: wallet.ethBalance,
    isLoading: wallet.isLoading,
    error: wallet.error,
    
    // Actions
    connectWallet,
    disconnectWallet,
    updateBalance,
    addBalance,
    restoreWallet,
    
    // Utilities
    formatAddress,
    formatBalance,
    hasEnoughBalance
  };
};