import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface RentalPayment {
  id?: string;
  userId: string;
  propertyId: string;
  amount: number; // USDC
  sharesOwned: number;
  totalPropertyValue: number;
  rentalYield: number;
  paymentMonth: string; // "2025-01"
  gameDate: Date;
  realDate: Date;
  processed: boolean;
}

interface UserInvestment {
  userId: string;
  propertyId: string;
  sharesOwned: number;
  purchasePrice: number;
  purchaseDate: Date;
  currentValue: number;
}

interface PropertyData {
  id: string;
  currentValue: number;
  rentalYield: number;
  class: 'A' | 'B' | 'C';
  status: string;
}

export class RentalIncomeService {
  
  // Calculate monthly rental income for a user's shares in a property
  static calculateMonthlyRental(
    propertyValue: number,
    rentalYield: number,
    userShares: number
  ): number {
    // Annual rental income = property value * (yield / 100)
    // Monthly rental income = annual / 12
    // User's portion = (monthly rental / 100 shares) * user shares
    
    const annualRental = propertyValue * (rentalYield / 100);
    const monthlyRental = annualRental / 12;
    const monthlyRentalPerShare = monthlyRental / 100; // 100 shares per property
    const userMonthlyRental = monthlyRentalPerShare * userShares;
    
    return Number(userMonthlyRental.toFixed(2));
  }

