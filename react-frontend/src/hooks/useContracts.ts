import { useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../contexts/Web3Context';
import type { PropertyDetails } from '../types/web3';
import {
  REAL_ESTATE_ABI,
  ESCROW_ABI,
  ESCROW_WITH_STABLE_AND_YIELD_ABI,
  ESCROW_WITH_STABLE_AND_YIELD_CROSS_CHAIN_ABI,
  MOCK_USDC_ABI,
  CONTRACT_ADDRESSES,
  ESCROW_CONTRACTS
} from '../contracts/abis';

export function useContracts() {
  const { state, dispatch } = useWeb3Context();

  const initializeContracts = useCallback(async () => {
    const { provider, account, chainId } = state.wallet;
    if (!provider || !account || !chainId) return;

    try {
      const signer = await provider.getSigner();
      
      // Get contract addresses for current network
      const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
      if (!addresses) {
        console.warn(`No contract addresses configured for chain ID ${chainId}`);
        return;
      }
      
      const contracts: any = {};
      
      // Initialize RealEstate contract
      if (addresses.RealEstate && addresses.RealEstate !== ethers.ZeroAddress) {
        contracts.realEstate = new ethers.Contract(addresses.RealEstate, REAL_ESTATE_ABI, signer);
      }
      
      // Initialize MockUSDC contract
      if (addresses.MockUSDC && addresses.MockUSDC !== ethers.ZeroAddress) {
        contracts.mockUSDC = new ethers.Contract(addresses.MockUSDC, MOCK_USDC_ABI, signer);
      }

      dispatch({
        type: 'SET_CONTRACTS',
        payload: contracts
      });
    } catch (error) {
      console.error('Error initializing contracts:', error);
    }
  }, [state.wallet.provider, state.wallet.account, state.wallet.chainId, dispatch]);

  useEffect(() => {
    initializeContracts();
  }, [initializeContracts]);

  const getEscrowContract = useCallback((escrowAddress: string) => {
    const { provider } = state.wallet;
    if (!provider) return null;

    // Determine escrow contract type from registry
    const escrowInfo = ESCROW_CONTRACTS[escrowAddress as keyof typeof ESCROW_CONTRACTS];
    let abi = ESCROW_ABI; // Default ABI

    if (escrowInfo) {
      switch (escrowInfo.type) {
        case 'EscrowWithStableAndYield':
          abi = ESCROW_WITH_STABLE_AND_YIELD_ABI;
          break;
        case 'EscrowWithStableAndYieldCrossChain':
          abi = ESCROW_WITH_STABLE_AND_YIELD_CROSS_CHAIN_ABI;
          break;
        default:
          abi = ESCROW_ABI;
      }
    }

    return new ethers.Contract(escrowAddress, abi, provider);
  }, [state.wallet.provider]);

  const getPropertyDetails = useCallback(async (escrowAddress: string): Promise<PropertyDetails | null> => {
    const escrowContract = getEscrowContract(escrowAddress);
    if (!escrowContract) return null;

    try {
      const [config, currentPhaseId, totalEarnestDeposited] = await Promise.all([
        escrowContract.getPropertyDetails(),
        escrowContract.getPhase(),
        escrowContract.totalEarnestDeposited()
      ]);

      const phaseNames = [
        'Available for Investment',
        'Under Inspection',
        'Pending Approval',
        'Funding Complete',
        'Completed',
        'Cancelled'
      ];

      return {
        config: {
          seller: config.seller,
          buyer: config.buyer,
          nftAddress: config.nftAddress,
          nftID: config.nftID,
          purchasePrice: config.purchasePrice,
          escrowAmount: config.escrowAmount,
          inspectionPeriod: config.inspectionPeriod,
          financingPeriod: config.financingPeriod
        },
        currentPhase: {
          id: currentPhaseId,
          name: phaseNames[currentPhaseId] || 'Unknown',
          timestamp: BigInt(Date.now()) // In real implementation, get from blockchain
        },
        totalEarnestDeposited,
        availableShares: Math.floor(Math.random() * 100) // Mock value - calculate from contract
      };
    } catch (error) {
      console.error('Error getting property details:', error);
      return null;
    }
  }, [getEscrowContract]);

  const depositEarnest = useCallback(async (escrowAddress: string, amount: string): Promise<ethers.TransactionResponse | null> => {
    const { provider } = state.wallet;
    if (!provider) return null;

    try {
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
      
      const tx = await escrowContract.depositEarnest({
        value: ethers.parseEther(amount)
      });
      
      return tx;
    } catch (error) {
      console.error('Error depositing earnest:', error);
      throw error;
    }
  }, [state.wallet.provider]);

  const approveInspection = useCallback(async (escrowAddress: string): Promise<ethers.TransactionResponse | null> => {
    const { provider } = state.wallet;
    if (!provider) return null;

    try {
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
      
      const tx = await escrowContract.approveInspection();
      return tx;
    } catch (error) {
      console.error('Error approving inspection:', error);
      throw error;
    }
  }, [state.wallet.provider]);

  const withdrawFunds = useCallback(async (escrowAddress: string): Promise<ethers.TransactionResponse | null> => {
    const { provider } = state.wallet;
    if (!provider) return null;

    try {
      const signer = await provider.getSigner();
      const escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
      
      const tx = await escrowContract.withdraw();
      return tx;
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      throw error;
    }
  }, [state.wallet.provider]);

  const getUSDCBalance = useCallback(async (address?: string): Promise<string> => {
    const { mockUSDC } = state.contracts;
    const targetAddress = address || state.wallet.account;
    
    if (!mockUSDC || !targetAddress) return '0';

    try {
      const balance = await mockUSDC.balanceOf(targetAddress);
      const decimals = await mockUSDC.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return '0';
    }
  }, [state.contracts.mockUSDC, state.wallet.account]);

  return {
    contracts: state.contracts,
    initializeContracts,
    getEscrowContract,
    getPropertyDetails,
    depositEarnest,
    approveInspection,
    withdrawFunds,
    getUSDCBalance
  };
}