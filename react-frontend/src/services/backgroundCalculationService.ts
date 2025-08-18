import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RentalIncomeService } from './rentalIncomeService';
import { PropertyAppreciationService } from './propertyAppreciationService';
import { PropertyContractService } from './propertyContractService';
import { getAppreciationRate, calculateQuarterlyRate } from '../config/appreciationConfig';

interface BackgroundCalculationResult {
  rentalIncomeGenerated: number;
  propertiesAppreciated: number;
  totalValueChange: number;
  monthsProcessed: number;
}

interface OfflineProgress {
  realTimeOffline: number;
  gameTimeElapsed: number;
  gameMonthsElapsed: number;
  rentalIncome: number;
  appreciation: number;
  newProperties: any[];
  contractedProperties: any[];
  message: string;
}

export class BackgroundCalculationService {
  
  // Calculate missed rental income using the new RentalIncomeService
  static async calculateMissedRentalIncome(
    userId: string, 
    lastGameTime: Date, 
    currentGameTime: Date
  ): Promise<number> {
    try {
      console.log('Calculating missed rental income for user:', userId);
      console.log('Time period:', lastGameTime, 'to', currentGameTime);

      // Calculate how many game months have passed
      const timeDiff = currentGameTime.getTime() - lastGameTime.getTime();
      const gameMonthsElapsed = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30)); // Approx game months

      if (gameMonthsElapsed < 1) {
        console.log('Less than 1 game month elapsed, no rental processing needed');
        return 0;
      }

      console.log(`Processing ${gameMonthsElapsed} months of missed rental income`);

      let totalRentalIncome = 0;

      // Process rental income for each missed month
      for (let month = 1; month <= gameMonthsElapsed; month++) {
        const paymentDate = new Date(lastGameTime.getTime() + (month * 30 * 24 * 60 * 60 * 1000));
        
        const monthlyIncome = await RentalIncomeService.processUserRentalIncome(userId, paymentDate);
        totalRentalIncome += monthlyIncome;
        
        console.log(`Month ${month}: ${monthlyIncome} rental income processed`);
      }

      console.log(`Total missed rental income: ${totalRentalIncome}`);
      return totalRentalIncome;

    } catch (error) {
      console.error('Error calculating missed rental income:', error);
      return 0;
    }
  }

  // Calculate missed property appreciation while offline
  static async calculateMissedAppreciation(
    userId: string,
    lastGameTime: Date,
    currentGameTime: Date
  ): Promise<number> {
    try {
      console.log('Calculating missed appreciation for user:', userId);
      console.log('Time period:', lastGameTime, 'to', currentGameTime);

      // Get initial portfolio value
      const initialAppreciation = await PropertyAppreciationService.getUserTotalAppreciation(userId);
      
      // Process appreciation for all properties for the time period
      const timeDiff = currentGameTime.getTime() - lastGameTime.getTime();
      const quartersElapsed = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 90)); // 90 days per quarter

      if (quartersElapsed < 1) {
        console.log('Less than 1 quarter elapsed, no appreciation processing needed');
        return 0;
      }

      console.log(`Processing ${quartersElapsed} quarters of appreciation`);

      // Process appreciation for each quarter
      for (let quarter = 1; quarter <= quartersElapsed; quarter++) {
        const quarterDate = new Date(lastGameTime.getTime() + (quarter * 90 * 24 * 60 * 60 * 1000));
        await PropertyAppreciationService.processAllPropertyAppreciation(quarterDate);
      }

      // Update all user investments with new values
      await PropertyAppreciationService.updateUserInvestmentValues(userId);

      // Get final portfolio value and calculate gains
      const finalAppreciation = await PropertyAppreciationService.getUserTotalAppreciation(userId);
      const appreciationGains = finalAppreciation.totalAppreciation - initialAppreciation.totalAppreciation;

      console.log(`Total appreciation gains: ${appreciationGains}`);
      return Math.max(0, appreciationGains);

    } catch (error) {
      console.error('Error calculating missed appreciation:', error);
      return 0;
    }
  }

  // Process offline progress for UI display
  static async processOfflineProgress(userId: string, lastSeen: Date): Promise<OfflineProgress> {
    const now = new Date();
    const offlineRealTime = now.getTime() - lastSeen.getTime();
    const offlineGameTime = offlineRealTime * 1440; // TIME_MULTIPLIER from useGameTime
    const currentGameTime = new Date(lastSeen.getTime() + offlineGameTime);

    // Calculate missed rental income
    const missedRentalIncome = await this.calculateMissedRentalIncome(
      userId, 
      lastSeen, 
      currentGameTime
    );

    // Process property appreciation for the time offline
    const appreciationGains = await this.calculateMissedAppreciation(
      userId,
      lastSeen,
      currentGameTime
    );

    // Process property contracts that went pending while offline
    let pendingProperties: any[] = [];
    try {
      pendingProperties = await PropertyContractService.processContractUpdates(currentGameTime);
      console.log(`⏳ ${pendingProperties.length} properties went pending while offline`);
    } catch (error) {
      console.error('Error processing missed contracts:', error);
    }

    const totalMessage = [];
    if (missedRentalIncome > 0) {
      totalMessage.push(`You earned ${missedRentalIncome.toFixed(2)} USDC in rental income`);
    }
    if (appreciationGains > 0) {
      totalMessage.push(`Your properties appreciated by ${appreciationGains.toFixed(4)} ETH`);
    }
    if (pendingProperties.length > 0) {
      totalMessage.push(`${pendingProperties.length} properties went pending/sold`);
    }

    return {
      realTimeOffline: offlineRealTime,
      gameTimeElapsed: offlineGameTime,
      gameMonthsElapsed: Math.floor(offlineGameTime / (1000 * 60 * 60 * 24 * 30)),
      rentalIncome: missedRentalIncome,
      appreciation: appreciationGains,
      newProperties: [],
      contractedProperties: pendingProperties,
      message: totalMessage.length > 0 
        ? `While away: ${totalMessage.join(' and ')}!`
        : 'No changes while away.'
    };
  }
  
  // Legacy method for detailed background calculations (DEPRECATED - use processOfflineProgress instead)
  static async processLegacyOfflineProgress(
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
      
      // Use centralized appreciation config
      const annualRate = getAppreciationRate(property.class as 'A' | 'B' | 'C');
      const quarterlyRate = calculateQuarterlyRate(annualRate);
      
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