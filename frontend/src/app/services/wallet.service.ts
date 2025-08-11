import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ethers } from 'ethers';

export interface WalletState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  balance: string;
  provider: ethers.BrowserProvider | null;
  isLoading: boolean;
  error: string | null;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorerUrl: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly _walletState = new BehaviorSubject<WalletState>({
    isConnected: false,
    account: null,
    chainId: null,
    balance: '0.0',
    provider: null,
    isLoading: false,
    error: null
  });

  public readonly walletState$ = this._walletState.asObservable();
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    this.initializeWallet();
    this.setupEventListeners();
  }

  get currentState(): WalletState {
    return this._walletState.value;
  }

  get isMetaMaskInstalled(): boolean {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  }

  private async initializeWallet(): Promise<void> {
    if (!this.isMetaMaskInstalled) {
      this.updateState({ error: 'MetaMask is not installed' });
      return;
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check if already connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      this.updateState({ error: 'Failed to initialize wallet' });
    }
  }

  private setupEventListeners(): void {
    if (!window.ethereum) return;

    // Account changed
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      this.handleAccountsChanged(accounts);
    });

    // Network changed
    window.ethereum.on('chainChanged', (chainId: string) => {
      this.handleChainChanged(parseInt(chainId, 16));
    });

    // Disconnected
    window.ethereum.on('disconnect', () => {
      this.disconnect();
    });
  }

  public async connect(): Promise<void> {
    if (!this.isMetaMaskInstalled) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    this.updateState({ isLoading: true, error: null });

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        await this.handleAccountsChanged(accounts);
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
      
      this.updateState({ 
        isLoading: false, 
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }
  }

  public disconnect(): void {
    this.updateState({
      isConnected: false,
      account: null,
      chainId: null,
      balance: '0.0',
      provider: null,
      isLoading: false,
      error: null
    });
    this.provider = null;
  }

  private async handleAccountsChanged(accounts: string[]): Promise<void> {
    if (accounts.length === 0) {
      this.disconnect();
      return;
    }

    const account = accounts[0];
    const chainId = await this.getChainId();
    
    this.updateState({ 
      account, 
      chainId, 
      isConnected: true, 
      isLoading: false,
      error: null 
    });

    // Update balance
    await this.updateBalance(account);
  }

  private handleChainChanged(chainId: number): void {
    this.updateState({ chainId });
    
    // Refresh balance when chain changes
    if (this.currentState.account) {
      this.updateBalance(this.currentState.account);
    }
  }

  private async getChainId(): Promise<number> {
    if (!window.ethereum) return 1;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainId, 16);
    } catch (error) {
      console.error('Error getting chain ID:', error);
      return 1; // Default to Ethereum mainnet
    }
  }

  public async updateBalance(account?: string): Promise<void> {
    const targetAccount = account || this.currentState.account;
    if (!targetAccount || !this.provider) return;

    try {
      const balance = await this.provider.getBalance(targetAccount);
      const balanceInEth = ethers.formatEther(balance);
      
      this.updateState({ balance: balanceInEth });
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }

  public async switchNetwork(chainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    this.updateState({ isLoading: true });

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      
      this.updateState({ isLoading: false });
    } catch (error: any) {
      this.updateState({ isLoading: false });
      
      if (error.code === 4902) {
        throw new Error('Network not added to MetaMask');
      }
      throw error;
    }
  }

  public async addNetwork(network: NetworkInfo): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${network.chainId.toString(16)}`,
          chainName: network.name,
          nativeCurrency: {
            name: network.name,
            symbol: network.symbol,
            decimals: 18,
          },
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.blockExplorerUrl],
        }],
      });
    } catch (error) {
      console.error('Error adding network:', error);
      throw error;
    }
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.provider || !this.currentState.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const signer = await this.provider.getSigner();
      return await signer.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  public getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  public async getSigner(): Promise<ethers.JsonRpcSigner | null> {
    if (!this.provider) return null;
    
    try {
      return await this.provider.getSigner();
    } catch (error) {
      console.error('Error getting signer:', error);
      return null;
    }
  }

  private updateState(partialState: Partial<WalletState>): void {
    const currentState = this._walletState.value;
    this._walletState.next({ ...currentState, ...partialState });
  }

  // Utility method to get formatted address
  public formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  // Utility method to check if current network is supported
  public isSupportedNetwork(chainId: number): boolean {
    const supportedChains = [1, 137]; // Ethereum Mainnet, Polygon
    return supportedChains.includes(chainId);
  }

  public getNetworkName(chainId: number): string {
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      137: 'Polygon',
      11155111: 'Sepolia Testnet',
      80002: 'Polygon Mumbai'
    };
    
    return networks[chainId] || `Chain ID: ${chainId}`;
  }
}
