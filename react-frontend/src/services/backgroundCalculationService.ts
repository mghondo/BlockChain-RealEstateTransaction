import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface BackgroundCalculationResult {
  rentalIncomeGenerated: number;
  propertiesAppreciated: number;
  totalValueChange: number;
  monthsProcessed: number;
}

export class BackgroundCalculationService {
  
  // Main function to process all offline progress
  static async processOfflineProgress(
    userId: string, 
    lastSeenGameTime: Date, 
    currentGameTime: Date
  ): Promise<BackgroundCalculationResult> {
    console.log('🔄 Starting background calculations...');
    console.log(`📅 Time range: ${lastSeenGameTime} to ${currentGameTime}`);
    
    const result: BackgroundCalculationResult = {
      rentalIncomeGenerated: 0,
      propertiesAppreciated: 0,
      totalValueChange: 0,
      monthsProcessed: 0,
    };
    
    try {
      // Calculate time difference in game months
      const timeDiffMs = currentGameTime.getTime() - lastSeenGameTime.getTime();
      const gameMonthsElapsed = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24 * 30)); // Approximate game months
      
      if (gameMonthsElapsed < 1) {
        console.log('⏱️ Less than 1 game month elapsed, skipping calculations');
        return result;
      }
      
      result.monthsProcessed = gameMonthsElapsed;
      
      // Get user's property investments
      const userInvestments = await this.getUserInvestments(userId);
      console.log(`🏠 Found ${userInvestments.length} investments to process`);
      
      // Process rental income for each month
      for (let month = 1; month <= gameMonthsElapsed; month++) {
        const monthDate = new Date(lastSeenGameTime.getTime() + (month * 30 * 24 * 60 * 60 * 1000));
        const monthlyRental = await this.calculateMonthlyRentalIncome(userInvestments, monthDate);
        result.rentalIncomeGenerated += monthlyRental;
        
        console.log(`💰 Month ${month}: Generated $${monthlyRental} rental income`);
      }
      
      // Process quarterly appreciation (every 3 months)
      const quartersElapsed = Math.floor(gameMonthsElapsed / 3);
      if (quartersElapsed > 0) {
        const appreciationResult = await this.processPropertyAppreciation(userInvestments, quartersElapsed);
        result.propertiesAppreciated = appreciationResult.propertiesAffected;
        result.totalValueChange = appreciationResult.totalValueChange;
        
        console.log(`📈 Processed ${quartersElapsed} quarters of appreciation`);
      }
      
      // Update user's USDC balance with rental income
      if (result.rentalIncomeGenerated > 0) {
        await this.creditUserBalance(userId, result.rentalIncomeGenerated);
      }
      
      console.log('✅ Background calculations completed:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error in background calculations:', error);
      return result;
    }
  }
  
  // Get user's current property investments
  private static async getUserInvestments(userId: string): Promise<any[]> {
    try {
      const investmentsQuery = query(
        collection(db, 'investments'),
        where('userId', '==', userId)
      );
      const investmentsSnapshot = await getDocs(investmentsQuery);
      
      const investments = [];
      for (const investmentDoc of investmentsSnapshot.docs) {
        const investment = investmentDoc.data();
        
        // Get property details
        const propertyDoc = await getDoc(doc(db, 'properties', investment.propertyId));
        if (propertyDoc.exists()) {
          investments.push({
            ...investment,
            property: propertyDoc.data(),
            investmentId: investmentDoc.id,
          });
        }
      }
      
      return investments;
    } catch (error) {
      console.error('Error getting user investments:', error);
      return [];
    }
  }
  
  // Calculate monthly rental income for user's portfolio
  private static async calculateMonthlyRentalIncome(investments: any[], monthDate: Date): Promise<number> {
    let totalMonthlyRental = 0;
    
    for (const investment of investments) {
      const property = investment.property;
      const sharesOwned = investment.sharesOwned;
      
      // Calculate rental yield
      const annualRental = property.currentValue * (property.rentalYield / 100);
      const monthlyRental = annualRental / 12;
      const monthlyRentalPerShare = monthlyRental / 100; // 100 total shares per property
      const userMonthlyRental = monthlyRentalPerShare * sharesOwned;
      
      totalMonthlyRental += userMonthlyRental;
    }
    
    return Number(totalMonthlyRental.toFixed(2));
  }
  
  // Process property appreciation for multiple quarters
  private static async processPropertyAppreciation(investments: any[], quarters: number): Promise<{
    propertiesAffected: number;
    totalValueChange: number;
  }> {
    let propertiesAffected = 0;
    let totalValueChange = 0;
    
    // For now, we'll apply a simple appreciation model
    // TODO: Replace with more sophisticated appreciation service
    for (const investment of investments) {
      const property = investment.property;
      const currentValue = property.currentValue;
      
      // Simple appreciation: 2-6% per quarter based on property class
      const classMultipliers = { A: 0.04, B: 0.03, C: 0.02 };
      const baseRate = classMultipliers[property.class as keyof typeof classMultipliers] || 0.02;
      const quarterlyRate = baseRate + (Math.random() * 0.02); // Add some randomness
      
      const totalAppreciation = quarterlyRate * quarters;
      const newValue = currentValue * (1 + totalAppreciation);
      const valueChange = newValue - currentValue;
      
      // Update property value in database
      await updateDoc(doc(db, 'properties', investment.propertyId), {
        currentValue: newValue,
        lastAppreciation: new Date(),
      });
      
      // Update investment value
      const newInvestmentValue = (newValue / 100) * investment.sharesOwned;
      await updateDoc(doc(db, 'investments', investment.investmentId), {
        currentValue: newInvestmentValue,
      });
      
      totalValueChange += valueChange * (investment.sharesOwned / 100);
      propertiesAffected++;
    }
    
    return {
      propertiesAffected,
      totalValueChange: Number(totalValueChange.toFixed(2)),
    };
  }
  
  // Credit rental income to user's USDC balance
  private static async creditUserBalance(userId: string, amount: number): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const newBalance = (userData.usdcBalance || 0) + amount;
        
        await updateDoc(userDoc, {
          usdcBalance: newBalance,
          lastRentalPayment: new Date(),
        });
      } else {
        // Create user document if it doesn't exist
        await updateDoc(userDoc, {
          usdcBalance: amount,
          lastRentalPayment: new Date(),
        });
      }
    } catch (error) {
      console.error('Error crediting user balance:', error);
    }
  }
}