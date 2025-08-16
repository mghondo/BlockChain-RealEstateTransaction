import { useWallet } from './useWallet';

interface User {
  uid: string;
  address: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const { account, isConnected } = useWallet();

  const user: User | null = isConnected && account ? {
    uid: account,
    address: account
  } : null;

  return {
    user,
    loading: false // For wallet-based auth, loading is handled by useWallet
  };
};