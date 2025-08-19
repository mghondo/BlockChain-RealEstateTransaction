import { ethers } from 'ethers';
import type { ContractTransaction, TransactionReceipt } from 'ethers';

// Enhanced ABI for the new RealEstate contract functionality
const ENHANCED_REAL_ESTATE_ABI = [
  // Read functions
  "function getShareBalance(uint256 tokenId, address owner) view returns (uint256)",
  "function getPropertyPrice(uint256 tokenId) view returns (uint256)",
  "function getAvailableShares(uint256 tokenId) view returns (uint256)",
  "function getTotalProperties() view returns (uint256)",
  "function propertyExists(uint256 tokenId) view returns (bool)",
  "function properties(uint256 tokenId) view returns (uint256 pricePerShare, uint256 totalShares, uint256 availableShares, string metadataURI, address originalMinter, bool isActive)",
  "function uri(uint256 tokenId) view returns (string)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  
  // Write functions
  "function mint(string tokenURI, uint256 pricePerShare) returns (uint256)",
  "function purchaseShares(uint256 tokenId, uint256 amount) payable",
  "function transferShares(uint256 tokenId, address to, uint256 amount)",
  "function updatePropertyPrice(uint256 tokenId, uint256 newPrice)",
  "function deactivateProperty(uint256 tokenId)",
  
  // Events
  "event PropertyMinted(uint256 indexed tokenId, address indexed minter, uint256 pricePerShare, string uri)",
  "event SharesPurchased(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 totalCost)",
  "event SharesTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 amount)",
  "event PropertyPriceUpdated(uint256 indexed tokenId, uint256 newPrice)"
];

export interface PropertyData {
  tokenId: number;
  pricePerShare: bigint;
  totalShares: number;
  availableShares: number;
  metadataURI: string;
  originalMinter: string;
  isActive: boolean;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  gasUsed?: bigint;
  error?: string;
}

export interface MintResult {
  tokenId: number;
  transaction: TransactionStatus;
}

export interface PurchaseResult {
  tokenId: number;
  shares: number;
  totalCost: bigint;
  transaction: TransactionStatus;
}

export class Web3Service {
  private static instance: Web3Service;
  private provider: ethers.BrowserProvider | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;

  private constructor() {}

  static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  // Initialize with provider and contract address
  async initialize(provider: ethers.BrowserProvider, contractAddress: string): Promise<void> {
    try {
      this.provider = provider;
      this.contractAddress = contractAddress;
      
      const signer = await provider.getSigner();
      this.contract = new ethers.Contract(contractAddress, ENHANCED_REAL_ESTATE_ABI, signer);
      
      console.log('🔗 Web3Service initialized with contract:', contractAddress);
    } catch (error) {
      console.error('❌ Failed to initialize Web3Service:', error);
      throw new Error(`Failed to initialize Web3Service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if service is ready
  isReady(): boolean {
    return !!(this.provider && this.contract && this.contractAddress);
  }

  // Estimate gas for a function call
  private async estimateGas(method: string, ...args: any[]): Promise<bigint> {
    if (!this.contract) throw new Error('Contract not initialized');
    
    try {
      const gasEstimate = await this.contract[method].estimateGas(...args);
      // Add 20% buffer for gas estimation
      return (gasEstimate * BigInt(120)) / BigInt(100);
    } catch (error) {
      console.error(`❌ Gas estimation failed for ${method}:`, error);
      // Return default gas limit if estimation fails
      return BigInt(300000);
    }
  }

  // Monitor transaction status
  private async monitorTransaction(txHash: string): Promise<TransactionStatus> {
    if (!this.provider) throw new Error('Provider not initialized');

    try {
      const receipt = await this.provider.waitForTransaction(txHash, 1, 30000); // 30 second timeout
      
      if (receipt) {
        return {
          hash: txHash,
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          confirmations: 1,
          gasUsed: receipt.gasUsed
        };
      } else {
        return {
          hash: txHash,
          status: 'failed',
          confirmations: 0,
          error: 'Transaction timeout'
        };
      }
    } catch (error) {
      return {
        hash: txHash,
        status: 'failed',
        confirmations: 0,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  // Mint a new property NFT
  async mintProperty(tokenURI: string, pricePerShareEth: number): Promise<MintResult> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const pricePerShareWei = ethers.parseEther(pricePerShareEth.toString());
      
      console.log('🏠 Minting property:', { tokenURI, pricePerShareEth });
      
      // Estimate gas
      const gasLimit = await this.estimateGas('mint', tokenURI, pricePerShareWei);
      
      // Execute transaction
      const tx: ContractTransaction = await this.contract.mint(tokenURI, pricePerShareWei, {
        gasLimit
      });

      console.log('⏳ Property minting transaction sent:', tx.hash);

      // Monitor transaction
      const txStatus = await this.monitorTransaction(tx.hash);
      
      if (txStatus.status === 'confirmed') {
        // Get the minted token ID from transaction receipt
        const receipt = await this.provider!.getTransactionReceipt(tx.hash);
        const tokenId = await this.getTokenIdFromReceipt(receipt);
        
        console.log('✅ Property minted successfully:', { tokenId, txHash: tx.hash });
        
        return {
          tokenId,
          transaction: txStatus
        };
      } else {
        throw new Error(txStatus.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('❌ Property minting failed:', error);
      throw new Error(`Failed to mint property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Purchase shares of a property
  async purchaseShares(tokenId: number, shares: number): Promise<PurchaseResult> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      console.log('💰 Purchasing shares:', { tokenId, shares });
      
      // Get property price
      const pricePerShare = await this.contract.getPropertyPrice(tokenId);
      const totalCost = pricePerShare * BigInt(shares);
      
      // Estimate gas
      const gasLimit = await this.estimateGas('purchaseShares', tokenId, shares);
      
      // Execute transaction
      const tx: ContractTransaction = await this.contract.purchaseShares(tokenId, shares, {
        value: totalCost,
        gasLimit
      });

      console.log('⏳ Share purchase transaction sent:', tx.hash);

      // Monitor transaction
      const txStatus = await this.monitorTransaction(tx.hash);
      
      if (txStatus.status === 'confirmed') {
        console.log('✅ Shares purchased successfully:', { tokenId, shares, totalCost });
        
        return {
          tokenId,
          shares,
          totalCost,
          transaction: txStatus
        };
      } else {
        throw new Error(txStatus.error || 'Transaction failed');
      }
    } catch (error) {
      console.error('❌ Share purchase failed:', error);
      throw new Error(`Failed to purchase shares: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Transfer shares to another address
  async transferShares(tokenId: number, toAddress: string, shares: number): Promise<TransactionStatus> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      console.log('📤 Transferring shares:', { tokenId, toAddress, shares });
      
      // Estimate gas
      const gasLimit = await this.estimateGas('transferShares', tokenId, toAddress, shares);
      
      // Execute transaction
      const tx: ContractTransaction = await this.contract.transferShares(tokenId, toAddress, shares, {
        gasLimit
      });

      console.log('⏳ Share transfer transaction sent:', tx.hash);

      // Monitor transaction
      const txStatus = await this.monitorTransaction(tx.hash);
      
      if (txStatus.status === 'confirmed') {
        console.log('✅ Shares transferred successfully:', { tokenId, toAddress, shares });
      }
      
      return txStatus;
    } catch (error) {
      console.error('❌ Share transfer failed:', error);
      throw new Error(`Failed to transfer shares: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get share balance for a user
  async getPropertyShares(tokenId: number, userAddress: string): Promise<number> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const balance = await this.contract.getShareBalance(tokenId, userAddress);
      return Number(balance);
    } catch (error) {
      console.error('❌ Failed to get share balance:', error);
      return 0;
    }
  }

  // Get property details
  async getPropertyDetails(tokenId: number): Promise<PropertyData | null> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const [pricePerShare, totalShares, availableShares, metadataURI, originalMinter, isActive] = 
        await this.contract.properties(tokenId);
      
      return {
        tokenId,
        pricePerShare,
        totalShares: Number(totalShares),
        availableShares: Number(availableShares),
        metadataURI,
        originalMinter,
        isActive
      };
    } catch (error) {
      console.error('❌ Failed to get property details:', error);
      return null;
    }
  }

