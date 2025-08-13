import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ethers } from 'ethers';
import type { WalletState, Network, TokenBalance, ContractInstances } from '../types/web3';

interface Web3State {
  wallet: WalletState;
  currentNetwork: Network | null;
  supportedNetworks: Network[];
  tokenBalances: TokenBalance[];
  contracts: ContractInstances;
}

type Web3Action = 
  | { type: 'SET_WALLET_STATE'; payload: Partial<WalletState> }
  | { type: 'SET_NETWORK'; payload: Network | null }
  | { type: 'SET_TOKEN_BALANCES'; payload: TokenBalance[] }
  | { type: 'SET_CONTRACTS'; payload: Partial<ContractInstances> }
  | { type: 'DISCONNECT_WALLET' };

interface Web3ContextType {
  state: Web3State;
  dispatch: React.Dispatch<Web3Action>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  updateBalance: () => Promise<void>;
  isMetaMaskInstalled: boolean;
}

const SUPPORTED_NETWORKS: Network[] = [
  {
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false
  },
  {
    chainId: 137,
    name: 'polygon',
    displayName: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
    isTestnet: false
  },
  {
    chainId: 11155111,
    name: 'sepolia',
    displayName: 'Sepolia Testnet',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true
  },
  {
    chainId: 80002,
    name: 'polygon-amoy',
    displayName: 'Polygon Amoy',
    symbol: 'MATIC',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true
  }
];

const initialState: Web3State = {
  wallet: {
    isConnected: false,
    account: null,
    chainId: null,
    balance: '0.0',
    provider: null,
    isLoading: false,
    error: null
  },
  currentNetwork: null,
  supportedNetworks: SUPPORTED_NETWORKS,
  tokenBalances: [],
  contracts: {
    realEstate: null,
    escrow: null,
    mockUSDC: null,
    crossChainEscrow: null
  }
};

function web3Reducer(state: Web3State, action: Web3Action): Web3State {
  switch (action.type) {
    case 'SET_WALLET_STATE':
      return {
        ...state,
        wallet: { ...state.wallet, ...action.payload }
      };
    case 'SET_NETWORK':
      return {
        ...state,
        currentNetwork: action.payload
      };
    case 'SET_TOKEN_BALANCES':
      return {
        ...state,
        tokenBalances: action.payload
      };
    case 'SET_CONTRACTS':
      return {
        ...state,
        contracts: { ...state.contracts, ...action.payload }
      };
    case 'DISCONNECT_WALLET':
      return {
        ...state,
        wallet: initialState.wallet,
        currentNetwork: null,
        tokenBalances: [],
        contracts: initialState.contracts
      };
    default:
      return state;
  }
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(web3Reducer, initialState);

  const isMetaMaskInstalled = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;

  useEffect(() => {
    if (isMetaMaskInstalled) {
      initializeWallet();
      setupEventListeners();
    }
  }, [isMetaMaskInstalled]);

  const initializeWallet = async () => {
    if (!isMetaMaskInstalled) {
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: { error: 'MetaMask is not installed' }
      });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: { provider }
      });

      // Check if already connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        await handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: { error: 'Failed to initialize wallet' }
      });
    }
  };

  const setupEventListeners = () => {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', (chainId: string) => {
      handleChainChanged(parseInt(chainId, 16));
    });
    window.ethereum.on('disconnect', disconnectWallet);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', disconnectWallet);
      }
    };
  };

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
      return;
    }

    const account = accounts[0];
    const chainId = await getChainId();
    const network = SUPPORTED_NETWORKS.find(n => n.chainId === chainId) || null;

    dispatch({
      type: 'SET_WALLET_STATE',
      payload: {
        account,
        chainId,
        isConnected: true,
        isLoading: false,
        error: null
      }
    });

    dispatch({ type: 'SET_NETWORK', payload: network });
    await updateBalance();
  };

  const handleChainChanged = (chainId: number) => {
    const network = SUPPORTED_NETWORKS.find(n => n.chainId === chainId) || null;
    
    dispatch({
      type: 'SET_WALLET_STATE',
      payload: { chainId }
    });
    
    dispatch({ type: 'SET_NETWORK', payload: network });
    updateBalance();
  };

  const getChainId = async (): Promise<number> => {
    if (!window.ethereum) return 1;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Error getting chain ID:', error);
      return 1;
    }
  };

  const connectWallet = async (): Promise<void> => {
    if (!isMetaMaskInstalled) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    dispatch({
      type: 'SET_WALLET_STATE',
      payload: { isLoading: true, error: null }
    });

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        await handleAccountsChanged(accounts);
      } else {
        throw new Error('No accounts returned from MetaMask');
      }
    } catch (error: any) {
      console.error('Error connecting to wallet:', error);
      let errorMessage = 'Failed to connect to MetaMask';
      
      if (error.code === 4001) {
        errorMessage = 'Connection rejected by user';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending';
      }
      
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: {
          isLoading: false,
          error: errorMessage
        }
      });
      throw new Error(errorMessage);
    }
  };

  const disconnectWallet = () => {
    dispatch({ type: 'DISCONNECT_WALLET' });
  };

  const switchNetwork = async (chainId: number): Promise<void> => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    dispatch({
      type: 'SET_WALLET_STATE',
      payload: { isLoading: true }
    });

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: { isLoading: false }
      });
    } catch (error: any) {
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: { isLoading: false }
      });
      
      if (error.code === 4902) {
        throw new Error('Network not added to MetaMask');
      }
      throw error;
    }
  };

  const updateBalance = async (): Promise<void> => {
    const { account, provider } = state.wallet;
    if (!account || !provider) return;

    try {
      const balance = await provider.getBalance(account);
      const balanceInEth = ethers.formatEther(balance);
      
      dispatch({
        type: 'SET_WALLET_STATE',
        payload: { balance: balanceInEth }
      });
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        state,
        dispatch,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        updateBalance,
        isMetaMaskInstalled
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3Context(): Web3ContextType {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Context must be used within a Web3Provider');
  }
  return context;
}