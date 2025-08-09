# FracEstate: Fractional Real Estate Tokenization DApp

This decentralized application (**DApp**) transforms real estate transactions on **Ethereum** by enabling **fractional ownership** through the **ERC-1155** standard, where each property is tokenized into exactly **100 shares**. Built for retail investors, it supports multiple buyers, uses **USDC** stablecoin for payments, and earns yield via **Aave v3**, aligning with platforms like **RealT**.

## Overview

**FracEstate** redefines real estate investment by tokenizing properties as **ERC-1155 NFTs**, splitting them into 100 shares for shared ownership. An advanced escrow contract manages transactions, ensuring security, transparency, and profitability through **USDC** payments and **Aave yield**. Upgraded from the Dapp University tutorial, it shifts from single-owner **ERC-721** to **ERC-1155**, adds multi-buyer support, and integrates yield distribution, making it ideal for retail tokenization.

Key functionality includes:
- **Property Tokenization**: Sellers mint properties as ERC-1155 NFTs with 100 shares and IPFS metadata.
- **Fractional Purchases**: Multiple buyers commit to shares (e.g., 50/50 for two buyers), depositing proportional USDC.
- **Escrow Process**: Phased transactions with inspections, approvals, and funding, earning ~5% APY via Aave.
- **Yield Distribution**: Seller gets principal + yield on finalization; buyers/lender get proportional yield on cancellation if inspection fails.
- **Security**: Role-based access, phase enforcement, and reentrancy protection ensure trustless execution.

## Fractional Ownership

**FracEstate** uses **ERC-1155** to tokenize properties into **100 fixed shares**, enabling retail investors to buy fractions (e.g., $1,000/share for a $100,000 property). This upgrade from **ERC-721** supports multiple owners, reducing entry barriers and enhancing liquidity.

- **Minting**: `RealEstate.sol` mints 100 shares per property to the seller, storing metadata URIs (e.g., IPFS for property details).
- **Share Allocation**: Escrow contract initializes buyers with shares summing to 100 (e.g., [30, 70] or [25, 25, 25, 25]).
- **Transfers**: On finalization, shares are distributed via `safeTransferFrom` to buyers based on their allocation.
- **Benefits**: Affordable fractions, tradeable shares, and compatibility with wallets/exchanges, tested in `RealEstate.js`.

## Escrow Functionality

**EscrowWithStableAndYield.sol** manages secure, phased transactions with **USDC** and **Aave yield**, upgraded for multi-buyer fractional ownership.

- **Phases**: Created (0) → EarnestDeposited (1) → Approved (2) → FullyFunded (3) → Completed (4) or Cancelled (5).
- **Deposits**: Buyers deposit proportional USDC earnest (e.g., $10,000 for 50 shares of $20,000 escrow), supplied to Aave.
- **Inspection/Approvals**: Inspector sets pass/fail; all buyers, seller, and lender approve via role-based functions.
- **Funding**: Lender deposits remaining USDC (e.g., $80,000 for $100,000 price), supplied to Aave.
- **Finalization**: Withdraws principal + yield from Aave, transfers funds to seller, and distributes shares to buyers.
- **Cancellation**: Refunds principals + proportional yield to buyers/lender (if failed) or forfeits to seller (if passed).
- **Upgrades**: Multi-buyer support, proportional yield distribution, ERC-1155 compatibility (from single-buyer ERC-721).

The legacy **Escrow.sol** (ETH-based, single-buyer) is included for reference but unused in fractional tests.

## Requirements

- **Node.js**: v20.x LTS recommended for Hardhat compatibility (v18.20.8 may cause issues, see [Hardhat Node.js versions](https://hardhat.org/nodejs-versions)).
- **Hardhat**: For development, testing, and deployment.
- **Dependencies**: `@openzeppelin/contracts`, `dotenv`.
- **Ethereum Wallet**: MetaMask or similar with private key in `.env` for deployment.

## Setup

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
   - Create `.env` in the project root.
   - Add private key and Sepolia RPC URL (e.g., Infura/Alchemy):
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

## Contracts

- **RealEstate.sol**: ERC-1155 contract minting properties with 100 shares and IPFS URI storage.
- **EscrowWithStableAndYield.sol**: USDC/Aave escrow for multi-buyer fractional transactions.
- **Escrow.sol**: Legacy ETH-based escrow for single-buyer (unused in fractional tests).
- **MockUSDC.sol**: Mock USDC token (6 decimals) for testing.
- **MockAUSDC.sol**: Mock aUSDC simulating Aave yield (~5% APY).
- **MockAavePool.sol**: Mock Aave pool for supply/withdrawal testing.

## Testing

`test/RealEstate.js` verifies:
- Contract deployments.
- 100-share minting to seller.
- Multi-buyer initialization (e.g., [50, 50] shares).
- Successful sales with proportional deposits, approvals, funding, and share transfers.
- Cancellations with proportional yield refunds (inspection failed).
Run:
```bash
npx hardhat test test/RealEstate.js
```

## Notes

- **Retail Focus**: 100-share model supports affordable fractions, tested with multiple buyers.
- **Yield**: 90-day yield simulation in tests reflects escrow durations.
- **Security**: Audit recommended for Aave/ERC-1155 risks. Consider `onlyOwner` for `RealEstate.mint`.
- **Future Enhancements**: Add governance for shareholders, rental yield distribution, or oracle pricing.