  // Get total number of properties
  async getTotalProperties(): Promise<number> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const total = await this.contract.getTotalProperties();
      return Number(total);
    } catch (error) {
      console.error('❌ Failed to get total properties:', error);
      return 0;
    }
  }

  // Get property price per share
  async getPropertyPrice(tokenId: number): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const price = await this.contract.getPropertyPrice(tokenId);
      return ethers.formatEther(price);
    } catch (error) {
      console.error('❌ Failed to get property price:', error);
      return '0';
    }
  }

  // Check if property exists
  async propertyExists(tokenId: number): Promise<boolean> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      return await this.contract.propertyExists(tokenId);
    } catch (error) {
      console.error('❌ Failed to check property existence:', error);
      return false;
    }
  }

  // Helper function to extract token ID from transaction receipt
  private async getTokenIdFromReceipt(receipt: TransactionReceipt | null): Promise<number> {
    if (!receipt || !this.contract) throw new Error('Invalid receipt or contract');

    try {
      // Look for PropertyMinted event
      const iface = new ethers.Interface(ENHANCED_REAL_ESTATE_ABI);
      
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsed && parsed.name === 'PropertyMinted') {
            return Number(parsed.args.tokenId);
          }
        } catch {
          // Skip logs that don't match our interface
          continue;
        }
      }
      
      // Fallback: get current total properties
      const total = await this.getTotalProperties();
      return total;
    } catch (error) {
      console.error('❌ Failed to extract token ID from receipt:', error);
      throw new Error('Could not determine minted token ID');
    }
  }

  // Get current gas price
  async getCurrentGasPrice(): Promise<bigint> {
    if (!this.provider) throw new Error('Provider not initialized');

    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || BigInt(0);
    } catch (error) {
      console.error('❌ Failed to get gas price:', error);
      return BigInt(0);
    }
  }

  // Get user's ETH balance
  async getEthBalance(address: string): Promise<string> {
    if (!this.provider) throw new Error('Provider not initialized');

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get ETH balance:', error);
      return '0';
    }
  }

  // Cleanup
  dispose(): void {
    this.provider = null;
    this.contract = null;
    this.contractAddress = null;
    console.log('🔌 Web3Service disposed');
  }
}

// Export singleton instance
export const web3Service = Web3Service.getInstance();