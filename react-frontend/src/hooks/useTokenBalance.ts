import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../contexts/Web3Context';
import type { TokenBalance } from '../types/web3';

export function useTokenBalance() {
  const { state, dispatch } = useWeb3Context();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTokenBalances = useCallback(async () => {
    const { provider, account, chainId } = state.wallet;
    if (!provider || !account || !chainId) return;

    setIsUpdating(true);

    try {
      const balances: TokenBalance[] = [];

      // Define token addresses for different networks
      const tokenAddresses: Record<number, Record<string, string>> = {
        1: { // Ethereum Mainnet
          USDC: '0xA0b86a33E6441319F8ee15A8EfA8C4f04c1E0F4b'
        },
        137: { // Polygon
          USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        },
        11155111: { // Sepolia
          USDC: '0x1234567890123456789012345678901234567890' // Mock address
        },
        80002: { // Polygon Amoy
          USDC: '0x2345678901234567890123456789012345678901' // Mock address
        }
      };

      const networkTokens = tokenAddresses[chainId];
      if (!networkTokens) {
        dispatch({ type: 'SET_TOKEN_BALANCES', payload: [] });
        return;
      }

      // ERC20 ABI for balance checking
      const erc20ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ];

      for (const [symbol, address] of Object.entries(networkTokens)) {
        try {
          const contract = new ethers.Contract(address, erc20ABI, provider);
          const [balance, decimals] = await Promise.all([
            contract.balanceOf(account),
            contract.decimals()
          ]);

          balances.push({
            symbol,
            balance,
            formatted: ethers.formatUnits(balance, decimals),
            decimals,
            address
          });
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
          // Add zero balance for failed tokens
          balances.push({
            symbol,
            balance: BigInt(0),
            formatted: '0.00',
            decimals: 6,
            address
          });
        }
      }

      dispatch({ type: 'SET_TOKEN_BALANCES', payload: balances });
    } catch (error) {
      console.error('Error updating token balances:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [state.wallet.provider, state.wallet.account, state.wallet.chainId, dispatch]);

  // Update balances when wallet connects or network changes
  useEffect(() => {
    if (state.wallet.isConnected) {
      updateTokenBalances();
    }
  }, [state.wallet.isConnected, state.wallet.chainId, updateTokenBalances]);

  const getTokenBalance = useCallback((symbol: string): TokenBalance | null => {
    return state.tokenBalances.find(token => token.symbol === symbol) || null;
  }, [state.tokenBalances]);

  const formatTokenBalance = useCallback((balance: string | bigint, decimals: number = 18): string => {
    try {
      const formatted = typeof balance === 'string' 
        ? ethers.formatUnits(balance, decimals)
        : ethers.formatUnits(balance, decimals);
      
      const num = parseFloat(formatted);
      if (num < 0.01 && num > 0) {
        return '< 0.01';
      }
      return num.toFixed(2);
    } catch (error) {
      return '0.00';
    }
  }, []);

  return {
    tokenBalances: state.tokenBalances,
    isUpdating,
    updateTokenBalances,
    getTokenBalance,
    formatTokenBalance
  };
}