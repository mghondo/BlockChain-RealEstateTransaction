import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export class SimpleRentalProcessor {
  
  // Calculate pending rental income that hasn't been paid yet
  static async calculatePendingRental(userId: string, investments: any[]): Promise<{ pendingAmount: number, totalAccrued: number, alreadyPaid: number }> {
    try {
      console.log('🔍 RENTAL DEBUG: Starting calculation for user:', userId);
      console.log('🔍 RENTAL DEBUG: Investments count:', investments.length);
      console.log('🔍 RENTAL DEBUG: Investments data:', investments);
      
      // Get wallet to check payment history - use correct UserScopedWalletService path
      const walletPath = `users/${userId}/wallet/simulation`;
      console.log('🔍 RENTAL DEBUG: Wallet document path (corrected):', walletPath);
      
      const walletDoc = doc(db, walletPath);
      const walletSnapshot = await getDoc(walletDoc);
      
      console.log('🔍 RENTAL DEBUG: Wallet snapshot exists:', walletSnapshot.exists());
      
      let alreadyPaid = 0;
      
      if (!walletSnapshot.exists()) {
        console.log('⚠️ Wallet not found - this is normal for new users:', userId);
        console.log('💡 Will return calculated values, but no payment tracking yet');
        alreadyPaid = 0; // New user, no payments made yet
      } else {
        const walletData = walletSnapshot.data();
        console.log('🔍 RENTAL DEBUG: Full wallet data:', walletData);
        
        alreadyPaid = walletData.totalRentalReceived || 0;
        console.log('🔍 RENTAL DEBUG: Already paid amount:', alreadyPaid);
        
        // Initialize totalRentalReceived field if missing
        if (!walletData.hasOwnProperty('totalRentalReceived')) {
          console.log('🔧 Initializing totalRentalReceived field to 0');
          await updateDoc(walletDoc, {
            totalRentalReceived: 0,
            lastUpdated: new Date()
          });
        }
      }
      
      // Calculate total accrued rental income from all investments
      let totalAccrued = 0;
      const now = new Date();
      
      investments.forEach((investment, index) => {
        console.log(`🔍 RENTAL DEBUG: Processing investment ${index + 1}:`, {
          propertyAddress: investment.propertyAddress,
          purchaseDate: investment.purchaseDate,
          propertyTotalPrice: investment.propertyTotalPrice,
          rentalYield: investment.rentalYield,
          sharesOwned: investment.sharesOwned
        });
        
        const purchaseDate = new Date(investment.purchaseDate);
        const realTimeElapsedMs = now.getTime() - purchaseDate.getTime();
        
        const TIME_MULTIPLIER = 1440;
        const gameTimeElapsedMs = realTimeElapsedMs * TIME_MULTIPLIER;
        const gameMonthsElapsed = gameTimeElapsedMs / (1000 * 60 * 60 * 24 * 30.44);
        
        console.log(`🔍 RENTAL DEBUG: Time calculations for investment ${index + 1}:`, {
          realTimeElapsedMs,
          gameTimeElapsedMs,
          gameMonthsElapsed: gameMonthsElapsed.toFixed(4)
        });
        
        if (gameMonthsElapsed > 0) {
          const annualPropertyRental = investment.propertyTotalPrice * investment.rentalYield;
          const userAnnualRental = (annualPropertyRental * investment.sharesOwned) / 100;
          const userMonthlyRental = userAnnualRental / 12;
          const propertyTotalRental = userMonthlyRental * gameMonthsElapsed;
          
          console.log(`🔍 RENTAL DEBUG: Rental calculations for investment ${index + 1}:`, {
            annualPropertyRental,
            userAnnualRental,
            userMonthlyRental,
            propertyTotalRental: propertyTotalRental.toFixed(2)
          });
          
          totalAccrued += propertyTotalRental;
          console.log(`🔍 RENTAL DEBUG: Running total accrued:`, totalAccrued.toFixed(2));
        } else {
          console.log(`🔍 RENTAL DEBUG: No time elapsed for investment ${index + 1}`);
        }
      });
      
      const pendingAmount = Math.max(0, totalAccrued - alreadyPaid);
      
      console.log(`💰 Rental Accounting:`, {
        totalAccrued: totalAccrued.toFixed(2),
        alreadyPaid: alreadyPaid.toFixed(2),
        pendingAmount: pendingAmount.toFixed(2)
      });
      
      return { pendingAmount, totalAccrued, alreadyPaid };
      
    } catch (error) {
      console.error('❌ Error calculating pending rental:', error);
      return { pendingAmount: 0, totalAccrued: 0, alreadyPaid: 0 };
    }
  }
  
  // Process rental payment with proper tracking
  static async collectPendingRental(userId: string, investments: any[]): Promise<{ success: boolean, amountPaid: number }> {
    try {
      const { pendingAmount } = await this.calculatePendingRental(userId, investments);
      
      if (pendingAmount < 0.01) {
        console.log('💰 No rental income to collect');
        return { success: false, amountPaid: 0 };
      }
      
      // Process the payment
      const success = await this.processRentalPayment(userId, pendingAmount);
      
      if (success) {
        // Update payment tracking in wallet
        const walletDoc = doc(db, `users/${userId}/wallet`, 'simulation');
        const walletSnapshot = await getDoc(walletDoc);
        
        if (walletSnapshot.exists()) {
          const currentData = walletSnapshot.data();
          const newTotalReceived = (currentData.totalRentalReceived || 0) + pendingAmount;
          
          await updateDoc(walletDoc, {
            totalRentalReceived: newTotalReceived,
            lastRentalPayment: new Date(),
            lastUpdated: new Date()
          });
          
          console.log(`💰 Payment tracking updated: $${pendingAmount.toFixed(2)} paid, total lifetime: $${newTotalReceived.toFixed(2)}`);
        }
        
        return { success: true, amountPaid: pendingAmount };
      }
      
      return { success: false, amountPaid: 0 };
      
    } catch (error) {
      console.error('❌ Error collecting rental payment:', error);
      return { success: false, amountPaid: 0 };
    }
  }
  
  // Process a direct rental payment to user's wallet
  static async processRentalPayment(userId: string, usdAmount: number): Promise<boolean> {
    try {
      console.log(`💰 Processing rental payment: $${usdAmount.toFixed(2)} for user ${userId}`);
      
      // Get current ETH price
      const ethPrice = await this.getCurrentEthPrice();
      const ethAmount = usdAmount / ethPrice;
      
      console.log(`💱 Converting $${usdAmount.toFixed(2)} to ${ethAmount.toFixed(6)} ETH at $${ethPrice}/ETH`);
      
      // Update user's wallet
      const walletDoc = doc(db, `users/${userId}/wallet`, 'simulation');
      const walletSnapshot = await getDoc(walletDoc);
      
      if (walletSnapshot.exists()) {
        const walletData = walletSnapshot.data();
        const currentBalance = walletData.ethBalance || 0;
        const newBalance = currentBalance + ethAmount;
        
        await updateDoc(walletDoc, {
          ethBalance: newBalance,
          lastRentalPayment: new Date(),
          lastUpdated: new Date(),
        });
        
        console.log(`💰 Rental payment processed successfully!`);
        console.log(`📊 Wallet balance: ${currentBalance.toFixed(6)} → ${newBalance.toFixed(6)} ETH`);
        
        // Trigger wallet refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('walletRefresh'));
        }
        
        return true;
      } else {
        console.error('❌ Wallet not found for user:', userId);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error processing rental payment:', error);
      return false;
    }
  }
  
  // Process rental income directly: time elapsed × rental rate = payment
  static async processRentalForUser(userId: string, investment: any): Promise<number> {
    try {
      const now = new Date();
      const purchaseDate = new Date(investment.purchaseDate);
      const realTimeElapsedMs = now.getTime() - purchaseDate.getTime();
      
      // Apply game time acceleration: 1 real hour = 2 game months
      const TIME_MULTIPLIER = 1440; 
      const gameTimeElapsedMs = realTimeElapsedMs * TIME_MULTIPLIER;
      const gameMonthsElapsed = gameTimeElapsedMs / (1000 * 60 * 60 * 24 * 30.44);
      
      console.log(`⏰ Processing rental for ${investment.propertyAddress}:`, {
        purchaseDate: purchaseDate.toISOString(),
        currentTime: now.toISOString(),
        realHoursElapsed: (realTimeElapsedMs / (1000 * 60 * 60)).toFixed(2),
        gameMonthsElapsed: gameMonthsElapsed.toFixed(2)
      });
      
      if (gameMonthsElapsed <= 0) {
        console.log('⚠️ No time elapsed yet');
        return 0;
      }
      
      // Calculate rental payment: property value × yield × ownership × months elapsed
      const annualPropertyRental = investment.propertyTotalPrice * investment.rentalYield;
      const userAnnualRental = (annualPropertyRental * investment.sharesOwned) / 100;
      const userMonthlyRental = userAnnualRental / 12;
      const totalRentalEarned = userMonthlyRental * gameMonthsElapsed;
      
      console.log(`💰 Rental payment calculation:`, {
        annualPropertyRental: annualPropertyRental.toFixed(2),
        userAnnualRental: userAnnualRental.toFixed(2),
        userMonthlyRental: userMonthlyRental.toFixed(2),
        totalRentalEarned: totalRentalEarned.toFixed(2),
        gameMonthsElapsed: gameMonthsElapsed.toFixed(2)
      });
      
      if (totalRentalEarned > 0) {
        // Convert USD to ETH and add to wallet
        await this.addRentalToWallet(userId, totalRentalEarned);
      }
      
      return totalRentalEarned;
      
    } catch (error) {
      console.error('Error processing rental:', error);
      return 0;
    }
  }
  
  // Add rental income to user's ETH wallet
  private static async addRentalToWallet(userId: string, usdAmount: number): Promise<void> {
    try {
      // Get current ETH price
      const ethPrice = await this.getCurrentEthPrice();
      const ethAmount = usdAmount / ethPrice;
      
      // Update user's wallet
      const walletDoc = doc(db, `users/${userId}/wallet`, 'simulation');
      const walletSnapshot = await getDoc(walletDoc);
      
      if (walletSnapshot.exists()) {
        const walletData = walletSnapshot.data();
        const currentBalance = walletData.ethBalance || 0;
        const newBalance = currentBalance + ethAmount;
        
        await updateDoc(walletDoc, {
          ethBalance: newBalance,
          lastRentalPayment: new Date(),
          lastUpdated: new Date(),
        });
        
        console.log(`💰 Added rental to wallet: $${usdAmount.toFixed(2)} → ${ethAmount.toFixed(4)} ETH`);
        console.log(`📊 Wallet balance: ${currentBalance.toFixed(4)} → ${newBalance.toFixed(4)} ETH`);
        
        // Trigger wallet refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('walletRefresh'));
        }
      }
      
    } catch (error) {
      console.error('Error adding rental to wallet:', error);
    }
  }
  
  // Get current ETH price
  private static async getCurrentEthPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      return data.ethereum.usd;
    } catch (error) {
      console.warn('Failed to fetch ETH price, using fallback:', error);
      return 3500; // Fallback price
    }
  }
}