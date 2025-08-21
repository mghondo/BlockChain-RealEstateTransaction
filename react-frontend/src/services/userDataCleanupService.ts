import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export class UserDataCleanupService {
  
  /**
   * Clear all user-scoped data when disconnecting wallet
   * This includes investments, transactions, wallet data, etc.
   */
  static async clearAllUserData(userId: string): Promise<void> {
    if (!userId) {
      console.warn('⚠️ No user ID provided for data cleanup');
      return;
    }

    console.log('🧹 Starting complete user data cleanup for:', userId);
    
    try {
      // Collections to clear
      const collectionsToClean = [
        'investments',
        'transactions', 
        'wallet',
        'properties',
        'watchlist',
        'property_interactions',
        'rental_income',
        'portfolio',
        'game_state'
      ];

      const cleanupPromises = collectionsToClean.map(async (collectionName) => {
        try {
          const collectionRef = collection(db, `users/${userId}/${collectionName}`);
          const snapshot = await getDocs(collectionRef);
          
          if (snapshot.empty) {
            console.log(`📭 No documents in ${collectionName} collection`);
            return;
          }

          console.log(`🗑️ Deleting ${snapshot.docs.length} documents from ${collectionName}`);
          
          const deletePromises = snapshot.docs.map(docSnapshot => 
            deleteDoc(docSnapshot.ref)
          );
          
          await Promise.all(deletePromises);
          console.log(`✅ Cleared ${collectionName} collection (${snapshot.docs.length} docs)`);
          
        } catch (error) {
          console.error(`❌ Failed to clear ${collectionName}:`, error);
          // Continue with other collections even if one fails
        }
      });

      await Promise.all(cleanupPromises);
      
      console.log('✅ User data cleanup completed successfully');
      
    } catch (error) {
      console.error('❌ Failed to complete user data cleanup:', error);
      throw new Error('Failed to clear user data');
    }
  }

  /**
   * Clear only investment-related data (less aggressive than full cleanup)
   */
  static async clearInvestmentData(userId: string): Promise<void> {
    if (!userId) return;

    console.log('🏠 Clearing investment data for:', userId);
    
    try {
      const investmentCollections = ['investments', 'transactions'];
      
      for (const collectionName of investmentCollections) {
        const collectionRef = collection(db, `users/${userId}/${collectionName}`);
        const snapshot = await getDocs(collectionRef);
        
        if (!snapshot.empty) {
          const deletePromises = snapshot.docs.map(docSnapshot => 
            deleteDoc(docSnapshot.ref)
          );
          await Promise.all(deletePromises);
          console.log(`✅ Cleared ${collectionName}: ${snapshot.docs.length} documents`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to clear investment data:', error);
      throw error;
    }
  }

  /**
   * Verify cleanup was successful
   */
  static async verifyCleanup(userId: string): Promise<{
    investmentsRemaining: number;
    transactionsRemaining: number;
    walletRemaining: number;
  }> {
    try {
      const [investmentsSnap, transactionsSnap, walletSnap] = await Promise.all([
        getDocs(collection(db, `users/${userId}/investments`)),
        getDocs(collection(db, `users/${userId}/transactions`)),
        getDocs(collection(db, `users/${userId}/wallet`))
      ]);

      const result = {
        investmentsRemaining: investmentsSnap.docs.length,
        transactionsRemaining: transactionsSnap.docs.length,
        walletRemaining: walletSnap.docs.length
      };

      console.log('🔍 Cleanup verification:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to verify cleanup:', error);
      return { investmentsRemaining: -1, transactionsRemaining: -1, walletRemaining: -1 };
    }
  }
}