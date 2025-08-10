# FracEstate: Cross-Chain Fractional Real Estate Tokenization

**FracEstate** is a decentralized application (**DApp**) built on **Ethereum** that revolutionizes real estate investment by enabling **fractional ownership** through the **ERC-1155** standard. Each property is tokenized into exactly **100 shares**, making it accessible for retail investors. The DApp supports multiple buyers, uses **USDC** stablecoin for payments, generates yield via **Aave v3**, and features cross-chain deposit capabilities through **LayerZero** protocol.

---

## 📋 Overview

**FracEstate** transforms real estate transactions by tokenizing properties into **ERC-1155 NFTs**, split into 100 shares for shared ownership. An advanced escrow contract ensures secure, transparent, and profitable transactions using **USDC** payments and **Aave yield**. The platform has been upgraded to include **cross-chain functionality**, enabling users to deposit USDC from **Polygon** to **Ethereum** while maintaining all core features including yield generation and fractional ownership.

### Key Features
- **Property Tokenization**: Sellers mint properties as ERC-1155 NFTs with 100 shares and IPFS metadata
- **Fractional Purchases**: Multiple buyers commit to shares (e.g., 50/50 for two buyers), depositing proportional USDC
- **Cross-Chain Deposits**: Low-cost USDC deposits from Polygon to Ethereum via LayerZero
- **Escrow Process**: Phased transactions with inspections, approvals, and funding, earning ~5% APY via Aave
- **24-Hour Timelock**: Enhanced security with mandatory withdrawal delays
- **KYC Integration**: Regulatory compliance through oracle-based verification
- **Yield Distribution**: Seller receives principal + yield on finalization; buyers/lender receive proportional yield on cancellation if inspection fails
- **Security**: Role-based access, phase enforcement, reentrancy protection, and cross-chain security measures

---

## 🌉 Cross-Chain Architecture

### Core Components

**LayerZero Integration**
- Secure, decentralized cross-chain messaging protocol
- Polygon to Ethereum USDC bridging with automatic processing
- Emergency refund mechanism for failed transactions
- Nonce-based replay protection

**Enhanced Security Features**
- **24-Hour Timelock**: All withdrawals (finalize/cancel) require 24-hour delay
- **KYC Verification**: Mandatory KYC for all participants via oracle
- **Gas Optimizations**: Reduced gas costs through contract optimizations
- **Cross-Chain Security**: LayerZero trusted remote configuration

### Contract Architecture

1. **EscrowWithStableAndYieldCrossChain.sol** (Ethereum)
   - Main escrow contract with LayerZero receiver capabilities
   - 24-hour timelock for withdrawals
   - KYC verification integration
   - Multi-buyer fractional ownership support

2. **PolygonUSDCBridge.sol** (Polygon)
   - USDC collection and LayerZero message sending
   - Refund mechanism for failed transfers
   - Gas estimation for cross-chain operations

3. **KYCOracle.sol**
   - KYC verification management with batch support
   - Expiration-based verification system
   - Integration with escrow contracts

4. **RealEstate.sol**
   - ERC-1155 fractional ownership NFTs
   - Fixed 100 shares per property
   - IPFS metadata storage

---

## 🏠 Fractional Ownership

**FracEstate** uses the **ERC-1155** standard to tokenize properties into **100 fixed shares**, enabling retail investors to purchase affordable fractions (e.g., $1,000/share for a $100,000 property). This upgrade from **ERC-721** supports multiple owners, reducing entry barriers and enhancing liquidity.

### Implementation Details
- **Minting**: `RealEstate.sol` mints 100 shares per property to the seller, storing metadata URIs (e.g., IPFS for property details)
- **Share Allocation**: Escrow contract initializes buyers with shares summing to 100 (e.g., [30, 70] or [25, 25, 25, 25])
- **Transfers**: On finalization, shares are distributed via `safeTransferFrom` to buyers based on their allocation
- **Cross-Chain Compatible**: Shares can be allocated through cross-chain deposits

### Benefits
- Affordable fractions for retail investors
- Tradeable shares compatible with wallets and exchanges
- Cross-chain accessibility for global investors
- Comprehensive testing in `RealEstate.js` and `CrossChainRealEstate.js`

---

## 🔒 Enhanced Escrow Functionality

The escrow system manages secure, phased transactions with **USDC** and **Aave yield**, upgraded for multi-buyer fractional ownership and cross-chain capabilities.

| **Phase**             | **Description**                                                                 |
|-----------------------|---------------------------------------------------------------------------------|
| Created (0)           | Escrow initialized with buyers, shares, and property details                   |
| EarnestDeposited (1)  | Buyers deposit proportional USDC earnest (via Ethereum or cross-chain)        |
| Approved (2)          | Inspector sets pass/fail; all buyers, seller, and lender approve              |
| FullyFunded (3)       | Lender deposits remaining USDC (e.g., $80,000 for $100,000 price)            |
| Completed (4)         | Principal + yield withdrawn from Aave, funds to seller, shares to buyers      |
| Cancelled (5)         | Refunds principal + proportional yield to buyers/lender (if inspection fails) |

