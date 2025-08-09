# FracEstate: Fractional Real Estate Tokenization

**FracEstate** is a decentralized application (**DApp**) built on **Ethereum** that revolutionizes real estate investment by enabling **fractional ownership** through the **ERC-1155** standard. Each property is tokenized into exactly **100 shares**, making it accessible for retail investors. The DApp supports multiple buyers, uses **USDC** stablecoin for payments, and generates yield via **Aave v3**, inspired by platforms like **RealT**.

---

## 📋 Overview

**FracEstate** transforms real estate transactions by tokenizing properties into **ERC-1155 NFTs**, split into 100 shares for shared ownership. An advanced escrow contract ensures secure, transparent, and profitable transactions using **USDC** payments and **Aave yield**. Upgraded from the Dapp University tutorial, it moves from single-owner **ERC-721** to **ERC-1155**, supports multiple buyers, and integrates yield distribution, making it ideal for retail tokenization.

### Key Features
- **Property Tokenization**: Sellers mint properties as ERC-1155 NFTs with 100 shares and IPFS metadata.
- **Fractional Purchases**: Multiple buyers commit to shares (e.g., 50/50 for two buyers), depositing proportional USDC.
- **Escrow Process**: Phased transactions with inspections, approvals, and funding, earning ~5% APY via Aave.
- **Yield Distribution**: Seller receives principal + yield on finalization; buyers/lender receive proportional yield on cancellation if inspection fails.
- **Security**: Role-based access, phase enforcement, and reentrancy protection ensure trustless execution.

---

## 🏠 Fractional Ownership

**FracEstate** uses the **ERC-1155** standard to tokenize properties into **100 fixed shares**, enabling retail investors to purchase affordable fractions (e.g., $1,000/share for a $100,000 property). This upgrade from **ERC-721** supports multiple owners, reducing entry barriers and enhancing liquidity.

- **Minting**: `RealEstate.sol` mints 100 shares per property to the seller, storing metadata URIs (e.g., IPFS for property details).
- **Share Allocation**: Escrow contract initializes buyers with shares summing to 100 (e.g., [30, 70] or [25, 25, 25, 25]).
- **Transfers**: On finalization, shares are distributed via `safeTransferFrom` to buyers based on their allocation.
- **Benefits**:
  - Affordable fractions for retail investors.
  - Tradeable shares compatible with wallets and exchanges.
  - Tested in `RealEstate.js`.

---

## 🔒 Escrow Functionality

The `EscrowWithStableAndYield.sol` contract manages secure, phased transactions with **USDC** and **Aave yield**, upgraded for multi-buyer fractional ownership.

| **Phase**             | **Description**                                                                 |
|-----------------------|---------------------------------------------------------------------------------|
| Created (0)           | Escrow initialized with buyers, shares, and property details.                   |
| EarnestDeposited (1)  | Buyers deposit proportional USDC earnest (e.g., $10,000 for 50 shares).         |
| Approved (2)          | Inspector sets pass/fail; all buyers, seller, and lender approve.               |
| FullyFunded (3)       | Lender deposits remaining USDC (e.g., $80,000 for $100,000 price).             |
| Completed (4)         | Principal + yield withdrawn from Aave, funds to seller, shares to buyers.       |
| Cancelled (5)         | Refunds principal + proportional yield to buyers/lender (if inspection fails).  |

### Escrow Features
- **Deposits**: Proportional USDC earnest supplied to Aave for yield.
- **Approvals**: Role-based functions for inspector, buyers, seller, and lender.
- **Finalization**: Transfers funds to seller and shares to buyers.
- **Cancellation**: Refunds with yield if inspection fails; seller keeps earnest if passed.
- **Upgrades**: Supports multiple buyers, proportional yield distribution, and ERC-1155 compatibility (from single-buyer ERC-721).

> **Note**: The legacy `Escrow.sol` (ETH-based, single-buyer) is included for reference but unused in fractional tests.

---

## 🛠️ Requirements

- **Node.js**: v20.x LTS recommended for Hardhat compatibility (v18.20.8 may cause issues, see [Hardhat Node.js versions](https://hardhat.org/nodejs-versions)).
- **Hardhat**: For development, testing, and deployment.
- **Dependencies**: `@openzeppelin/contracts`, `dotenv`.
- **Ethereum Wallet**: MetaMask or similar with private key in `.env` for deployment.

---

## ⚙️ Setup

Follow these steps to set up and deploy **FracEstate**:

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd dapp_solidity_Course_1
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   - Create a `.env` file in the project root.
   - Add your private key and Sepolia RPC URL (e.g., Infura/Alchemy):
     ```env
     PRIVATE_KEY=your_private_key
     SEPOLIA_RPC_URL=your_sepolia_rpc_url
     ```

4. **Compile Contracts**:
   ```bash
   npx hardhat compile
   ```

5. **Run Tests**:
   ```bash
   npx hardhat test
   ```

6. **Deploy Locally**:
   - Start a Hardhat node:
     ```bash
     npx hardhat node
     ```
   - Deploy contracts:
     ```bash
     npx hardhat run scripts/deploy.js --network localhost
     ```

7. **Deploy to Sepolia**:
   - Update `hardhat.config.js` with Sepolia settings:
     ```javascript
     networks: {
       sepolia: {
         url: process.env.SEPOLIA_RPC_URL,
         accounts: [process.env.PRIVATE_KEY]
       }
     }
     ```
   - Deploy:
     ```bash
     npx hardhat run scripts/deploy.js --network sepolia
     ```

---

## 📜 Contracts

| **Contract**                     | **Description**                                                                 |
|----------------------------------|---------------------------------------------------------------------------------|
| `RealEstate.sol`                 | ERC-1155 contract minting properties with 100 shares and IPFS URI storage.      |
| `EscrowWithStableAndYield.sol`   | USDC/Aave escrow for multi-buyer fractional transactions.                       |
| `Escrow.sol`                     | Legacy ETH-based escrow for single-buyer (unused in fractional tests).          |
| `MockUSDC.sol`                   | Mock USDC token (6 decimals) for testing.                                       |
| `MockAUSDC.sol`                  | Mock aUSDC simulating Aave yield (~5% APY).                                     |
| `MockAavePool.sol`               | Mock Aave pool for supply/withdrawal testing.                                   |

---

## 🧪 Testing

The `test/RealEstate.js` suite verifies:
- Contract deployments.
- Minting of 100 shares to the seller.
- Multi-buyer initialization (e.g., [50, 50] shares).
- Successful sales with proportional deposits, approvals, funding, and share transfers.
- Cancellations with proportional yield refunds (inspection failed).

Run tests:
```bash
npx hardhat test test/RealEstate.js
```

---

## 📝 Notes

- **Retail Focus**: The 100-share model supports affordable fractions, tested with multiple buyers.
- **Yield**: 90-day yield simulation in tests reflects escrow durations.
- **Security**: Audit recommended for Aave/ERC-1155 risks. Consider `onlyOwner` for `RealEstate.mint`.
- **Future Enhancements**:
  - Governance for shareholders.
  - Rental yield distribution.
  - Oracle-based pricing.