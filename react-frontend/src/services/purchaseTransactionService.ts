import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Property } from '../types/property';
import { UserScopedWalletService } from './userScopedWalletService';

interface PurchaseTransaction {
  userId: string;
  propertyId: string;
  shares: number;
  sharePrice: number;
  totalCost: number;
  purchaseDate: Date;
  status: 'pending' | 'completed' | 'failed';
  transactionType: 'property_purchase';
}

interface Investment {
  userId: string;
  propertyId: string;
  propertyAddress: string;
  propertyClass: string;
  sharesOwned: number;
  purchasePrice: number; // ETH amount paid
  purchaseUsdValue: number; // USD value at time of purchase
  currentValue: number;
  purchaseDate: Date;
  lastUpdated: Date;
  
  // Full property details for dashboard/portfolio display
  propertyCity: string;
  propertyState: string;
  propertyRegion: string;
  propertyImageUrl: string;
  propertyBedrooms: number;
  propertyBathrooms: number;
  propertySqft: number;
  propertyYearBuilt: number;
  propertyTotalPrice: number; // Full USD property value
  rentalYield: number; // For rental income calculations
  
  // Tracking timestamps for game mechanics
  rentalIncomeStartDate: Date;
  appreciationStartDate: Date;
}

export class PurchaseTransactionService {
  
  /**
   * Process a property share purchase
   */
  static async processPurchase(
    userId: string,
    property: Property,
    shares: number,
    walletBalance: number,
    ethToUsdRate: number = 4462
  ): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    
    try {
      // Calculate cost in USD first
      const sharePriceUSD = property.sharePrice || (property.currentValue / 100);
      const totalCostUSD = sharePriceUSD * shares;
      
      // Convert USD cost to ETH for actual payment
      const totalCostETH = totalCostUSD / ethToUsdRate;
      
      console.log(`💰 Purchase calculation:`, {
        shares,
        sharePriceUSD: sharePriceUSD.toFixed(2),
        totalCostUSD: totalCostUSD.toFixed(2),
        ethToUsdRate,
        totalCostETH: totalCostETH.toFixed(4),
        walletBalance: walletBalance.toFixed(4)
      });

      // Validate purchase (compare ETH amounts)
      if (walletBalance < totalCostETH) {
        return { 
          success: false, 
          error: `Insufficient balance. Need ${totalCostETH.toFixed(4)} ETH (~$${totalCostUSD.toLocaleString()}) but have ${walletBalance.toFixed(4)} ETH` 
        };
      }

      if (shares > (property.availableShares || 100)) {
        return { 
          success: false, 
          error: `Only ${property.availableShares || 100} shares available` 
        };
      }

      if (shares <= 0) {
        return { 
          success: false, 
          error: 'Must purchase at least 1 share' 
        };
      }

      // Create transaction record
      const transactionData: PurchaseTransaction = {
        userId,
        propertyId: property.id,
        shares,
        sharePrice: sharePriceUSD, // Store USD price per share
        totalCost: totalCostETH, // Store ETH cost for wallet deduction
        purchaseDate: new Date(),
        status: 'pending',
        transactionType: 'property_purchase',
      };

      // Store transaction in user-scoped collection (has proper permissions)
      const transactionRef = await addDoc(collection(db, `users/${userId}/transactions`), transactionData);
      
      // Also try to store in global collection (may fail, but won't break the purchase)
      try {
        await addDoc(collection(db, 'transactions'), transactionData);
      } catch (error) {
        console.warn('Failed to store in global transactions collection:', error);
      }
      
      // Update transaction status to completed
      await updateDoc(transactionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
      });

      // Create or update investment record
      await this.createInvestmentRecord(userId, property, shares, totalCostETH);

      // Update property available shares
      await this.updatePropertyShares(property.id, shares);

      // Deduct from user wallet (in ETH)
      console.log('💳 Attempting wallet deduction:', {
        userId,
        amount: totalCostETH.toFixed(4),
        currentBalance: walletBalance.toFixed(4)
      });
      
      await this.deductFromWallet(userId, totalCostETH);
      
      console.log('✅ Wallet deduction completed');

      console.log(`✅ Purchase completed: ${shares} shares of ${property.address} for ${totalCostETH.toFixed(4)} ETH (~$${totalCostUSD.toLocaleString()})`);

