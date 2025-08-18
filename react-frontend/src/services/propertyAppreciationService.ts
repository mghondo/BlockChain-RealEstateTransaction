import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAppreciationRate, calculateQuarterlyRate } from '../config/appreciationConfig';

interface AppreciationRecord {
  propertyId: string;
  appreciationRate: number; // Annual percentage
  lastCalculated: Date;
  quarterlyGains: QuarterlyGain[];
}

interface QuarterlyGain {
  quarter: string; // "2025-Q1"
  gainPercent: number;
  oldValue: number;
  newValue: number;
  calculatedAt: Date;
}

interface PropertyAppreciationData {
  currentValue: number;
  originalValue: number;
  totalAppreciation: number;
  totalAppreciationPercent: number;
  quarterlyHistory: QuarterlyGain[];
  annualAppreciationRate: number;
}

export class PropertyAppreciationService {
  
  // Get property appreciation rate using centralized config
  static getPropertyAppreciationRate(propertyClass: 'A' | 'B' | 'C'): number {
    return getAppreciationRate(propertyClass);
  }

  // Calculate what quarter we're in based on game date
  static getQuarter(gameDate: Date): string {
    const year = gameDate.getFullYear();
    const month = gameDate.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    return `${year}-Q${quarter}`;
  }

  // Check if property needs appreciation calculation
  static async needsAppreciationUpdate(propertyId: string, currentGameDate: Date): Promise<boolean> {
    try {
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      
      if (!propertyDoc.exists()) {
        return false;
      }

      const data = propertyDoc.data();
      const lastCalculated = data.lastAppreciationCalculated?.toDate();
      
      if (!lastCalculated) {
        return true; // Never calculated before
      }

      const currentQuarter = this.getQuarter(currentGameDate);
      const lastQuarter = this.getQuarter(lastCalculated);
      
      return currentQuarter !== lastQuarter;
    } catch (error) {
      console.error('Error checking appreciation update needed:', error);
      return false;
    }
  }

  // Apply appreciation to a property
  static async applyPropertyAppreciation(propertyId: string, gameDate: Date): Promise<void> {
    try {
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      
      if (!propertyDoc.exists()) {
        console.error(`Property ${propertyId} not found`);
        return;
      }

      const data = propertyDoc.data();
      const currentValue = data.currentValue || data.price;
      const propertyClass = data.class as 'A' | 'B' | 'C';
      const lastCalculated = data.lastAppreciationCalculated?.toDate();
      
      // Get or set appreciation rate for this property
      let appreciationRate = data.appreciationRate;
      if (!appreciationRate) {
        appreciationRate = this.getPropertyAppreciationRate(propertyClass);
      }

      const quarterlyRate = calculateQuarterlyRate(appreciationRate);
      
      // Calculate how many quarters have passed
      let quartersToApply = 1;
      if (lastCalculated) {
        const currentQuarter = this.getQuarter(gameDate);
        const lastQuarter = this.getQuarter(lastCalculated);
        
        if (currentQuarter === lastQuarter) {
          return; // Already calculated this quarter
        }
        
        // Calculate quarters between last and current
        const currentYear = gameDate.getFullYear();
        const currentQ = Math.ceil((gameDate.getMonth() + 1) / 3);
        const lastYear = lastCalculated.getFullYear();
        const lastQ = Math.ceil((lastCalculated.getMonth() + 1) / 3);
        
        quartersToApply = ((currentYear - lastYear) * 4) + (currentQ - lastQ);
        quartersToApply = Math.max(1, Math.min(quartersToApply, 12)); // Cap at 3 years
      }

      // Apply appreciation for each quarter
      let newValue = currentValue;
      const quarterlyHistory = data.quarterlyAppreciationHistory || [];
      
      for (let i = 0; i < quartersToApply; i++) {
        const oldValue = newValue;
        const gain = newValue * quarterlyRate;
        newValue = oldValue + gain;
        
        const quarterDate = new Date(gameDate);
        quarterDate.setMonth(quarterDate.getMonth() - (quartersToApply - 1 - i) * 3);
        
        const quarterlyGain: QuarterlyGain = {
          quarter: this.getQuarter(quarterDate),
          gainPercent: quarterlyRate * 100,
          oldValue,
          newValue,
          calculatedAt: new Date(),
        };
        
        quarterlyHistory.push(quarterlyGain);
      }

      // Keep only last 20 quarters (5 years) of history
      const trimmedHistory = quarterlyHistory.slice(-20);

      // Update property with new value and appreciation data
      await updateDoc(doc(db, 'properties', propertyId), {
        currentValue: Number(newValue.toFixed(8)),
        appreciationRate,
        lastAppreciationCalculated: gameDate,
        quarterlyAppreciationHistory: trimmedHistory,
        originalValue: data.originalValue || data.price, // Set original if not exists
      });

      console.log(`Applied ${quartersToApply} quarters of appreciation to property ${propertyId}: ${currentValue.toFixed(4)} → ${newValue.toFixed(4)} ETH`);

    } catch (error) {
      console.error('Error applying property appreciation:', error);
      throw error;
    }
  }