### Security Features

**Timelock Protection**
```solidity
struct TimelockAction {
    uint256 executeAfter;
    bool isPending;
    bytes32 actionType;
}
```
- 24-hour mandatory delay for all withdrawals
- Protection against bridge-related attacks
- Separate timelocks for finalization and cancellation

**KYC Integration**
```solidity
modifier onlyKYCVerified(address user) {
    if (!config.kycOracle.isKYCVerified(user)) {
        revert KYCNotVerified(user);
    }
    _;
}
```
- All participants must be KYC verified
- Expiration-based verification system
- Batch verification for efficiency

---

## 🌍 User Flow

### 1. Setup Phase
```solidity
// Deploy contracts on both chains
// Verify KYC for all participants
await kycOracle.verifyKYC(buyerAddress, validityPeriod);

// Initialize buyers and shares
await escrow.initializeBuyers([buyer1, buyer2], [50, 50]);
```

### 2. Cross-Chain Deposit (Polygon → Ethereum)
```solidity
// Approve USDC on Polygon
await polygonUSDC.approve(bridge.address, amount);

// Estimate LayerZero fees
const [fee, ] = await bridge.estimateFee(amount, shares, false, "0x");

// Initiate cross-chain deposit
await bridge.initiateDeposit(amount, shares, "0x", { value: fee });
```

### 3. Automatic Processing on Ethereum
- LayerZero delivers message to escrow contract
- KYC verification checked automatically
- USDC supplied to Aave for yield generation
- Phase progression tracked

### 4. Transaction Finalization with Timelock
```solidity
// Initiate 24-hour timelock
await escrow.initiateFinalizeSale();

// Wait 24 hours, then execute
await escrow.finalizeSale(); // After timelock expires
```

---

## 🛠️ Requirements

