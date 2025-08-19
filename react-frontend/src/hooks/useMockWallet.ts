import { useState, useCallback, useEffect } from 'react';
import { WalletData, MockWalletData, RealWalletData } from '../components/MockWallet/MockWallet';
import { simulationWalletService, SimulationWallet } from '../services/firebaseService';
import { useCryptoPrices } from './useCryptoPrices';

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

export const useMockWallet = () => {
  const { prices } = useCryptoPrices();
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

  // Generate or get stored user ID for Firebase queries
  const getUserId = useCallback((): string => {
    let userId = localStorage.getItem('simulationUserId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('simulationUserId', userId);
      console.log('🆔 Generated new user ID:', userId);
    }
    return userId;
  }, []);

  // Try to restore simulation wallet from Firebase on init
  useEffect(() => {
    const restoreWalletFromFirebase = async () => {
      console.log('🔄 useMockWallet hook initializing - attempting Firebase restore...');
      
      try {
        setWallet(prev => ({ ...prev, isLoading: true }));
        
        const userId = getUserId();
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
  }, [getUserId]);

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
      // Save to Firebase first
      const userId = getUserId();
      const walletCreateData = {
        userId,
        address: mockWalletData.address,
        ethBalance: mockWalletData.ethBalance,
        strikePrice: mockWalletData.strikePrice || prices?.ethToUsd || 3200,
        initialUsdValue: mockWalletData.initialUsdValue || 20000,
        username: mockWalletData.username,
        isActive: true
      };
      
      console.log('🎮 Creating wallet in Firebase with data:', walletCreateData);
      const firebaseWalletId = await simulationWalletService.createWallet(walletCreateData);
      
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
    
    console.log('🔌 Wallet disconnected');
  }, [wallet.mode, wallet.walletId]);

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
    // In simulation mode, don't add external balance to maintain consistent $20k
    if (wallet.mode === 'simulation') {
      console.log('💰 Simulation mode: Not adding external balance to maintain $20k starting amount');
      return;
    }
    
    setWallet(prev => ({
      ...prev,
      ethBalance: prev.ethBalance + ethAmount
    }));
  }, [wallet.mode]);

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

  const formatBalance = useCallback((balance: number, decimals: number = 4): string => {
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