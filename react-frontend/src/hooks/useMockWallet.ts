import { useState, useCallback, useEffect } from 'react';
import { WalletData, MockWalletData, RealWalletData } from '../components/MockWallet/MockWallet';
import { simulationWalletService, SimulationWallet } from '../services/firebaseService';
import { UserScopedWalletService, UserWallet } from '../services/userScopedWalletService';
import { UserDataCleanupService } from '../services/userDataCleanupService';
import { useCryptoPrices } from './useCryptoPrices';
import { useAuth } from '../contexts/AuthContext';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  ethBalance: number;
  mode: 'simulation' | null;
  username?: string;
  strikePrice?: number; // ETH price when wallet was created
  createdAt?: number; // Timestamp when wallet was filled
  initialUsdValue?: number; // Original USD value
  isLoading: boolean;
  error: string | null;
  // Firebase-specific fields
  walletId?: string; // Firebase document ID
  userId?: string; // Unique user identifier for Firebase queries
}

interface VolatilityData {
  currentUsdValue: number;
  profitLoss: number;
  profitLossPercent: number;
  priceChange: number;
  priceChangePercent: number;
  daysSinceCreation: number;
}

interface UseMockWalletProps {
  userId?: string; // Authenticated user ID from Firebase Auth
}

// Global event emitter for wallet refreshes
const walletRefreshListeners = new Set<() => void>();

const emitWalletRefresh = () => {
  walletRefreshListeners.forEach(listener => listener());
};

