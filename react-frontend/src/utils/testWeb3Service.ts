// Test utility for Web3Service integration
import { ethers } from 'ethers';
import { web3Service, type PropertyData, type MintResult } from '../services/web3Service';

interface TestConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
}

export class Web3ServiceTester {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private browserProvider: ethers.BrowserProvider | null = null;

  constructor(private config: TestConfig) {}

  // Initialize with test configuration
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Web3Service test environment...');
      
      // Create provider and wallet for testing
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
      
      // Create browser provider wrapper for compatibility
      this.browserProvider = {
        ...this.provider,
        getSigner: async () => this.wallet,
        getNetwork: () => this.provider!.getNetwork(),
        getBalance: (address: string) => this.provider!.getBalance(address),
        getTransactionReceipt: (hash: string) => this.provider!.getTransactionReceipt(hash),
        waitForTransaction: (hash: string, confirmations?: number, timeout?: number) => 
          this.provider!.waitForTransaction(hash, confirmations, timeout),
        getFeeData: () => this.provider!.getFeeData()
      } as ethers.BrowserProvider;

      // Initialize Web3Service
      await web3Service.initialize(this.browserProvider, this.config.contractAddress);
      
      console.log('✅ Web3Service test environment initialized');
      console.log(`   Wallet: ${this.wallet.address}`);
      console.log(`   Contract: ${this.config.contractAddress}`);
      console.log(`   Balance: ${ethers.formatEther(await this.provider.getBalance(this.wallet.address))} ETH`);
      
    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error);
      throw error;
    }
  }

  // Test property minting
  async testMintProperty(): Promise<MintResult> {
    console.log('\n🏠 Testing property minting...');
    
    const testProperty = {
      uri: "https://ipfs.io/ipfs/QmTestProperty" + Date.now(),
      pricePerShare: 0.1 // 0.1 ETH per share
    };
    
    try {
      const result = await web3Service.mintProperty(testProperty.uri, testProperty.pricePerShare);
      
      console.log('✅ Property minted successfully:');
      console.log(`   Token ID: ${result.tokenId}`);
      console.log(`   Transaction: ${result.transaction.hash}`);
      console.log(`   Status: ${result.transaction.status}`);
      console.log(`   Gas Used: ${result.transaction.gasUsed?.toString()}`);
      
      return result;
    } catch (error) {
      console.error('❌ Property minting failed:', error);
      throw error;
    }
  }

  // Test property details retrieval
  async testGetPropertyDetails(tokenId: number): Promise<PropertyData | null> {
    console.log(`\n📊 Testing property details retrieval for Token ID ${tokenId}...`);
    
    try {
      const details = await web3Service.getPropertyDetails(tokenId);
      
      if (details) {
        console.log('✅ Property details retrieved:');
        console.log(`   Token ID: ${details.tokenId}`);
        console.log(`   Price per share: ${ethers.formatEther(details.pricePerShare)} ETH`);
        console.log(`   Available shares: ${details.availableShares}/${details.totalShares}`);
        console.log(`   Metadata URI: ${details.metadataURI}`);
        console.log(`   Original minter: ${details.originalMinter}`);
        console.log(`   Is active: ${details.isActive}`);
      } else {
        console.log('❌ Property details not found');
      }
      
      return details;
    } catch (error) {
      console.error('❌ Failed to get property details:', error);
      throw error;
    }
  }

  // Test share balance check
  async testGetShareBalance(tokenId: number): Promise<number> {
    console.log(`\n💰 Testing share balance for Token ID ${tokenId}...`);
    
    try {
      const balance = await web3Service.getPropertyShares(tokenId, this.wallet!.address);
      
      console.log('✅ Share balance retrieved:');
      console.log(`   Address: ${this.wallet!.address}`);
      console.log(`   Token ID: ${tokenId}`);
      console.log(`   Shares owned: ${balance}`);
      
      return balance;
    } catch (error) {
      console.error('❌ Failed to get share balance:', error);
      throw error;
    }
  }

  // Test share purchase
  async testPurchaseShares(tokenId: number, shares: number) {
    console.log(`\n🛒 Testing share purchase: ${shares} shares of Token ID ${tokenId}...`);
    
    try {
      // Check if we have enough ETH
      const propertyPrice = await web3Service.getPropertyPrice(tokenId);
      const totalCost = parseFloat(propertyPrice) * shares;
      const balance = await web3Service.getEthBalance(this.wallet!.address);
      
      console.log(`   Price per share: ${propertyPrice} ETH`);
      console.log(`   Total cost: ${totalCost} ETH`);
      console.log(`   Wallet balance: ${balance} ETH`);
      
      if (parseFloat(balance) < totalCost) {
        throw new Error('Insufficient ETH balance for purchase');
      }
      
      const result = await web3Service.purchaseShares(tokenId, shares);
      
      console.log('✅ Shares purchased successfully:');
      console.log(`   Token ID: ${result.tokenId}`);
      console.log(`   Shares: ${result.shares}`);
      console.log(`   Total cost: ${ethers.formatEther(result.totalCost)} ETH`);
      console.log(`   Transaction: ${result.transaction.hash}`);
      console.log(`   Status: ${result.transaction.status}`);
      
      return result;
    } catch (error) {
      console.error('❌ Share purchase failed:', error);
      throw error;
    }
  }

  // Test total properties count
  async testGetTotalProperties(): Promise<number> {
    console.log('\n📈 Testing total properties count...');
    
    try {
      const total = await web3Service.getTotalProperties();
      
      console.log('✅ Total properties retrieved:');
      console.log(`   Total count: ${total}`);
      
      return total;
    } catch (error) {
      console.error('❌ Failed to get total properties:', error);
      throw error;
    }
  }

  // Run comprehensive test suite
  async runTestSuite(): Promise<void> {
    console.log('\n🧪 Starting Web3Service Test Suite');
    console.log('=====================================');
    
    try {
      // Initialize
      await this.initialize();
      
      // Test 1: Get total properties
      const initialTotal = await this.testGetTotalProperties();
      
      // Test 2: Mint a new property
      const mintResult = await this.testMintProperty();
      
      // Test 3: Verify total increased
      const newTotal = await this.testGetTotalProperties();
      console.log(`   Total properties increased: ${initialTotal} → ${newTotal}`);
      
      // Test 4: Get property details
      await this.testGetPropertyDetails(mintResult.tokenId);
      
      // Test 5: Check initial share balance (should be 0)
      await this.testGetShareBalance(mintResult.tokenId);
      
      // Test 6: Purchase shares (if we have enough ETH)
      try {
        await this.testPurchaseShares(mintResult.tokenId, 5); // Buy 5 shares
        
        // Test 7: Check updated share balance
        await this.testGetShareBalance(mintResult.tokenId);
        
        // Test 8: Get updated property details
        await this.testGetPropertyDetails(mintResult.tokenId);
      } catch (purchaseError) {
        console.log('⚠️  Skipping purchase test due to insufficient funds');
      }
      
      console.log('\n🎉 Web3Service Test Suite Completed Successfully!');
      console.log('=====================================');
      
    } catch (error) {
      console.error('\n💥 Test Suite Failed:', error);
      throw error;
    }
  }

  // Cleanup
  dispose(): void {
    web3Service.dispose();
    this.provider = null;
    this.wallet = null;
    this.browserProvider = null;
    console.log('🧹 Test environment cleaned up');
  }
}

// Example usage function
export async function runWeb3Tests(config: TestConfig): Promise<void> {
  const tester = new Web3ServiceTester(config);
  
  try {
    await tester.runTestSuite();
  } finally {
    tester.dispose();
  }
}

// Example configuration for Sepolia testnet
export const SEPOLIA_TEST_CONFIG: TestConfig = {
  rpcUrl: "https://rpc.sepolia.org",
  privateKey: process.env.PRIVATE_KEY || "0x" + "0".repeat(64), // Replace with actual private key
  contractAddress: "0x0000000000000000000000000000000000000000" // Replace with deployed contract address
};

// Console-friendly test runner
export async function testWeb3ServiceInConsole(): Promise<void> {
  console.log('🚨 Web3Service Console Test');
  console.log('Make sure to:');
  console.log('1. Deploy the RealEstate contract first: npm run deploy');
  console.log('2. Update SEPOLIA_TEST_CONFIG with actual values');
  console.log('3. Ensure your wallet has testnet ETH');
  
  // Uncomment and configure for actual testing:
  // await runWeb3Tests(SEPOLIA_TEST_CONFIG);
}