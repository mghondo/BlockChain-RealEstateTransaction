import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WalletService } from './wallet.service';

export interface Network {
  chainId: number;
  name: string;
  displayName: string;
  symbol: string;
  decimals: number;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrl?: string;
  isTestnet: boolean;
  isSupported: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface NetworkConfig {
  preferredNetwork: number;
  supportedNetworks: number[];
  autoSwitchEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private readonly _currentNetwork = new BehaviorSubject<Network | null>(null);
  private readonly _supportedNetworks = new BehaviorSubject<Network[]>([]);
  private readonly _networkConfig = new BehaviorSubject<NetworkConfig>({
    preferredNetwork: 1, // Ethereum Mainnet
    supportedNetworks: [1, 137], // Ethereum, Polygon
    autoSwitchEnabled: false
  });

  public readonly currentNetwork$ = this._currentNetwork.asObservable();
  public readonly supportedNetworks$ = this._supportedNetworks.asObservable();
  public readonly networkConfig$ = this._networkConfig.asObservable();

  // Predefined networks configuration
  private readonly NETWORKS: Record<number, Network> = {
    // Ethereum Mainnet
    1: {
      chainId: 1,
      name: 'ethereum',
      displayName: 'Ethereum Mainnet',
      symbol: 'ETH',
      decimals: 18,
      rpcUrls: ['https://mainnet.infura.io/v3/'],
      blockExplorerUrls: ['https://etherscan.io'],
      iconUrl: '/assets/networks/ethereum.svg',
      isTestnet: false,
      isSupported: true,
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    },
    // Polygon
    137: {
      chainId: 137,
      name: 'polygon',
      displayName: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
      rpcUrls: ['https://polygon-rpc.com/'],
      blockExplorerUrls: ['https://polygonscan.com'],
      iconUrl: '/assets/networks/polygon.svg',
      isTestnet: false,
      isSupported: true,
      nativeCurrency: {
        name: 'Polygon',
        symbol: 'MATIC',
        decimals: 18
      }
    },
    // Sepolia Testnet (Ethereum)
    11155111: {
      chainId: 11155111,
      name: 'sepolia',
      displayName: 'Sepolia Testnet',
      symbol: 'ETH',
      decimals: 18,
      rpcUrls: ['https://sepolia.infura.io/v3/'],
      blockExplorerUrls: ['https://sepolia.etherscan.io'],
      iconUrl: '/assets/networks/ethereum.svg',
      isTestnet: true,
      isSupported: true,
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    },
    // Polygon Mumbai (Testnet)
    80002: {
      chainId: 80002,
      name: 'polygon-amoy',
      displayName: 'Polygon Amoy Testnet',
      symbol: 'MATIC',
      decimals: 18,
      rpcUrls: ['https://rpc-amoy.polygon.technology/'],
      blockExplorerUrls: ['https://amoy.polygonscan.com'],
      iconUrl: '/assets/networks/polygon.svg',
      isTestnet: true,
      isSupported: true,
      nativeCurrency: {
        name: 'Polygon',
        symbol: 'MATIC',
        decimals: 18
      }
    }
  };

  constructor(private walletService: WalletService) {
    this.initializeService();
  }

  private initializeService(): void {
    // Initialize supported networks
    this._supportedNetworks.next(Object.values(this.NETWORKS).filter(network => network.isSupported));

    // Listen to wallet state changes to update current network
    this.walletService.walletState$.subscribe(state => {
      if (state.chainId) {
        const network = this.getNetworkById(state.chainId);
        this._currentNetwork.next(network);
      } else {
        this._currentNetwork.next(null);
      }
    });
  }

  public getNetworkById(chainId: number): Network | null {
    return this.NETWORKS[chainId] || null;
  }

  public getAllNetworks(): Network[] {
    return Object.values(this.NETWORKS);
  }

  public getSupportedNetworks(): Network[] {
    return this._supportedNetworks.value;
  }

  public getMainnetNetworks(): Network[] {
    return this.getSupportedNetworks().filter(network => !network.isTestnet);
  }

  public getTestnetNetworks(): Network[] {
    return this.getSupportedNetworks().filter(network => network.isTestnet);
  }

  public async switchNetwork(chainId: number): Promise<void> {
    const network = this.getNetworkById(chainId);
    if (!network) {
      throw new Error(`Network with chain ID ${chainId} is not configured`);
    }

    if (!network.isSupported) {
      throw new Error(`Network ${network.displayName} is not supported`);
    }

    try {
      await this.walletService.switchNetwork(chainId);
    } catch (error: any) {
      if (error.message === 'Network not added to MetaMask') {
        // Try to add the network first
        await this.addNetwork(network);
        // Then try to switch again
        await this.walletService.switchNetwork(chainId);
      } else {
        throw error;
      }
    }
  }

  public async addNetwork(network: Network): Promise<void> {
    await this.walletService.addNetwork({
      chainId: network.chainId,
      name: network.displayName,
      symbol: network.symbol,
      rpcUrl: network.rpcUrls[0],
      blockExplorerUrl: network.blockExplorerUrls[0]
    });
  }

  public isNetworkSupported(chainId: number): boolean {
    const network = this.getNetworkById(chainId);
    return network?.isSupported || false;
  }

  public requireSupportedNetwork(): void {
    const currentState = this.walletService.currentState;
    if (!currentState.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!currentState.chainId || !this.isNetworkSupported(currentState.chainId)) {
      throw new Error('Please switch to a supported network');
    }
  }

  public async ensureSupportedNetwork(): Promise<void> {
    const currentState = this.walletService.currentState;
    
    if (!currentState.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!currentState.chainId || !this.isNetworkSupported(currentState.chainId)) {
      const config = this._networkConfig.value;
      const preferredNetwork = this.getNetworkById(config.preferredNetwork);
      
      if (preferredNetwork && config.autoSwitchEnabled) {
        await this.switchNetwork(config.preferredNetwork);
      } else {
        throw new Error(`Please switch to a supported network: ${this.getSupportedNetworks().map(n => n.displayName).join(', ')}`);
      }
    }
  }

  public updateNetworkConfig(config: Partial<NetworkConfig>): void {
    const currentConfig = this._networkConfig.value;
    const updatedConfig = { ...currentConfig, ...config };
    this._networkConfig.next(updatedConfig);
    
    // Save to localStorage for persistence
    localStorage.setItem('fracEstate_networkConfig', JSON.stringify(updatedConfig));
  }

  public getNetworkConfig(): NetworkConfig {
    return this._networkConfig.value;
  }

  private loadNetworkConfig(): NetworkConfig {
    try {
      const saved = localStorage.getItem('fracEstate_networkConfig');
      if (saved) {
        return { ...this._networkConfig.value, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Error loading network config from localStorage:', error);
    }
    return this._networkConfig.value;
  }

  public getNetworkExplorerUrl(txHash?: string, address?: string): string {
    const currentNetwork = this._currentNetwork.value;
    if (!currentNetwork) return '';

    const baseUrl = currentNetwork.blockExplorerUrls[0];
    
    if (txHash) {
      return `${baseUrl}/tx/${txHash}`;
    } else if (address) {
      return `${baseUrl}/address/${address}`;
    }
    
    return baseUrl;
  }

  public getNetworkRpcUrl(): string {
    const currentNetwork = this._currentNetwork.value;
    return currentNetwork?.rpcUrls[0] || '';
  }

  public isMainnet(): boolean {
    const currentNetwork = this._currentNetwork.value;
    return currentNetwork ? !currentNetwork.isTestnet : false;
  }

  public isTestnet(): boolean {
    const currentNetwork = this._currentNetwork.value;
    return currentNetwork?.isTestnet || false;
  }

  public getCurrentNetworkName(): string {
    const currentNetwork = this._currentNetwork.value;
    return currentNetwork?.displayName || 'Unknown Network';
  }

  public getCurrentNetworkSymbol(): string {
    const currentNetwork = this._currentNetwork.value;
    return currentNetwork?.symbol || 'ETH';
  }

  public addCustomNetwork(network: Omit<Network, 'isSupported'>): void {
    const customNetwork: Network = {
      ...network,
      isSupported: true
    };

    this.NETWORKS[network.chainId] = customNetwork;
    
    // Update supported networks list
    this._supportedNetworks.next(Object.values(this.NETWORKS).filter(n => n.isSupported));
  }

  public removeCustomNetwork(chainId: number): void {
    if (this.NETWORKS[chainId] && !this.isDefaultNetwork(chainId)) {
      delete this.NETWORKS[chainId];
      this._supportedNetworks.next(Object.values(this.NETWORKS).filter(n => n.isSupported));
    }
  }

  private isDefaultNetwork(chainId: number): boolean {
    // Default networks that cannot be removed
    const defaultChainIds = [1, 137, 11155111, 80002];
    return defaultChainIds.includes(chainId);
  }

  public getGasPrice(chainId?: number): Promise<string> {
    // This could be extended to get gas prices from different sources based on network
    // For now, we'll use the Web3Service to get current gas price
    return this.walletService.getProvider()?.getFeeData().then(data => data.gasPrice?.toString() || '0') || Promise.resolve('0');
  }

  public getEstimatedBlockTime(chainId?: number): number {
    const targetChainId = chainId || this._currentNetwork.value?.chainId;
    
    switch (targetChainId) {
      case 1: // Ethereum
        return 12000; // 12 seconds
      case 137: // Polygon
        return 2000; // 2 seconds
      case 11155111: // Sepolia
        return 12000; // 12 seconds
      case 80002: // Polygon Amoy
        return 2000; // 2 seconds
      default:
        return 12000; // Default to Ethereum timing
    }
  }

  public formatNetworkName(chainId: number): string {
    const network = this.getNetworkById(chainId);
    return network ? network.displayName : `Chain ID: ${chainId}`;
  }
}