  // Get all user investments (properties they own shares in)
  static async getUserInvestments(userId: string): Promise<UserInvestment[]> {
    try {
      const investmentsQuery = query(
        collection(db, 'investments'),
        where('userId', '==', userId)
      );
      
      const investmentsSnapshot = await getDocs(investmentsQuery);
      
      return investmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.userId,
          propertyId: data.propertyId,
          sharesOwned: data.sharesOwned,
          purchasePrice: data.purchasePrice,
          purchaseDate: data.purchaseDate.toDate(),
          currentValue: data.currentValue || data.purchasePrice,
        };
      });
    } catch (error) {
      console.error('Error getting user investments:', error);
      return [];
    }
  }

  // Get property data for rental calculations
  static async getPropertyData(propertyId: string): Promise<PropertyData | null> {
    try {
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      
      if (propertyDoc.exists()) {
        const data = propertyDoc.data();
        return {
          id: propertyDoc.id,
          currentValue: data.currentValue || data.price,
          rentalYield: data.rentalYield,
          class: data.class,
          status: data.status || 'active',
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting property data:', error);
      return null;
    }
  }

  // Process rental income for a specific user
  static async processUserRentalIncome(userId: string, gameDate: Date): Promise<number> {
    try {
      console.log(`Processing rental income for user ${userId} on game date:`, gameDate);
      
      // Get all user investments
      const investments = await this.getUserInvestments(userId);
      
      if (investments.length === 0) {
        console.log(`No investments found for user ${userId}`);
        return 0;
      }

      let totalRentalIncome = 0;
      const paymentMonth = `${gameDate.getFullYear()}-${String(gameDate.getMonth() + 1).padStart(2, '0')}`;

      // Process each investment
      for (const investment of investments) {
        const propertyData = await this.getPropertyData(investment.propertyId);
        
        if (!propertyData || propertyData.status !== 'active') {
          console.log(`Skipping inactive property ${investment.propertyId}`);
          continue;
        }

        // Check if payment already processed for this month
        const existingPayment = await this.checkExistingPayment(
          userId, 
          investment.propertyId, 
          paymentMonth
        );

        if (existingPayment) {
          console.log(`Payment already processed for ${investment.propertyId} in ${paymentMonth}`);
          continue;
        }

        // Calculate rental income
        const rentalAmount = this.calculateMonthlyRental(
          propertyData.currentValue,
          propertyData.rentalYield,
          investment.sharesOwned
        );

        if (rentalAmount > 0) {
          // Create rental payment record
          await this.createRentalPayment({
            userId,
            propertyId: investment.propertyId,
            amount: rentalAmount,
            sharesOwned: investment.sharesOwned,
            totalPropertyValue: propertyData.currentValue,
            rentalYield: propertyData.rentalYield,
            paymentMonth,
            gameDate,
            realDate: new Date(),
            processed: true,
          });

          totalRentalIncome += rentalAmount;
          console.log(`Processed ${rentalAmount} rental for property ${investment.propertyId}`);
        }
      }

      // Update user's USDC balance
      if (totalRentalIncome > 0) {
        await this.updateUserBalance(userId, totalRentalIncome);
        console.log(`Total rental income for user ${userId}: ${totalRentalIncome}`);
      }

      return totalRentalIncome;

    } catch (error) {
      console.error('Error processing user rental income:', error);
      return 0;
    }
  }

  // Check if payment already exists for this user/property/month
  static async checkExistingPayment(
    userId: string, 
    propertyId: string, 
    paymentMonth: string
  ): Promise<boolean> {
    try {
      const paymentsQuery = query(
        collection(db, 'rentalIncome'),
        where('userId', '==', userId),
        where('propertyId', '==', propertyId),
        where('paymentMonth', '==', paymentMonth)
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      return !paymentsSnapshot.empty;
    } catch (error) {
      console.error('Error checking existing payment:', error);
      return false;
    }
  }

  // Create rental payment record
  static async createRentalPayment(payment: Omit<RentalPayment, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, 'rentalIncome'), payment);
    } catch (error) {
      console.error('Error creating rental payment:', error);
      throw error;
    }
  }

  // Update user's USDC balance
  static async updateUserBalance(userId: string, amount: number): Promise<void> {
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const currentBalance = userData.usdcBalance || 0;
        const newBalance = currentBalance + amount;
        
        await updateDoc(userDoc, {
          usdcBalance: newBalance,
          lastRentalPayment: new Date(),
        });

        console.log(`Updated user ${userId} USDC balance: ${currentBalance} → ${newBalance}`);
      }
    } catch (error) {
      console.error('Error updating user balance:', error);
      throw error;
    }
  }

  // Get rental income history for a user
  static async getRentalHistory(userId: string, limit: number = 50): Promise<RentalPayment[]> {
    try {
      const rentalQuery = query(
        collection(db, 'rentalIncome'),
        where('userId', '==', userId)
      );
      
      const rentalSnapshot = await getDocs(rentalQuery);
      
      const payments = rentalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        gameDate: doc.data().gameDate.toDate(),
        realDate: doc.data().realDate.toDate(),
      })) as RentalPayment[];

      // Sort by game date descending
      return payments.sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime()).slice(0, limit);
      
    } catch (error) {
      console.error('Error getting rental history:', error);
      return [];
    }
  }

  // Calculate total rental income earned by user
  static async getTotalRentalIncome(userId: string): Promise<number> {
    try {
      const history = await this.getRentalHistory(userId);
      return history.reduce((total, payment) => total + payment.amount, 0);
    } catch (error) {
      console.error('Error calculating total rental income:', error);
      return 0;
    }
  }

  // Calculate projected monthly income based on current holdings
  static async getProjectedMonthlyIncome(userId: string): Promise<number> {
    try {
      const investments = await this.getUserInvestments(userId);
      let projectedMonthly = 0;

      for (const investment of investments) {
        const propertyData = await this.getPropertyData(investment.propertyId);
        
        if (propertyData && propertyData.status === 'active') {
          const monthlyRental = this.calculateMonthlyRental(
            propertyData.currentValue,
            propertyData.rentalYield,
            investment.sharesOwned
          );
          projectedMonthly += monthlyRental;
        }
      }

      return Number(projectedMonthly.toFixed(2));
    } catch (error) {
      console.error('Error calculating projected monthly income:', error);
      return 0;
    }
  }
}

export type { RentalPayment, UserInvestment, PropertyData };