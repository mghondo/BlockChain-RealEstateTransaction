# Real Estate Escrow DApp

This project is a decentralized application (DApp) for managing real estate transactions using Ethereum smart contracts. It features an escrow system where buyers deposit earnest money, inspectors approve inspections, and lenders fund the remaining purchase price. The property is represented as an NFT. The app includes two escrow versions:
- **Basic ETH-based**: Uses native ETH for payments.
- **Advanced USDC/Aave-based**: Uses USDC stablecoin for volatility protection and Aave for earning yield (interest) on escrowed funds during the transaction period.

## Overview
The app simulates a real estate sale:
- Seller mints an NFT representing the property.
- Buyer deposits earnest money in USDC (or ETH).
- Inspector approves or fails the inspection.
- Parties (buyer, seller, lender) approve the transaction.
- Lender deposits the remaining funds.
- Funds accrue yield via Aave while in escrow (e.g., months-long processes).
- On finalization, NFT transfers to buyer, and funds (principal + yield) go to seller.
- On cancellation, funds refund to buyer (if inspection fails) or forfeit to seller (if passed), including accrued yield.

This setup addresses crypto volatility (via USDC) and opportunity cost (via Aave yield at ~5% APY, dynamic).

## Features
- **NFT Representation**: Properties as ERC721 tokens with IPFS metadata.
- **Phased Escrow**: Created → EarnestDeposited → Approved → FullyFunded → Completed/Cancelled.
- **Stablecoin Payments**: USDC for deposits to avoid ETH price swings.
- **Yield Accrual**: Escrowed USDC earns interest via Aave v3 lending pool.
- **Approvals and Inspection**: Multi-party consensus with inspection pass/fail.
- **Cancellation Logic**: Refunds or forfeits based on inspection, with yield included.
- **Testing**: Hardhat tests for deployment, successful sales, and cancellations with yield simulation.
- **Deployment**: Script for local, testnet (Sepolia), or mainnet.

## Requirements
- Node.js (recommended v18 LTS or v16 for Hardhat compatibility).
- Hardhat for development/testing.
- Dependencies: `@openzeppelin/contracts`, `dotenv`.
- Ethereum wallet for deployment (e.g., MetaMask with private key in `.env`).

## Setup
1. **Clone the Repository**: