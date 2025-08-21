import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface UserWallet {
  userId: string;
  address: string;
  ethBalance: number;
  strikePrice: number; // ETH price when wallet was created
  initialUsdValue: number; // Original USD value ($20,000)
  createdAt: Timestamp;
  username: string;
  isActive: boolean;
  lastUpdated: Timestamp;
}

export class UserScopedWalletService {
  
  /**
   * Create or update a user's simulation wallet
   */
  static async createOrUpdateWallet(
    userId: string,
    walletData: Omit<UserWallet, 'userId' | 'createdAt' | 'lastUpdated'>
  ): Promise<void> {
    try {
      const walletRef = doc(db, `users/${userId}/wallet`, 'simulation');
      
      // Check if wallet already exists
      const existingWallet = await getDoc(walletRef);
      
      if (existingWallet.exists()) {
        // Update existing wallet
        await updateDoc(walletRef, {
          ...walletData,
          lastUpdated: serverTimestamp(),
        });
        console.log('✅ Updated user wallet in Firebase:', userId);
      } else {
        // Create new wallet
        await setDoc(walletRef, {
          ...walletData,
          userId,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        });
        console.log('✅ Created user wallet in Firebase:', userId);
      }
    } catch (error) {
      console.error('❌ Failed to create/update user wallet:', error);
      throw new Error('Failed to save wallet');
    }
  }

  /**
   * Get user's simulation wallet
   */
  static async getUserWallet(userId: string): Promise<UserWallet | null> {
    try {
      const walletRef = doc(db, `users/${userId}/wallet`, 'simulation');
      const walletDoc = await getDoc(walletRef);
      
      if (walletDoc.exists()) {
        const data = walletDoc.data();
        return {
          userId,
          address: data.address,
          ethBalance: data.ethBalance,
          strikePrice: data.strikePrice,
          initialUsdValue: data.initialUsdValue,
          createdAt: data.createdAt,
          username: data.username,
          isActive: data.isActive,
          lastUpdated: data.lastUpdated,
        } as UserWallet;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get user wallet:', error);
      throw new Error('Failed to get wallet');
    }
  }

  /**
   * Update wallet balance (for purchases, etc.)
   */
  static async updateBalance(userId: string, newBalance: number): Promise<void> {
    try {
      const walletRef = doc(db, `users/${userId}/wallet`, 'simulation');
      
      await updateDoc(walletRef, {
        ethBalance: newBalance,
        lastUpdated: serverTimestamp(),
      });
      
      console.log(`✅ Updated wallet balance: ${userId} → ${newBalance} ETH`);
    } catch (error) {
      console.error('❌ Failed to update wallet balance:', error);
      throw new Error('Failed to update balance');
    }
  }

  /**
   * Deactivate user's wallet (for logout)
   */
  static async deactivateWallet(userId: string): Promise<void> {
    try {
      const walletRef = doc(db, `users/${userId}/wallet`, 'simulation');
      
      await updateDoc(walletRef, {
        isActive: false,
        lastUpdated: serverTimestamp(),
      });
      
      console.log('✅ Deactivated user wallet:', userId);
    } catch (error) {
      console.error('❌ Failed to deactivate wallet:', error);
      throw new Error('Failed to deactivate wallet');
    }
  }

  /**
   * Check if user has a wallet
   */
  static async hasWallet(userId: string): Promise<boolean> {
    try {
      const walletRef = doc(db, `users/${userId}/wallet`, 'simulation');
      const walletDoc = await getDoc(walletRef);
      
      return walletDoc.exists() && walletDoc.data()?.isActive === true;
    } catch (error) {
      console.error('❌ Failed to check wallet existence:', error);
      return false;
    }
  }
}