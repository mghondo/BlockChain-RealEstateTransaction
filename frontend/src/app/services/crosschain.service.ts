import { Injectable } from '@angular/core';
import { ethers, Contract } from 'ethers';
import { Observable, BehaviorSubject, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Web3Service } from './web3.service';

export interface BridgeTransaction {
  id: string;
  fromChain: number;
  toChain: number;
  amount: string;
  shares: number;
  buyer: string;
  status: 'pending' | 'confirmed' | 'bridging' | 'completed' | 'failed';
  txHash?: string;
  bridgeMessageId?: string;
  timestamp: number;
  estimatedCompletionTime?: number;
}

export interface GasEstimation {
  polygonDeposit: bigint;
  ethereumReceive: bigint;
  layerZeroFee: bigint;
  totalGasUSD: number;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  contracts: {
    usdc: string;
    bridge?: string;
    escrow?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CrossChainService {
  private readonly POLYGON_BRIDGE_ABI = [
    "function depositForEscrow(uint16 _dstChainId, address _escrowContract, uint256 _shares) external payable",
    "function estimateFees(uint16 _dstChainId, bytes calldata _payload, bool _useZro, bytes calldata _adapterParams) external view returns (uint256 nativeFee, uint256 zroFee)",
    "function bridgeRequests(uint256) view returns (tuple(address buyer, uint256 amount, uint256 shares, uint256 timestamp, bool processed))",
    "function getBridgeRequestCount() view returns (uint256)",
    "function getUserBridgeRequests(address user) view returns (uint256[])",
    "event BridgeRequestCreated(uint256 indexed requestId, address indexed buyer, uint256 amount, uint256 shares, uint256 timestamp)",
    "event BridgeCompleted(uint256 indexed requestId, bytes32 indexed messageId)"
  ];

  private readonly ESCROW_CROSSCHAIN_ABI = [
    "function receiveCrossChainDeposit(address _buyer, uint256 _amount, uint256 _shares) external",
    "function crossChainDeposits(address) view returns (uint256 amount, uint256 shares, uint256 timestamp, bool processed)",
    "event CrossChainDepositReceived(address indexed buyer, uint256 amount, uint256 shares, uint256 timestamp)"
  ];

  private readonly USDC_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  private readonly CHAIN_CONFIGS: { [chainId: number]: ChainConfig } = {
    1: { // Ethereum Mainnet
      chainId: 1,
      name: 'Ethereum',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      blockExplorer: 'https://etherscan.io',
      contracts: {
        usdc: '0xA0b86a33E6441097ab5bD5d82B06Ed196fAb36e8', // Mock for local development
        escrow: '0x0000000000000000000000000000000000000000' // To be set dynamically
      }
    },
    137: { // Polygon Mainnet
      chainId: 137,
      name: 'Polygon',
      rpcUrl: 'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorer: 'https://polygonscan.com',
      contracts: {
        usdc: '0x2791Bca1f2de4661ED88A30c3ddEFd809Bd54D22',
        bridge: '0x0000000000000000000000000000000000000000' // To be deployed
      }
    },
    // Local development chains
    31337: { // Hardhat local
      chainId: 31337,
      name: 'Hardhat Local',
      rpcUrl: 'http://127.0.0.1:8546',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      blockExplorer: '',
      contracts: {
        usdc: '0x0000000000000000000000000000000000000000', // Mock USDC
        escrow: '0x0000000000000000000000000000000000000000'
      }
    },
    80001: { // Polygon Mumbai Testnet
      chainId: 80001,
      name: 'Polygon Mumbai',
      rpcUrl: 'https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorer: 'https://mumbai.polygonscan.com',
      contracts: {
        usdc: '0x0FA8781a83E46826621b3BC094Ea2A0212e3b27E', // Mumbai USDC
        bridge: '0x0000000000000000000000000000000000000000'
      }
    }
  };

  private bridgeTransactionsSubject = new BehaviorSubject<BridgeTransaction[]>([]);
  public bridgeTransactions$ = this.bridgeTransactionsSubject.asObservable();

  private currentChainSubject = new BehaviorSubject<number>(31337);
  public currentChain$ = this.currentChainSubject.asObservable();

  constructor(private web3Service: Web3Service) {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      const provider = await this.web3Service.getProvider();
      if (provider) {
        const network = await provider.getNetwork();
        this.currentChainSubject.next(Number(network.chainId));
      }
    } catch (error) {
      console.warn('Failed to initialize cross-chain service:', error);
    }
  }

  async switchToChain(chainId: number): Promise<boolean> {
    try {
      const provider = await this.web3Service.getProvider();
      const signer = await this.web3Service.getSigner();
      
      if (!provider || !signer) {
        throw new Error('Provider or signer not available');
      }

      if (signer.provider && 'send' in signer.provider) {
        await signer.provider.send('wallet_switchEthereumChain', [
          { chainId: `0x${chainId.toString(16)}` }
        ]);
        
        this.currentChainSubject.next(chainId);
        return true;
      }
      
      return false;
    } catch (error: any) {
      if (error.code === 4902) {
        return await this.addChainToWallet(chainId);
      }
      console.error('Failed to switch chain:', error);
      return false;
    }
  }

  private async addChainToWallet(chainId: number): Promise<boolean> {
    const config = this.CHAIN_CONFIGS[chainId];
    if (!config) return false;

    try {
      const signer = await this.web3Service.getSigner();
      if (signer && signer.provider && 'send' in signer.provider) {
        await signer.provider.send('wallet_addEthereumChain', [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName: config.name,
            rpcUrls: [config.rpcUrl],
            nativeCurrency: config.nativeCurrency,
            blockExplorerUrls: [config.blockExplorer]
          }
        ]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add chain to wallet:', error);
      return false;
    }
  }

  async estimateGas(
    propertyAddress: string,
    shares: number,
    amount: string
  ): Promise<GasEstimation> {
    try {
      const provider = await this.web3Service.getProvider();
      if (!provider) throw new Error('Provider not available');

      const currentChain = Number((await provider.getNetwork()).chainId);
      const polygonConfig = this.CHAIN_CONFIGS[137] || this.CHAIN_CONFIGS[80001];
      const ethereumConfig = this.CHAIN_CONFIGS[1] || this.CHAIN_CONFIGS[31337];

      // Create bridge contract instance
      let bridgeContract: Contract | null = null;
      if (polygonConfig.contracts.bridge) {
        bridgeContract = new Contract(
          polygonConfig.contracts.bridge,
          this.POLYGON_BRIDGE_ABI,
          provider
        );
      }

      // Estimate LayerZero fees
      let layerZeroFee = BigInt(0);
      if (bridgeContract) {
        try {
          const payload = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'uint256', 'uint256'],
            [await this.web3Service.getAccount(), amount, shares]
          );
          
          const [nativeFee] = await bridgeContract['estimateFees'](
            ethereumConfig.chainId === 1 ? 101 : 10121, // LayerZero chain IDs
            payload,
            false,
            '0x'
          );
          layerZeroFee = nativeFee;
        } catch (error) {
          console.warn('Could not estimate LayerZero fees, using default:', error);
          layerZeroFee = ethers.parseEther('0.01'); // Default estimate
        }
      }

      // Estimate gas costs (rough estimates)
      const polygonDeposit = ethers.parseUnits('0.005', 'ether'); // ~0.005 MATIC
      const ethereumReceive = ethers.parseUnits('0.02', 'ether'); // ~0.02 ETH

      // Convert to USD (using rough estimates)
      const maticPrice = 0.8; // USD
      const ethPrice = 2000; // USD
      const totalGasUSD = 
        (Number(ethers.formatEther(polygonDeposit)) * maticPrice) +
        (Number(ethers.formatEther(ethereumReceive)) * ethPrice) +
        (Number(ethers.formatEther(layerZeroFee)) * maticPrice);

      return {
        polygonDeposit,
        ethereumReceive,
        layerZeroFee,
        totalGasUSD
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      // Return default estimates
      return {
        polygonDeposit: ethers.parseUnits('0.005', 'ether'),
        ethereumReceive: ethers.parseUnits('0.02', 'ether'),
        layerZeroFee: ethers.parseUnits('0.01', 'ether'),
        totalGasUSD: 15
      };
    }
  }

  async getUSDCBalance(chainId?: number): Promise<string> {
    try {
      const provider = await this.web3Service.getProvider();
      const account = await this.web3Service.getAccount();
      
      if (!provider || !account) return '0';

      const currentChain = chainId || Number((await provider.getNetwork()).chainId);
      const config = this.CHAIN_CONFIGS[currentChain];
      
      if (!config?.contracts.usdc) return '0';

      const usdcContract = new Contract(
        config.contracts.usdc,
        this.USDC_ABI,
        provider
      );

      const balance = await usdcContract['balanceOf'](account);
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return '0';
    }
  }

  async approveUSDC(amount: string, spenderAddress: string): Promise<Observable<any>> {
    try {
      const provider = await this.web3Service.getProvider();
      const signer = await this.web3Service.getSigner();
      
      if (!provider || !signer) {
        throw new Error('Provider or signer not available');
      }

      const currentChain = Number((await provider.getNetwork()).chainId);
      const config = this.CHAIN_CONFIGS[currentChain];
      
      if (!config?.contracts.usdc) {
        throw new Error('USDC contract not configured for current chain');
      }

      const usdcContract = new Contract(
        config.contracts.usdc,
        this.USDC_ABI,
        signer
      );

      const amountWei = ethers.parseUnits(amount, 6);
      const tx = await usdcContract['approve'](spenderAddress, amountWei);
      
      return from(tx.wait()).pipe(
        map(receipt => ({
          success: true,
          transactionHash: (receipt as any).hash,
          blockNumber: (receipt as any).blockNumber
        })),
        catchError(error => throwError(() => error))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  async initiateCrossChainDeposit(
    escrowAddress: string,
    amount: string,
    shares: number
  ): Promise<Observable<BridgeTransaction>> {
    try {
      const provider = await this.web3Service.getProvider();
      const signer = await this.web3Service.getSigner();
      const account = await this.web3Service.getAccount();
      
      if (!provider || !signer || !account) {
        throw new Error('Web3 components not available');
      }

      const currentChain = Number((await provider.getNetwork()).chainId);
      const config = this.CHAIN_CONFIGS[currentChain];
      
      if (!config?.contracts.bridge) {
        throw new Error('Bridge contract not available on current chain');
      }

      const bridgeContract = new Contract(
        config.contracts.bridge,
        this.POLYGON_BRIDGE_ABI,
        signer
      );

      // Get gas estimation for LayerZero fee
      const gasEstimation = await this.estimateGas(escrowAddress, shares, amount);
      
      // Create bridge transaction record
      const bridgeTransaction: BridgeTransaction = {
        id: `bridge-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        fromChain: currentChain,
        toChain: 1, // Ethereum mainnet (or local equivalent)
        amount,
        shares,
        buyer: account,
        status: 'pending',
        timestamp: Date.now(),
        estimatedCompletionTime: Date.now() + (10 * 60 * 1000) // 10 minutes
      };

      // Execute the cross-chain deposit
      const ethereumChainId = currentChain === 31337 ? 10121 : 101; // LayerZero chain IDs
      const tx = await bridgeContract['depositForEscrow'](
        ethereumChainId,
        escrowAddress,
        shares,
        { value: gasEstimation.layerZeroFee }
      );

      bridgeTransaction.txHash = tx.hash;
      bridgeTransaction.status = 'confirmed';

      // Update the transactions list
      const currentTransactions = this.bridgeTransactionsSubject.value;
      this.bridgeTransactionsSubject.next([...currentTransactions, bridgeTransaction]);

      // Return observable that tracks the transaction
      return from(tx.wait()).pipe(
        map(receipt => {
          bridgeTransaction.status = 'bridging';
          this.updateBridgeTransaction(bridgeTransaction);
          
          // Start monitoring for completion
          this.monitorBridgeCompletion(bridgeTransaction);
          
          return bridgeTransaction;
        }),
        catchError(error => {
          bridgeTransaction.status = 'failed';
          this.updateBridgeTransaction(bridgeTransaction);
          return throwError(() => error);
        })
      );

    } catch (error) {
      return throwError(() => error);
    }
  }

  private updateBridgeTransaction(updatedTransaction: BridgeTransaction): void {
    const currentTransactions = this.bridgeTransactionsSubject.value;
    const index = currentTransactions.findIndex(tx => tx.id === updatedTransaction.id);
    
    if (index !== -1) {
      currentTransactions[index] = updatedTransaction;
      this.bridgeTransactionsSubject.next([...currentTransactions]);
    }
  }

  private async monitorBridgeCompletion(bridgeTransaction: BridgeTransaction): Promise<void> {
    // Simulate monitoring LayerZero message propagation
    // In production, this would listen to LayerZero events and destination chain confirmations
    
    setTimeout(() => {
      bridgeTransaction.status = 'completed';
      this.updateBridgeTransaction(bridgeTransaction);
    }, 5000); // Simulate 5 second completion for demo
  }

  async getBridgeHistory(userAddress?: string): Promise<BridgeTransaction[]> {
    const account = userAddress || await this.web3Service.getAccount();
    if (!account) return [];

    return this.bridgeTransactionsSubject.value.filter(tx => 
      tx.buyer.toLowerCase() === account.toLowerCase()
    );
  }

  getChainConfig(chainId: number): ChainConfig | undefined {
    return this.CHAIN_CONFIGS[chainId];
  }

  getSupportedChains(): ChainConfig[] {
    return Object.values(this.CHAIN_CONFIGS);
  }

  isChainSupported(chainId: number): boolean {
    return chainId in this.CHAIN_CONFIGS;
  }
}