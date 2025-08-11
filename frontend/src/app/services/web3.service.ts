import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { ethers, Contract, formatUnits, parseUnits } from 'ethers';
import { WalletService } from './wallet.service';

export interface TokenBalance {
  symbol: string;
  balance: string;
  formatted: string;
  decimals: number;
  contractAddress: string;
}

export interface ContractConfig {
  address: string;
  abi: any[];
  name: string;
}

export interface TransactionRequest {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface TransactionResponse {
  hash: string;
  blockNumber: number | null;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
}

// Standard ERC20 ABI for token interactions
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private readonly _tokenBalances = new BehaviorSubject<TokenBalance[]>([]);
  public readonly tokenBalances$ = this._tokenBalances.asObservable();

  // Contract addresses for different networks
  private readonly CONTRACT_ADDRESSES = {
    ethereum: {
      usdc: '0xA0b86a33E6441e6e80188a82E1a133c2De6E9764', // USDC on Ethereum mainnet
    },
    polygon: {
      usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    },
    sepolia: {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia (testnet)
    }
  };

  // Supported tokens configuration
  private readonly SUPPORTED_TOKENS = [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      addresses: {
        1: this.CONTRACT_ADDRESSES.ethereum.usdc,
        137: this.CONTRACT_ADDRESSES.polygon.usdc,
        11155111: this.CONTRACT_ADDRESSES.sepolia.usdc,
      }
    }
  ];

  constructor(private walletService: WalletService) {
    this.initializeService();
  }

  // Provider methods
  async getProvider(): Promise<ethers.BrowserProvider> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }
    return provider;
  }

  async getSigner(): Promise<ethers.JsonRpcSigner | null> {
    return this.walletService.getSigner();
  }

  private initializeService(): void {
    // Listen to wallet state changes
    this.walletService.walletState$.subscribe(state => {
      if (state.isConnected && state.account) {
        this.loadTokenBalances(state.account, state.chainId || 1);
      } else {
        this._tokenBalances.next([]);
      }
    });
  }

  public async loadTokenBalances(account: string, chainId: number): Promise<void> {
    const provider = this.walletService.getProvider();
    if (!provider) return;

    const balances: TokenBalance[] = [];

    for (const token of this.SUPPORTED_TOKENS) {
      const contractAddress = token.addresses[chainId as keyof typeof token.addresses];
      if (!contractAddress) continue;

      try {
        const contract = new Contract(contractAddress, ERC20_ABI, provider);
        const balance = await contract['balanceOf'](account);
        const formatted = formatUnits(balance, token.decimals);

        balances.push({
          symbol: token.symbol,
          balance: balance.toString(),
          formatted: parseFloat(formatted).toFixed(2),
          decimals: token.decimals,
          contractAddress
        });
      } catch (error) {
        console.error(`Error loading ${token.symbol} balance:`, error);
      }
    }

    this._tokenBalances.next(balances);
  }

  public async getTokenBalance(tokenAddress: string, account: string): Promise<TokenBalance | null> {
    const provider = this.walletService.getProvider();
    if (!provider) return null;

    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, provider);
      
      const [balance, symbol, decimals] = await Promise.all([
        contract['balanceOf'](account),
        contract['symbol'](),
        contract['decimals']()
      ]);

      const formatted = formatUnits(balance, decimals);

      return {
        symbol,
        balance: balance.toString(),
        formatted: parseFloat(formatted).toFixed(2),
        decimals,
        contractAddress: tokenAddress
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      return null;
    }
  }

  public async approveToken(
    tokenAddress: string, 
    spenderAddress: string, 
    amount: string, 
    decimals: number = 18
  ): Promise<TransactionResponse> {
    const signer = await this.walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      const parsedAmount = parseUnits(amount, decimals);
      
      const tx = await contract['approve'](spenderAddress, parsedAmount);
      
      return {
        hash: tx.hash,
        blockNumber: null,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error approving token:', error);
      throw error;
    }
  }

  public async transferToken(
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals: number = 18
  ): Promise<TransactionResponse> {
    const signer = await this.walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      const parsedAmount = parseUnits(amount, decimals);
      
      const tx = await contract['transfer'](toAddress, parsedAmount);
      
      return {
        hash: tx.hash,
        blockNumber: null,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error transferring token:', error);
      throw error;
    }
  }

  public async getContract(contractConfig: ContractConfig): Promise<Contract | null> {
    const provider = this.walletService.getProvider();
    if (!provider) return null;

    try {
      return new Contract(contractConfig.address, contractConfig.abi, provider);
    } catch (error) {
      console.error('Error creating contract instance:', error);
      return null;
    }
  }

  public async getContractWithSigner(contractConfig: ContractConfig): Promise<Contract | null> {
    const signer = await this.walletService.getSigner();
    if (!signer) return null;

    try {
      return new Contract(contractConfig.address, contractConfig.abi, signer);
    } catch (error) {
      console.error('Error creating contract instance with signer:', error);
      return null;
    }
  }

  public async sendTransaction(txRequest: TransactionRequest): Promise<TransactionResponse> {
    const signer = await this.walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await signer.sendTransaction({
        to: txRequest.to,
        value: txRequest.value ? parseUnits(txRequest.value, 'ether') : undefined,
        data: txRequest.data,
        gasLimit: txRequest.gasLimit,
        gasPrice: txRequest.gasPrice
      });

      return {
        hash: tx.hash,
        blockNumber: null,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  public async waitForTransaction(txHash: string): Promise<TransactionResponse> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const receipt = await provider.waitForTransaction(txHash);
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      return {
        hash: txHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString()
      };
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      return {
        hash: txHash,
        blockNumber: null,
        status: 'failed'
      };
    }
  }

  public async estimateGas(txRequest: TransactionRequest): Promise<string> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const gasEstimate = await provider.estimateGas({
        to: txRequest.to,
        value: txRequest.value ? parseUnits(txRequest.value, 'ether') : undefined,
        data: txRequest.data
      });

      return gasEstimate.toString();
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }

  public async getGasPrice(): Promise<string> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const feeData = await provider.getFeeData();
      return feeData.gasPrice?.toString() || '0';
    } catch (error) {
      console.error('Error getting gas price:', error);
      throw error;
    }
  }

  public getTokenAddress(symbol: string, chainId: number): string | null {
    const token = this.SUPPORTED_TOKENS.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
    if (!token) return null;

    return token.addresses[chainId as keyof typeof token.addresses] || null;
  }

  public getSupportedTokens(chainId: number) {
    return this.SUPPORTED_TOKENS.filter(token => 
      token.addresses[chainId as keyof typeof token.addresses]
    );
  }

  public formatAmount(amount: string, decimals: number, precision: number = 2): string {
    const formatted = formatUnits(amount, decimals);
    return parseFloat(formatted).toFixed(precision);
  }

  public parseAmount(amount: string, decimals: number): string {
    return parseUnits(amount, decimals).toString();
  }

  // Utility method to check if an address is a valid Ethereum address
  public isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // Utility method to get current block number
  public async getCurrentBlockNumber(): Promise<number> {
    const provider = this.walletService.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    return await provider.getBlockNumber();
  }
}