      return { 
        success: true, 
        transactionId: transactionRef.id 
      };

    } catch (error) {
      console.error('Purchase failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Purchase failed' 
      };
    }
  }

  /**
   * Create investment record in user's portfolio
   */
  private static async createInvestmentRecord(
    userId: string,
    property: Property,
    shares: number,
    totalCostETH: number
  ): Promise<void> {
    
    const purchaseDate = new Date();
    const totalPropertyPriceUSD = property.sharePrice ? property.sharePrice * 100 : (property.currentValue || property.price || 0);
    const userCostUSD = (totalPropertyPriceUSD * shares) / 100;
    
    const investmentData: Investment = {
      userId,
      propertyId: property.id,
      propertyAddress: property.address,
      propertyClass: property.class,
      sharesOwned: shares,
      purchasePrice: totalCostETH, // Store ETH amount paid
      purchaseUsdValue: userCostUSD, // USD value at purchase
      currentValue: totalCostETH, // Initially same as purchase price
      purchaseDate,
      lastUpdated: new Date(),
      
      // Full property details for portfolio display
      propertyCity: property.city,
      propertyState: property.state,
      propertyRegion: property.region,
      propertyImageUrl: property.imageUrl,
      propertyBedrooms: property.bedrooms,
      propertyBathrooms: property.bathrooms,
      propertySqft: property.sqft,
      propertyYearBuilt: property.yearBuilt,
      propertyTotalPrice: totalPropertyPriceUSD,
      rentalYield: property.rentalYield,
      
      // Game mechanics - rental and appreciation start immediately
      rentalIncomeStartDate: purchaseDate,
      appreciationStartDate: purchaseDate,
    };
    
    console.log('📊 Investment record created:', {
      shares,
      ethCost: totalCostETH.toFixed(4),
      usdValue: userCostUSD.toFixed(2),
      propertyTotal: totalPropertyPriceUSD.toFixed(2),
      rentalYield: (property.rentalYield * 100).toFixed(1) + '%'
    });

    // Add to user-scoped investments collection (has proper permissions)
    await addDoc(collection(db, `users/${userId}/investments`), investmentData);

    // Also try to add to global investments collection for easier querying
    try {
      await addDoc(collection(db, 'investments'), investmentData);
    } catch (error) {
      console.warn('Failed to store in global investments collection:', error);
    }
  }

  /**
   * Update property available shares
   */
  private static async updatePropertyShares(
    propertyId: string,
    purchasedShares: number
  ): Promise<void> {
    
    const propertyRef = doc(db, 'properties', propertyId);
    const propertyDoc = await getDoc(propertyRef);
    
    if (propertyDoc.exists()) {
      const data = propertyDoc.data();
      const currentAvailable = data.availableShares || 100;
      const newAvailable = Math.max(0, currentAvailable - purchasedShares);
      
      await updateDoc(propertyRef, {
        availableShares: newAvailable,
        lastUpdated: serverTimestamp(),
      });

      console.log(`Updated property ${propertyId}: ${currentAvailable} → ${newAvailable} shares available`);
    }
  }

  /**
   * Deduct purchase amount from user's wallet
   */
  private static async deductFromWallet(
    userId: string,
    amount: number
  ): Promise<void> {
    
    console.log('💳 Starting wallet deduction process:', { userId, amount });
    
    try {
      // Get current wallet balance
      console.log('🔍 Fetching user wallet...');
      const userWallet = await UserScopedWalletService.getUserWallet(userId);
      
      if (!userWallet) {
        console.error('❌ User wallet not found in Firebase');
        throw new Error('User wallet not found');
      }
      
      console.log('💰 Current wallet state:', {
        address: userWallet.address,
        currentBalance: userWallet.ethBalance,
        isActive: userWallet.isActive
      });
      
      const currentBalance = userWallet.ethBalance;
      const newBalance = Math.max(0, currentBalance - amount);
      
      console.log('📈 Balance calculation:', {
        currentBalance,
        deductAmount: amount,
        newBalance,
        difference: currentBalance - newBalance
      });
      
      // Update balance using user-scoped wallet service
      console.log('🔄 Updating wallet balance in Firebase...');
      await UserScopedWalletService.updateBalance(userId, newBalance);
      
      console.log(`✅ Updated wallet ${userId}: ${currentBalance.toFixed(4)} → ${newBalance.toFixed(4)} ETH`);
    } catch (error) {
      console.error('❌ Failed to deduct from wallet:', error);
      throw new Error('Failed to update wallet balance');
    }
  }

  /**
   * Get user's investment history
   */
  static async getUserInvestments(userId: string): Promise<Investment[]> {
    try {
      const investmentsCollection = collection(db, `users/${userId}/investments`);
      const { getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(investmentsCollection);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Investment[];
    } catch (error) {
      console.error('Failed to get user investments:', error);
      return [];
    }
  }

  /**
   * Get transaction history for user
   */
  static async getUserTransactions(userId: string): Promise<PurchaseTransaction[]> {
    try {
      const { query, where, getDocs, orderBy } = await import('firebase/firestore');
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('purchaseDate', 'desc')
      );
      
      const snapshot = await getDocs(transactionsQuery);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as PurchaseTransaction[];
    } catch (error) {
      console.error('Failed to get user transactions:', error);
      return [];
    }
  }

  /**
   * Calculate total portfolio value for user
   */
  static async getUserPortfolioValue(userId: string): Promise<{
    totalInvested: number;
    currentValue: number;
    totalShares: number;
    properties: number;
  }> {
    
    try {
      const investments = await this.getUserInvestments(userId);
      
      const totalInvested = investments.reduce((sum, inv) => sum + inv.purchasePrice, 0);
      const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
      const totalShares = investments.reduce((sum, inv) => sum + inv.sharesOwned, 0);
      const properties = investments.length;

      return {
        totalInvested,
        currentValue,
        totalShares,
        properties,
      };
    } catch (error) {
      console.error('Failed to calculate portfolio value:', error);
      return {
        totalInvested: 0,
        currentValue: 0,
        totalShares: 0,
        properties: 0,
      };
    }
  }
}

export type { PurchaseTransaction, Investment };