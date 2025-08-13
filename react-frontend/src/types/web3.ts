import { ethers } from 'ethers';

export interface WalletState {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  balance: string;
  provider: ethers.BrowserProvider | null;
  isLoading: boolean;
  error: string | null;
}

export interface Network {
  chainId: number;
  name: string;
  displayName: string;
  symbol: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
}

export interface TokenBalance {
  symbol: string;
  balance: bigint;
  formatted: string;
  decimals: number;
  address: string;
}

export interface PropertyDetails {
  config: {
    seller: string;
    buyer: string;
    nftAddress: string;
    nftID: bigint;
    purchasePrice: bigint;
    escrowAmount: bigint;
    inspectionPeriod: bigint;
    financingPeriod: bigint;
  };
  currentPhase: {
    id: number;
    name: string;
    timestamp: bigint;
  };
  totalEarnestDeposited: bigint;
  availableShares: number;
}

export interface ContractInstances {
  realEstate: ethers.Contract | null;
  escrow: ethers.Contract | null;
  mockUSDC: ethers.Contract | null;
  crossChainEscrow: ethers.Contract | null;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}