- **Node.js**: v20.x LTS recommended for Hardhat compatibility (v18.20.8 may cause issues, see [Hardhat Node.js versions](https://hardhat.org/nodejs-versions))
- **Hardhat**: For development, testing, and deployment
- **Dependencies**: `@openzeppelin/contracts`, `@layerzerolabs/solidity-examples`, `@chainlink/contracts`, `dotenv`
- **Ethereum Wallet**: MetaMask or similar with private key in `.env` for deployment

---

## ⚙️ Setup & Installation

### Prerequisites
```bash
npm install @layerzerolabs/solidity-examples @chainlink/contracts
```

### 1. Clone and Install
```bash
git clone <repository-url>
cd dapp_solidity_Course_1
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```env
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=your_sepolia_rpc_url
POLYGON_RPC_URL=your_polygon_rpc_url
```

### 3. Compile Contracts
```bash
npx hardhat compile
```

### 4. Run Tests
```bash
# Core functionality tests
npx hardhat test test/RealEstate.js

# Cross-chain functionality tests
npx hardhat test test/CrossChainRealEstate.js
```

### 5. Local Development
```bash
# Start local Hardhat node
npx hardhat node

# Deploy contracts locally
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deploy-crosschain.js --network localhost
```

### 6. Multi-Chain Deployment

**Deploy on Ethereum:**
```bash
npx hardhat run scripts/deploy-crosschain.js --network ethereum
```

**Deploy on Polygon:**
```bash
npx hardhat run scripts/deploy-crosschain.js --network polygon
```

**Configure LayerZero Endpoints:**
```solidity
// Set trusted remotes on both chains
await escrow.setTrustedRemote(polygonChainId, polygonBridgeAddress);
await bridge.setTrustedRemote(ethereumChainId, escrowAddress);
```

---

## 📜 Contract Overview

### Core Contracts

| **Contract**                              | **Chain**    | **Description**                                                    |
|-------------------------------------------|--------------|-------------------------------------------------------------------|
| `RealEstate.sol`                         | Ethereum     | ERC-1155 contract minting properties with 100 shares             |
| `EscrowWithStableAndYieldCrossChain.sol` | Ethereum     | Main escrow with cross-chain and timelock capabilities           |
| `PolygonUSDCBridge.sol`                  | Polygon      | USDC collection and LayerZero message sending                    |
| `KYCOracle.sol`                          | Both         | KYC verification management                                       |

### Legacy/Testing Contracts

| **Contract**                     | **Description**                                                    |
|----------------------------------|--------------------------------------------------------------------|
| `EscrowWithStableAndYield.sol`   | Original USDC/Aave escrow for multi-buyer transactions           |
| `Escrow.sol`                     | Legacy ETH-based escrow for single-buyer (reference only)        |
| `MockUSDC.sol`                   | Mock USDC token (6 decimals) for testing                         |
| `MockAUSDC.sol`                  | Mock aUSDC simulating Aave yield (~5% APY)                       |
| `MockAavePool.sol`               | Mock Aave pool for supply/withdrawal testing                     |
| `MockLZEndpoint.sol`             | Mock LayerZero endpoint for cross-chain testing                  |

---

## 🧪 Testing

### Comprehensive Test Suite

The testing suite covers both core functionality and cross-chain operations:

**Core Tests (`test/RealEstate.js`)**
- Contract deployments and initialization
- Minting of 100 shares to the seller
- Multi-buyer initialization (e.g., [50, 50] shares)
- Successful sales with proportional deposits, approvals, funding, and share transfers
- Cancellations with proportional yield refunds

**Cross-Chain Tests (`test/CrossChainRealEstate.js`)**
- KYC verification workflows
- 24-hour timelock mechanisms
- Cross-chain deposit simulation
- Gas cost validation
- Complete transaction flows
- LayerZero message handling

### Gas Optimization Results

The implementation includes several gas optimizations:

- **Function Splitting**: Large functions broken into smaller internal functions
- **Struct Packing**: Efficient storage layout
- **Compiler Optimization**: Enabled with 200 runs
- **Batch Operations**: KYC verification supports batch processing

**Estimated Gas Costs:**
- Timelock Initiation: ~150,000 gas
- Timelock Execution: ~400,000 gas
- Cross-chain deposit: ~180,000 gas
- KYC verification: ~80,000 gas

---

## 🚀 Production Considerations

### 1. LayerZero Configuration
- Use actual LayerZero endpoints for mainnet
- Configure proper chain IDs (Ethereum: 101, Polygon: 109)
- Set up monitoring for cross-chain messages
- Implement proper gas estimation

### 2. USDC Bridge Setup
- Implement proper USDC bridging mechanism
- Consider using established bridges (Polygon PoS Bridge)
- Add slippage protection
- Monitor bridge liquidity

### 3. Oracle Integration
- Replace mock KYC oracle with real provider (e.g., Chainlink, Civic)
- Implement proper oracle fallbacks
- Add oracle price feeds for gas estimation
- Regular oracle data updates

### 4. Security & Monitoring
- Comprehensive smart contract audits
- Track cross-chain transaction success rates
- Monitor gas costs and optimize
- Implement emergency pause mechanisms
- Multi-signature wallet integration

---

## 🌟 Real-World Alignment

This implementation aligns with current tokenized real estate trends:

- **RealT**: Similar fractional ownership model with $50-$1000 shares
- **Centrifuge**: Asset tokenization with DeFi yield integration
- **Cross-Chain Adoption**: Multi-chain strategy reduces barriers to entry
- **Compliance First**: KYC integration ensures regulatory compliance
- **Yield Generation**: Automated DeFi integration for passive income

---

## 📈 Future Enhancements

### Phase 1: Multi-Asset Support
- Support for different stablecoins (USDT, DAI, FRAX)
- Multiple yield strategies across DeFi protocols
- Automated yield optimization

### Phase 2: Governance & Management
- DAO voting for property management decisions
- Shareholder governance for major decisions
- Property maintenance and rental management

### Phase 3: Advanced Features
- Insurance layer protection against smart contract risks
- Mobile-first UX for retail investors
- Integration with traditional real estate platforms
- Automated property valuation through oracles

### Phase 4: Ecosystem Expansion
- Support for additional chains (Arbitrum, Optimism, BSC)
- Integration with existing DeFi protocols
- Marketplace for trading fractional shares
- Rental yield distribution mechanisms

---

## 📊 Example Contract Addresses

```
Ethereum Mainnet:
- KYC Oracle: 0x1234...abcd
- RealEstate NFT: 0x5678...efgh
- Cross-Chain Escrow: 0x9abc...1234

Polygon Mainnet:
- USDC Bridge: 0xdef0...5678
- LayerZero Endpoint: 0x3c2269811836af69497E5F486A85D7316753cf62

Testnets (Sepolia & Mumbai):
- Available for development and testing
```

---

## 📚 Resources & Documentation

### Technical References
- [LayerZero Documentation](https://layerzero.gitbook.io/)
- [Aave v3 Documentation](https://docs.aave.com/developers/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [ERC-1155 Standard](https://eips.ethereum.org/EIPS/eip-1155)

### Hardhat & Development
- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Node.js Versions](https://hardhat.org/nodejs-versions)
- [Ethers.js Documentation](https://docs.ethers.io/)

---

## 📝 Important Notes

- **Retail Focus**: The 100-share model supports affordable fractions, extensively tested with multiple buyers
- **Yield Generation**: 90-day yield simulation in tests reflects realistic escrow durations  
- **Security**: Professional audit recommended for production deployment, especially for Aave/ERC-1155 and cross-chain risks
- **KYC Compliance**: Essential for regulatory compliance in most jurisdictions
- **Cross-Chain Risks**: Consider LayerZero message delivery delays and potential failures
- **Gas Optimization**: Continuous monitoring and optimization recommended for cost efficiency

### Development Recommendations
- Consider `onlyOwner` modifier for `RealEstate.mint` in production
- Implement comprehensive monitoring for cross-chain operations
- Regular security audits for smart contract updates
- Establish clear governance procedures for protocol upgrades

---

**FracEstate** represents the future of tokenized real estate: accessible, yield-generating, cross-chain compatible, and compliant with regulatory requirements. By bringing DeFi innovation to traditional asset classes, it opens new possibilities for global real estate investment and fractional ownership.