# Web3 Integration Guide

## 📋 Overview

This document outlines the enhanced blockchain infrastructure for the FracEstate fractional real estate platform. The implementation bridges the existing React simulation with real smart contract functionality.

## 🏗️ Architecture

### Enhanced Smart Contract (`contracts/RealEstate.sol`)

**Key Features:**
- ✅ **ERC-1155 Fractional Ownership**: Each property has exactly 100 shares
- ✅ **Share Trading**: Users can buy/sell property shares
- ✅ **Ownership Tracking**: Real-time balance queries
- ✅ **Price Management**: Dynamic pricing per property
- ✅ **Purchase Protection**: Reentrancy guards and payment validation

**New Functions:**
```solidity
// Mint new property with pricing
function mint(string tokenURI, uint256 pricePerShare) returns (uint256)

// Purchase shares of a property
function purchaseShares(uint256 tokenId, uint256 amount) payable

// Transfer shares between users
function transferShares(uint256 tokenId, address to, uint256 amount)

// Query functions
function getShareBalance(uint256 tokenId, address owner) view returns (uint256)
function getPropertyPrice(uint256 tokenId) view returns (uint256)
function getAvailableShares(uint256 tokenId) view returns (uint256)
```

### Web3Service Layer (`react-frontend/src/services/web3Service.ts`)

**Features:**
- 🔗 **Smart Contract Integration**: Direct blockchain interaction
- 📊 **Transaction Monitoring**: Real-time status updates
- ⛽ **Gas Estimation**: Automatic gas calculation with safety buffers
- 🛡️ **Error Handling**: Comprehensive error management
- 📈 **Event Tracking**: Property minting and purchase events

**Core Methods:**
```typescript
// Initialize service
await web3Service.initialize(provider, contractAddress);

// Mint property NFT
const result = await web3Service.mintProperty(tokenURI, pricePerShareEth);

// Purchase property shares
const purchase = await web3Service.purchaseShares(tokenId, shares);

// Get user's shares
const balance = await web3Service.getPropertyShares(tokenId, userAddress);
```

## 🚀 Deployment Guide

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your PRIVATE_KEY and ETHERSCAN_API_KEY
```

### 2. Deploy to Sepolia Testnet

```bash
# Compile contracts
npx hardhat compile

# Deploy enhanced RealEstate contract
npx hardhat run scripts/deploy.js --network sepolia
```

**Expected Output:**
```
🚀 Starting Enhanced RealEstate Contract Deployment
✅ Enhanced RealEstate deployed to: 0x...
🏠 Minting sample properties for testing...
📄 Contract Information for Frontend Integration:
Contract Address: 0x...
```

### 3. Update Frontend Configuration

Update `react-frontend/src/contracts/abis.ts`:
```typescript
export const CONTRACT_ADDRESSES = {
  11155111: { // Sepolia
    RealEstate: "0xYourDeployedContractAddress",
    // ... other contracts
  }
};
```

### 4. Initialize Web3Service

In your React component:
```typescript
import { web3Service } from '../services/web3Service';
import { useWeb3Context } from '../contexts/Web3Context';

const { state } = useWeb3Context();

// Initialize when wallet connects
useEffect(() => {
  if (state.wallet.provider && contractAddress) {
    web3Service.initialize(state.wallet.provider, contractAddress);
  }
}, [state.wallet.provider]);
```

## 🧪 Testing

### Local Testing

```bash
# Run test suite (after deployment)
cd react-frontend
npm run dev

# In browser console:
import { testWeb3ServiceInConsole } from './src/utils/testWeb3Service';
testWeb3ServiceInConsole();
```

### Integration Test Flow

1. **Connect Real Wallet**: Use MetaMask with Sepolia testnet
2. **Mint Property**: Create a new fractional property NFT
3. **Purchase Shares**: Buy shares with real ETH
4. **Verify Ownership**: Check updated balances
5. **Transfer Shares**: Send shares to another address

## 📊 Current State vs Enhanced State

### Before (Simulation Only)
- ❌ Mock wallet with fake transactions
- ❌ Firebase-only property storage
- ❌ No real blockchain ownership
- ❌ Simulated purchase flow

### After (Blockchain Integrated)
- ✅ Real MetaMask wallet connection
- ✅ Smart contract property ownership
- ✅ Real ETH transactions
- ✅ Verifiable on-chain ownership

## 🔄 Migration Strategy

### Phase 1: Dual Mode (Recommended)
Keep existing simulation while adding real blockchain option:

```typescript
// Enhanced MockWallet component
<Button onClick={connectRealWallet}>Connect Real Wallet</Button>
<Button onClick={connectMockWallet}>Use Simulation</Button>
```

### Phase 2: Smart Contract Integration
Update purchase flow to use Web3Service:

```typescript
// In PropertyDetailModal
const handleInvest = async () => {
  if (isSimulationMode) {
    // Existing mock flow
    await processInvestment(...);
  } else {
    // New blockchain flow
    await web3Service.purchaseShares(propertyId, shares);
  }
};
```

## 🚨 Security Considerations

### Smart Contract Security
- ✅ **ReentrancyGuard**: Prevents reentrancy attacks
- ✅ **Access Control**: Only minter can update prices
- ✅ **Input Validation**: Comprehensive parameter checking
- ✅ **Safe Math**: Built-in overflow protection in Solidity 0.8+

### Frontend Security
- ✅ **Private Key Protection**: Never expose private keys
- ✅ **Transaction Validation**: Verify all parameters before sending
- ✅ **Gas Limit Safety**: 20% buffer on gas estimates
- ✅ **Error Handling**: Graceful failure handling

## 🔧 Configuration

### Network Configuration
```javascript
// hardhat.config.js
networks: {
  sepolia: {
    url: "https://rpc.sepolia.org",
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

### Frontend Environment
```typescript
// Support multiple networks
export const SUPPORTED_NETWORKS = [
  { chainId: 11155111, name: 'Sepolia Testnet' },
  { chainId: 1, name: 'Ethereum Mainnet' }
];
```

## 📈 Next Steps

### Immediate (Ready to Implement)
1. Deploy contract to Sepolia testnet
2. Update frontend configuration
3. Test property minting and purchasing
4. Integrate with existing UI components

### Medium Term
1. Add rental income distribution
2. Implement secondary market trading
3. Add property appreciation tracking
4. Create portfolio analytics

### Long Term
1. Multi-chain support (Polygon, Arbitrum)
2. Cross-chain property trading
3. DeFi integration (yield farming)
4. DAO governance for property decisions

## 🆘 Troubleshooting

### Common Issues

**Contract Not Found**
```
Error: Contract not initialized
```
**Solution**: Ensure contract address is correct and network matches

**Insufficient Gas**
```
Error: Transaction failed - out of gas
```
**Solution**: Increase gas limit or check contract state

**MetaMask Connection**
```
Error: MetaMask not detected
```
**Solution**: Install MetaMask and refresh page

### Debug Commands

```bash
# Check contract deployment
npx hardhat verify --network sepolia 0xContractAddress

# Check wallet balance
npx hardhat console --network sepolia
> (await ethers.getSigners())[0].getBalance()

# Test contract interaction
> const contract = await ethers.getContractAt("RealEstate", "0xAddress")
> await contract.getTotalProperties()
```

## 📞 Support

For implementation questions or issues:
1. Check the test suite in `testWeb3Service.ts`
2. Review the deployment logs
3. Test with small amounts first
4. Use Sepolia testnet for development

---

**Status**: ✅ Ready for Integration  
**Last Updated**: August 2025  
**Compatibility**: React 19+, Ethers.js 6+, Solidity 0.8.9