  // Update all user investments with current property values
  static async updateUserInvestmentValues(userId: string): Promise<void> {
    try {
      const investmentsQuery = query(
        collection(db, 'investments'),
        where('userId', '==', userId)
      );
      
      const investmentsSnapshot = await getDocs(investmentsQuery);
      
      for (const investmentDoc of investmentsSnapshot.docs) {
        const investmentData = investmentDoc.data();
        const propertyId = investmentData.propertyId;
        
        // Get updated property value
        const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
        if (propertyDoc.exists()) {
          const propertyData = propertyDoc.data();
          const currentPropertyValue = propertyData.currentValue || propertyData.price;
          
          // Calculate user's current value based on their share percentage
          const sharePercentage = investmentData.sharesOwned / 100;
          const userCurrentValue = currentPropertyValue * sharePercentage;
          
          // Update investment record
          await updateDoc(investmentDoc.ref, {
            currentValue: Number(userCurrentValue.toFixed(8)),
            lastUpdated: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error updating user investment values:', error);
      throw error;
    }
  }

  // Get appreciation data for a specific property
  static async getPropertyAppreciationData(propertyId: string): Promise<PropertyAppreciationData | null> {
    try {
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      
      if (!propertyDoc.exists()) {
        return null;
      }

      const data = propertyDoc.data();
      const currentValue = data.currentValue || data.price;
      const originalValue = data.originalValue || data.price;
      const quarterlyHistory = data.quarterlyAppreciationHistory || [];
      const appreciationRate = data.appreciationRate || 0;
      
      const totalAppreciation = currentValue - originalValue;
      const totalAppreciationPercent = originalValue > 0 ? (totalAppreciation / originalValue) * 100 : 0;

      return {
        currentValue,
        originalValue,
        totalAppreciation,
        totalAppreciationPercent,
        quarterlyHistory,
        annualAppreciationRate: appreciationRate * 100,
      };
    } catch (error) {
      console.error('Error getting property appreciation data:', error);
      return null;
    }
  }

  // Calculate total appreciation for user's portfolio
  static async getUserTotalAppreciation(userId: string): Promise<{
    totalAppreciation: number;
    totalAppreciationPercent: number;
    totalOriginalValue: number;
    totalCurrentValue: number;
  }> {
    try {
      const investmentsQuery = query(
        collection(db, 'investments'),
        where('userId', '==', userId)
      );
      
      const investmentsSnapshot = await getDocs(investmentsQuery);
      
      let totalOriginalValue = 0;
      let totalCurrentValue = 0;
      
      for (const investmentDoc of investmentsSnapshot.docs) {
        const data = investmentDoc.data();
        totalOriginalValue += data.purchasePrice;
        totalCurrentValue += data.currentValue || data.purchasePrice;
      }
      
      const totalAppreciation = totalCurrentValue - totalOriginalValue;
      const totalAppreciationPercent = totalOriginalValue > 0 ? (totalAppreciation / totalOriginalValue) * 100 : 0;

      return {
        totalAppreciation,
        totalAppreciationPercent,
        totalOriginalValue,
        totalCurrentValue,
      };
    } catch (error) {
      console.error('Error calculating user total appreciation:', error);
      return {
        totalAppreciation: 0,
        totalAppreciationPercent: 0,
        totalOriginalValue: 0,
        totalCurrentValue: 0,
      };
    }
  }

  // Process appreciation for all active properties (called by background service)
  static async processAllPropertyAppreciation(gameDate: Date): Promise<number> {
    try {
      console.log('Processing property appreciation for game date:', gameDate);
      
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'active')
      );
      
      const propertiesSnapshot = await getDocs(propertiesQuery);
      let processedCount = 0;
      
      for (const propertyDoc of propertiesSnapshot.docs) {
        const needsUpdate = await this.needsAppreciationUpdate(propertyDoc.id, gameDate);
        
        if (needsUpdate) {
          await this.applyPropertyAppreciation(propertyDoc.id, gameDate);
          processedCount++;
        }
      }
      
      console.log(`Processed appreciation for ${processedCount} properties`);
      return processedCount;
    } catch (error) {
      console.error('Error processing all property appreciation:', error);
      return 0;
    }
  }
}

export type { AppreciationRecord, QuarterlyGain, PropertyAppreciationData };