export const useMockWallet = (props?: UseMockWalletProps) => {
  const { prices } = useCryptoPrices();
  const { user } = useAuth();
  const { userId: propUserId } = props || {};
  
  // Use authenticated user ID first, then prop userId, then null
  const authUserId = user?.uid || propUserId;
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    ethBalance: 0,
    mode: null,
    isLoading: false,
    error: null
  });
  const [volatilityData, setVolatilityData] = useState<VolatilityData | null>(null);
  const [firebaseWallet, setFirebaseWallet] = useState<SimulationWallet | null>(null);

  // Get user ID - prioritize authenticated user, fallback to localStorage for legacy support
  const getUserId = useCallback((): string => {
    // Use authenticated user ID if available
    if (authUserId) {
      console.log('🆔 Using authenticated user ID:', authUserId);
      return authUserId;
    }
    
    // Legacy fallback for users not yet authenticated
    let userId = localStorage.getItem('simulationUserId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('simulationUserId', userId);
      console.log('🆔 Generated new legacy user ID:', userId);
    }
    console.log('🆔 Using legacy user ID:', userId);
    return userId;
  }, [authUserId]);

  // Try to restore simulation wallet from Firebase when user is available
  useEffect(() => {
    // Only restore wallet if we have authenticated user ID or it's a legacy session
    if (!authUserId && !localStorage.getItem('simulationUserId')) {
      console.log('⏳ No authenticated user or legacy session, skipping wallet restore');
      setWallet(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Don't restore if user is not fully authenticated yet
    if (!user && !localStorage.getItem('simulationUserId')) {
      console.log('⏳ User not authenticated yet, waiting...');
      return;
    }

    const restoreWalletFromFirebase = async () => {
      console.log('🔄 useMockWallet hook initializing - attempting Firebase restore...');
      
      try {
        setWallet(prev => ({ ...prev, isLoading: true }));
        
        const userId = getUserId();
        
        // For authenticated users, use user-scoped wallet service
        if (authUserId && user) {
          console.log('🔄 Using user-scoped wallet service for authenticated user:', authUserId);
          const userWalletData = await UserScopedWalletService.getUserWallet(authUserId);
          
          if (userWalletData) {
            console.log('📦 Found user-scoped wallet data:', {
              address: userWalletData.address,
              ethBalance: userWalletData.ethBalance,
              strikePrice: userWalletData.strikePrice,
              initialUsdValue: userWalletData.initialUsdValue,
              isActive: userWalletData.isActive
            });
            
            setWallet({
              isConnected: true,
              address: userWalletData.address,
              ethBalance: userWalletData.ethBalance,
              mode: 'simulation',
              username: userWalletData.username,
              strikePrice: userWalletData.strikePrice,
              createdAt: userWalletData.createdAt.toMillis(),
              initialUsdValue: userWalletData.initialUsdValue,
              userId: userWalletData.userId,
              isLoading: false,
              error: null
            });
            
            console.log('✅ User-scoped wallet auto-restored from Firebase');
            return; // Exit early - wallet found
          }
        }
        
        // Fallback to legacy wallet service for non-authenticated users
        const firebaseWalletData = await simulationWalletService.getWalletByUserId(userId);
        
        if (firebaseWalletData) {
          console.log('📦 Found Firebase wallet data:', {
            id: firebaseWalletData.id,
            address: firebaseWalletData.address,
            ethBalance: firebaseWalletData.ethBalance,
            strikePrice: firebaseWalletData.strikePrice,
            initialUsdValue: firebaseWalletData.initialUsdValue,
            isActive: firebaseWalletData.isActive
          });
          
          setFirebaseWallet(firebaseWalletData);
          setWallet({
            isConnected: true,
            address: firebaseWalletData.address,
            ethBalance: firebaseWalletData.ethBalance,
            mode: 'simulation',
            username: firebaseWalletData.username,
            strikePrice: firebaseWalletData.strikePrice,
            createdAt: firebaseWalletData.createdAt.toMillis(),
            initialUsdValue: firebaseWalletData.initialUsdValue,
            walletId: firebaseWalletData.id,
            userId: firebaseWalletData.userId,
            isLoading: false,
            error: null
          });
          
          console.log('✅ Simulation wallet auto-restored from Firebase');
        } else {
          console.log('📭 No Firebase wallet found for user:', userId);
          // Check localStorage as fallback (for migration)
          const stored = localStorage.getItem('mockWallet');
          if (stored) {
            console.log('🔄 Migrating from localStorage to Firebase...');
            try {
              const walletData = JSON.parse(stored);
              if (walletData.mode === 'simulation') {
                // Migrate to Firebase
                await migrateToFirebase(walletData, userId);
              }
            } catch (error) {
              console.warn('Failed to migrate from localStorage:', error);
              localStorage.removeItem('mockWallet');
            }
          }
          setWallet(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('❌ Failed to restore wallet from Firebase:', error);
        setWallet(prev => ({ ...prev, isLoading: false, error: 'Failed to load wallet' }));
      }
    };

    restoreWalletFromFirebase();
  }, [getUserId, authUserId, user]);

  // Clear wallet when user logs out (authUserId becomes null)
  useEffect(() => {
    if (authUserId === null) {
      console.log('🔌 User logged out, clearing wallet state');
      setWallet({
        isConnected: false,
        address: null,
        ethBalance: 0,
        mode: null,
        isLoading: false,
        error: null
      });
      setFirebaseWallet(null);
      setVolatilityData(null);
    }
  }, [authUserId]);

  // Migration helper function
  const migrateToFirebase = useCallback(async (localWalletData: any, userId: string) => {
    try {
      console.log('🔄 Migrating wallet to Firebase...');
      
      const firebaseWalletId = await simulationWalletService.createWallet({
        userId,
        address: localWalletData.address,
        ethBalance: localWalletData.ethBalance || 4.48,
        strikePrice: localWalletData.strikePrice || 4462,
        initialUsdValue: localWalletData.initialUsdValue || 20000,
        username: localWalletData.username || 'User',
        isActive: true
      });
      
      // Get the created wallet to update local state
      const firebaseWalletData = await simulationWalletService.getWallet(firebaseWalletId);
      if (firebaseWalletData) {
        setFirebaseWallet(firebaseWalletData);
        setWallet({
          isConnected: true,
          address: firebaseWalletData.address,
          ethBalance: firebaseWalletData.ethBalance,
          mode: 'simulation',
          username: firebaseWalletData.username,
          strikePrice: firebaseWalletData.strikePrice,
          createdAt: firebaseWalletData.createdAt.toMillis(),
          initialUsdValue: firebaseWalletData.initialUsdValue,
          walletId: firebaseWalletData.id,
          userId: firebaseWalletData.userId,
          isLoading: false,
          error: null
        });
        
        // Clean up localStorage
        localStorage.removeItem('mockWallet');
        console.log('✅ Migration to Firebase completed');
      }
    } catch (error) {
      console.error('❌ Failed to migrate to Firebase:', error);
    }
  }, []);

  const connectWallet = useCallback(async (walletData: WalletData) => {
    // Only simulation mode is supported now
    const mockWalletData = walletData as MockWalletData;
    
    try {
      const userId = getUserId();
      const walletCreateData = {
        address: mockWalletData.address,
        ethBalance: mockWalletData.ethBalance,
        strikePrice: mockWalletData.strikePrice || prices?.ethToUsd || 3200,
        initialUsdValue: mockWalletData.initialUsdValue || 20000,
        username: mockWalletData.username,
        isActive: true
      };
      
      // For authenticated users, use user-scoped wallet service
      if (authUserId && user) {
        console.log('🎮 Creating user-scoped wallet for authenticated user:', authUserId);
        await UserScopedWalletService.createOrUpdateWallet(authUserId, walletCreateData);
        
        // Get the created wallet data
        const userWalletData = await UserScopedWalletService.getUserWallet(authUserId);
        if (userWalletData) {
          setWallet({
            isConnected: true,
            address: userWalletData.address,
            ethBalance: userWalletData.ethBalance,
            mode: 'simulation',
            username: userWalletData.username,
            strikePrice: userWalletData.strikePrice,
            createdAt: userWalletData.createdAt.toMillis(),
            initialUsdValue: userWalletData.initialUsdValue,
            userId: userWalletData.userId,
            isLoading: false,
            error: null
          });
          
          console.log('🎮 User-scoped wallet connected and saved:', {
            address: userWalletData.address,
            ethBalance: userWalletData.ethBalance,
            username: userWalletData.username,
            userId: authUserId
          });
          
          // Clean up old localStorage data
          localStorage.removeItem('mockWallet');
          return;
        }
      }
      
      // Fallback to legacy service for non-authenticated users
      console.log('🎮 Creating legacy wallet in Firebase with data:', { ...walletCreateData, userId });
      const firebaseWalletId = await simulationWalletService.createWallet({ ...walletCreateData, userId });
      
      // Get the created wallet data from Firebase
      const firebaseWalletData = await simulationWalletService.getWallet(firebaseWalletId);
      if (firebaseWalletData) {
        setFirebaseWallet(firebaseWalletData);
        setWallet({
          isConnected: true,
          address: firebaseWalletData.address,
          ethBalance: firebaseWalletData.ethBalance,
          mode: 'simulation',
          username: firebaseWalletData.username,
          strikePrice: firebaseWalletData.strikePrice,
          createdAt: firebaseWalletData.createdAt.toMillis(),
          initialUsdValue: firebaseWalletData.initialUsdValue,
          walletId: firebaseWalletData.id,
          userId: firebaseWalletData.userId,
          isLoading: false,
          error: null
        });
        
        // Clean up old localStorage data
        localStorage.removeItem('mockWallet');
        
        console.log('🎮 Simulation wallet connected and saved to Firebase:', {
          address: firebaseWalletData.address,
          ethBalance: firebaseWalletData.ethBalance,
          username: firebaseWalletData.username,
          walletId: firebaseWalletId
        });
      }
    } catch (error) {
      console.error('❌ Failed to save wallet to Firebase:', error);
      // Fallback to local state only
      setWallet({
        isConnected: true,
        address: mockWalletData.address,
        ethBalance: mockWalletData.ethBalance,
        mode: 'simulation',
        username: mockWalletData.username,
        strikePrice: mockWalletData.strikePrice,
        createdAt: mockWalletData.createdAt,
        initialUsdValue: mockWalletData.initialUsdValue,
        isLoading: false,
        error: 'Failed to save to database'
      });
    }
  }, [getUserId, prices]);

  const disconnectWallet = useCallback(async () => {
    console.log('🔌 Starting wallet disconnection process...');
    
    try {
      // Get user ID before clearing wallet state
      const userId = getUserId();
      
      // Clear all user data from Firebase (investments, transactions, wallet data)
      if (authUserId || userId) {
        console.log('🧨 Clearing all user data from Firebase...');
        await UserDataCleanupService.clearAllUserData(authUserId || userId);
        
        // Verify cleanup was successful
        const verification = await UserDataCleanupService.verifyCleanup(authUserId || userId);
        if (verification.investmentsRemaining === 0 && verification.transactionsRemaining === 0) {
          console.log('✅ User data cleanup verified successful');
        } else {
          console.warn('⚠️ Some data may remain after cleanup:', verification);
        }
      }
      
      // Deactivate Firebase wallet for simulation mode
      if (wallet.mode === 'simulation' && wallet.walletId) {
        try {
          await simulationWalletService.deactivateWallet(wallet.walletId);
          console.log('🔌 Firebase wallet deactivated');
        } catch (error) {
          console.error('❌ Failed to deactivate Firebase wallet:', error);
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('mockWallet');
      localStorage.removeItem('simulationUserId'); // Clear legacy user ID too
      
      // Reset wallet state
      setWallet({
        isConnected: false,
        address: null,
        ethBalance: 0,
        mode: null,
        isLoading: false,
        error: null
      });
      
      setFirebaseWallet(null);
      setVolatilityData(null);
      
      console.log('✅ Wallet disconnected and all user data cleared');
      
    } catch (error) {
      console.error('❌ Failed during wallet disconnection:', error);
      // Still disconnect the wallet even if cleanup fails
      setWallet({
        isConnected: false,
        address: null,
        ethBalance: 0,
        mode: null,
        isLoading: false,
        error: 'Disconnect completed with cleanup errors'
      });
      setFirebaseWallet(null);
      setVolatilityData(null);
    }
  }, [wallet.mode, wallet.walletId, authUserId, getUserId]);

  // Calculate volatility data when prices or firebase wallet changes
  useEffect(() => {
    if (firebaseWallet && prices && wallet.mode === 'simulation') {
      const currentEthPrice = prices.ethToUsd;
      const volatility = simulationWalletService.calculateCurrentValue(firebaseWallet, currentEthPrice);
      
      setVolatilityData(volatility);
      
      console.log('📊 Volatility calculated:', {
        currentPrice: currentEthPrice,
        strikePrice: firebaseWallet.strikePrice,
        currentValue: volatility.currentUsdValue,
        profitLoss: volatility.profitLoss,
        profitLossPercent: volatility.profitLossPercent
      });
    } else {
      setVolatilityData(null);
    }
  }, [firebaseWallet, prices, wallet.mode]);

  // Force create a fresh simulation wallet (useful for debugging)
  const createFreshSimulationWallet = useCallback(() => {
    const SIMULATION_STRIKE_PRICE_ETH = 4.4821; // Fixed ETH amount
    
    const mockAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
    const mockUsername = `User${Math.floor(Math.random() * 9999)}`;
    
    const freshWalletData = {
      address: mockAddress,
      ethBalance: SIMULATION_STRIKE_PRICE_ETH,
      mode: 'simulation' as const,
      username: mockUsername
    };
    
    setWallet({
      isConnected: true,
      address: mockAddress,
      ethBalance: SIMULATION_STRIKE_PRICE_ETH,
      mode: 'simulation',
      username: mockUsername,
      isLoading: false,
      error: null
    });
    
    localStorage.setItem('mockWallet', JSON.stringify(freshWalletData));
    console.log('🎮 Fresh simulation wallet created with fixed $20,000 equivalent');
    
    return true;
  }, []);

  // Expose to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).fixWallet = createFreshSimulationWallet;
      (window as any).clearWallet = () => {
        localStorage.removeItem('mockWallet');
        setWallet({
          isConnected: false,
          address: null,
          ethBalance: 0,
          mode: null,
          isLoading: false,
          error: null
        });
        console.log('🗑️ Wallet cleared');
      };
    }
  }, [createFreshSimulationWallet]);

  const updateBalance = useCallback((ethAmount: number) => {
    // In simulation mode, don't actually deduct balance for testing purposes
    if (wallet.mode === 'simulation') {
      console.log('💰 Simulation mode: Not deducting balance for testing purposes');
      return;
    }
    
    setWallet(prev => ({
      ...prev,
      ethBalance: Math.max(0, prev.ethBalance - ethAmount)
    }));
  }, [wallet.mode]);

  const addBalance = useCallback((ethAmount: number) => {
    console.log('💰 Adding balance to wallet:', {
      currentBalance: wallet.ethBalance,
      addingAmount: ethAmount,
      newBalance: wallet.ethBalance + ethAmount,
      mode: wallet.mode
    });
    
    setWallet(prev => ({
      ...prev,
      ethBalance: prev.ethBalance + ethAmount
    }));
  }, [wallet.ethBalance, wallet.mode]);

  // Restore wallet (only for simulation mode)
  const restoreWallet = useCallback(() => {
    const stored = localStorage.getItem('mockWallet');
    console.log('🔍 Attempting to restore wallet from localStorage:', stored ? 'Found data' : 'No data');
    
    if (stored) {
      try {
        const walletData = JSON.parse(stored);
        console.log('🔍 Parsed wallet data:', walletData);
        
        if (walletData.mode === 'simulation') {
          // Always ensure simulation wallet has exactly $20,000 worth of ETH
          const usdcAmount = 20000; // $20,000 USDC target
          const defaultEthPrice = 4462; // Fallback price
          const correctedBalance = usdcAmount / defaultEthPrice; // ~4.48 ETH
          
          console.log('🎮 Restoring simulation wallet:', {
            originalBalance: walletData.ethBalance,
            correctedBalance,
            usdcAmount,
            defaultEthPrice
          });
          
          setWallet({
            isConnected: true,
            address: walletData.address,
            ethBalance: correctedBalance, // ETH equivalent of $20k
            mode: 'simulation',
            username: walletData.username,
            isLoading: false,
            error: null
          });
          
          // Update localStorage with corrected balance
          const correctedWalletData = {
            ...walletData,
            ethBalance: correctedBalance
          };
          localStorage.setItem('mockWallet', JSON.stringify(correctedWalletData));
          
          console.log('✅ Simulation wallet restored with $20,000 equivalent balance');
          return true;
        } else {
          console.log('🔍 Stored wallet is not simulation mode:', walletData.mode);
        }
      } catch (error) {
        console.error('❌ Failed to restore wallet:', error);
        localStorage.removeItem('mockWallet');
      }
    }
    console.log('🔗 No simulation wallet to restore');
    return false;
  }, []);

  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const formatBalance = useCallback((balance?: number, decimals: number = 4): string => {
    if (balance === undefined || balance === null || isNaN(balance)) {
      return '0.0000';
    }
    return balance.toFixed(decimals);
  }, []);

  const hasEnoughBalance = useCallback((ethAmount: number): boolean => {
    return wallet.ethBalance >= ethAmount;
  }, [wallet.ethBalance]);

  // Mode checking utility (simulation only)
  const isSimulationMode = useCallback(() => {
    return wallet.mode === 'simulation';
  }, [wallet.mode]);

  // Calculate current USD value based on live ETH price (legacy support)
  const getCurrentUsdValue = useCallback((currentEthPrice: number) => {
    if (volatilityData) return volatilityData.currentUsdValue;
    if (wallet.mode !== 'simulation' || !wallet.ethBalance) return 0;
    return wallet.ethBalance * currentEthPrice;
  }, [volatilityData, wallet.mode, wallet.ethBalance]);

  // Calculate profit/loss since wallet creation (legacy support)
  const getProfitLoss = useCallback((currentEthPrice: number) => {
    if (volatilityData) return volatilityData.profitLoss;
    if (wallet.mode !== 'simulation' || !wallet.strikePrice || !wallet.initialUsdValue) return 0;
    const currentValue = getCurrentUsdValue(currentEthPrice);
    return currentValue - wallet.initialUsdValue;
  }, [volatilityData, wallet.mode, wallet.strikePrice, wallet.initialUsdValue, getCurrentUsdValue]);

  // Get wallet performance metrics (updated to use volatilityData)
  const getWalletPerformance = useCallback((currentEthPrice: number) => {
    if (wallet.mode !== 'simulation') return null;
    
    if (volatilityData) {
      return {
        ethAmount: wallet.ethBalance,
        currentUsdValue: volatilityData.currentUsdValue,
        initialUsdValue: wallet.initialUsdValue || 0,
        profitLoss: volatilityData.profitLoss,
        profitLossPercent: volatilityData.profitLossPercent,
        strikePrice: wallet.strikePrice || 0,
        currentPrice: currentEthPrice,
        createdAt: wallet.createdAt,
        daysSinceCreation: volatilityData.daysSinceCreation,
        priceChange: volatilityData.priceChange,
        priceChangePercent: volatilityData.priceChangePercent
      };
    }
    
    // Fallback calculation if volatilityData is not available
    const currentUsdValue = getCurrentUsdValue(currentEthPrice);
    const profitLoss = getProfitLoss(currentEthPrice);
    const profitLossPercent = wallet.initialUsdValue ? (profitLoss / wallet.initialUsdValue) * 100 : 0;
    
    return {
      ethAmount: wallet.ethBalance,
      currentUsdValue,
      initialUsdValue: wallet.initialUsdValue || 0,
      profitLoss,
      profitLossPercent,
      strikePrice: wallet.strikePrice || 0,
      currentPrice: currentEthPrice,
      createdAt: wallet.createdAt,
      daysSinceCreation: wallet.createdAt ? Math.floor((Date.now() - wallet.createdAt) / (1000 * 60 * 60 * 24)) : 0
    };
  }, [wallet.mode, wallet.ethBalance, wallet.initialUsdValue, wallet.strikePrice, wallet.createdAt, volatilityData, getCurrentUsdValue, getProfitLoss]);

  // Refresh wallet data from Firebase (useful after purchases)
  const refreshWallet = useCallback(async () => {
    if (!authUserId && !localStorage.getItem('simulationUserId')) {
      console.log('⚠️ Cannot refresh wallet: no user ID');
      return;
    }

    try {
      setWallet(prev => ({ ...prev, isLoading: true }));
      
      const userId = getUserId();
      
      if (authUserId && user) {
        console.log('🔄 Refreshing wallet from Firebase:', authUserId);
        const firebaseWalletData = await UserScopedWalletService.getUserWallet(authUserId);
        
        if (firebaseWalletData) {
          setFirebaseWallet({
            id: 'simulation',
            userId: firebaseWalletData.userId,
            address: firebaseWalletData.address,
            ethBalance: firebaseWalletData.ethBalance,
            strikePrice: firebaseWalletData.strikePrice,
            initialUsdValue: firebaseWalletData.initialUsdValue,
            createdAt: firebaseWalletData.createdAt,
            username: firebaseWalletData.username,
            isActive: firebaseWalletData.isActive,
            lastUpdated: firebaseWalletData.lastUpdated
          });
          
          setWallet(prev => ({
            ...prev,
            isConnected: true,
            address: firebaseWalletData.address,
            ethBalance: firebaseWalletData.ethBalance,
            mode: 'simulation',
            username: firebaseWalletData.username,
            strikePrice: firebaseWalletData.strikePrice,
            createdAt: firebaseWalletData.createdAt.toMillis(),
            initialUsdValue: firebaseWalletData.initialUsdValue,
            walletId: firebaseWalletData.id,
            userId: firebaseWalletData.userId,
            isLoading: false,
            error: null
          }));
          
          console.log('✅ Wallet refreshed successfully:', {
            newBalance: firebaseWalletData.ethBalance.toFixed(4),
            address: firebaseWalletData.address
          });
          
          // Notify all other wallet instances to refresh
          console.log('📡 Broadcasting wallet refresh to all instances');
          emitWalletRefresh();
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh wallet:', error);
      setWallet(prev => ({ ...prev, isLoading: false, error: 'Refresh failed' }));
    }
  }, [authUserId, user, getUserId]);

  // Listen for global wallet refresh events from other components
  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log('📡 Received global wallet refresh signal');
      refreshWallet();
    };
    
    walletRefreshListeners.add(handleGlobalRefresh);
    
    return () => {
      walletRefreshListeners.delete(handleGlobalRefresh);
    };
  }, [refreshWallet]);

  return {
    // State
    isConnected: wallet.isConnected,
    address: wallet.address,
    ethBalance: wallet.ethBalance,
    mode: wallet.mode,
    username: wallet.username,
    isLoading: wallet.isLoading,
    error: wallet.error,
    strikePrice: wallet.strikePrice,
    createdAt: wallet.createdAt,
    initialUsdValue: wallet.initialUsdValue,
    walletId: wallet.walletId,
    userId: wallet.userId,
    
    // Firebase State
    firebaseWallet,
    volatilityData,
    
    // Actions
    connectWallet,
    disconnectWallet,
    updateBalance,
    addBalance,
    restoreWallet,
    createFreshSimulationWallet,
    refreshWallet,
    
    // Utilities
    formatAddress,
    formatBalance,
    hasEnoughBalance,
    isSimulationMode,
    
    // Volatility Functions (legacy support)
    getCurrentUsdValue,
    getProfitLoss,
    getWalletPerformance
  };
};