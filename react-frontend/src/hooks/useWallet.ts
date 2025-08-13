import { useCallback } from 'react';
import { useWeb3Context } from '../contexts/Web3Context';

export function useWallet() {
  const { state, connectWallet, disconnectWallet, switchNetwork, updateBalance, isMetaMaskInstalled } = useWeb3Context();

  const formatAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, []);

  const isSupportedNetwork = useCallback((chainId: number): boolean => {
    return state.supportedNetworks.some(network => network.chainId === chainId);
  }, [state.supportedNetworks]);

  const getNetworkName = useCallback((chainId: number): string => {
    const network = state.supportedNetworks.find(n => n.chainId === chainId);
    return network?.displayName || `Chain ID: ${chainId}`;
  }, [state.supportedNetworks]);

  return {
    // State
    walletState: state.wallet,
    currentNetwork: state.currentNetwork,
    supportedNetworks: state.supportedNetworks,
    isMetaMaskInstalled,
    
    // Computed values
    isConnected: state.wallet.isConnected,
    account: state.wallet.account,
    balance: state.wallet.balance,
    chainId: state.wallet.chainId,
    isLoading: state.wallet.isLoading,
    error: state.wallet.error,
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    updateBalance,
    
    // Utilities
    formatAddress,
    isSupportedNetwork,
    getNetworkName
  };
}