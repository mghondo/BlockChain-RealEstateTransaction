import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SimpleRentalProcessor } from './simpleRentalProcessor';

interface HourlyCollectionRecord {
  userId: string;
  lastCollectionTime: Date;
  totalCollections: number;
  lastUpdated: Date;
}

export class HourlyRentalService {
  private static timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Check if current time is a collection time (:00 or :30)
   */
  static isCollectionTime(): boolean {
    const now = new Date();
    const minutes = now.getMinutes();
    return minutes === 0 || minutes === 30;
  }

  /**
   * Get the next collection time (:00 or :30)
   */
  static getNextCollectionTime(): Date {
    const now = new Date();
    const nextTime = new Date(now);
    
    if (now.getMinutes() < 30) {
      nextTime.setMinutes(30, 0, 0); // Next :30
    } else {
      nextTime.setHours(nextTime.getHours() + 1, 0, 0, 0); // Next :00
    }
    
    return nextTime;
  }

  /**
   * Get all missed collection times since last login
   */
  static getMissedCollectionTimes(lastCollectionTime: Date, currentTime: Date): Date[] {
    const missedTimes: Date[] = [];
    const checkTime = new Date(lastCollectionTime);
    
    // Start from the next collection time after last collection
    if (checkTime.getMinutes() < 30) {
      checkTime.setMinutes(30, 0, 0);
    } else {
      checkTime.setHours(checkTime.getHours() + 1, 0, 0, 0);
    }
    
    // Find all :00 and :30 times until now
    while (checkTime <= currentTime) {
      missedTimes.push(new Date(checkTime));
      
      // Move to next collection time
      if (checkTime.getMinutes() === 0) {
        checkTime.setMinutes(30); // :00 → :30
      } else {
        checkTime.setHours(checkTime.getHours() + 1, 0, 0, 0); // :30 → next :00
      }
    }
    
    return missedTimes;
  }

  /**
   * Process missed collections for a user who was offline
   */
  static async processMissedCollections(userId: string, investments: any[]): Promise<number> {
    try {
      console.log('🔄 Processing missed rental collections for user:', userId);
      
      // Get last collection time from user's record
      const recordDoc = doc(db, `users/${userId}/rentalCollections`, 'hourlyRecord');
      const recordSnapshot = await getDoc(recordDoc);
      
      let lastCollectionTime = new Date();
      let totalCollected = 0;
      
      if (recordSnapshot.exists()) {
        const data = recordSnapshot.data();
        lastCollectionTime = data.lastCollectionTime.toDate();
        console.log('📅 Last collection time:', lastCollectionTime.toISOString());
      } else {
        // New user - set last collection time to oldest investment
        if (investments.length > 0) {
          const oldestInvestment = investments.reduce((oldest, current) => 
            new Date(current.purchaseDate) < new Date(oldest.purchaseDate) ? current : oldest
          );
          lastCollectionTime = new Date(oldestInvestment.purchaseDate);
          console.log('👶 New user - starting from oldest investment:', lastCollectionTime.toISOString());
        }
      }
      
      const now = new Date();
      const missedTimes = this.getMissedCollectionTimes(lastCollectionTime, now);
      
      console.log(`⏰ Found ${missedTimes.length} missed collection periods:`, missedTimes.map(t => t.toISOString()));
      
      if (missedTimes.length === 0) {
        console.log('✨ No missed collections - user is up to date');
        return 0;
      }
      
      // Process each missed collection
      for (const collectionTime of missedTimes) {
        const result = await SimpleRentalProcessor.calculatePendingRental(userId, investments);
        
        if (result.pendingAmount > 0.01) { // Only collect if meaningful amount
          console.log(`💰 Collecting missed rental for ${collectionTime.toISOString()}: $${result.pendingAmount.toFixed(2)}`);
          
          const collectionResult = await SimpleRentalProcessor.collectPendingRental(userId, investments);
          if (collectionResult.success) {
            totalCollected += collectionResult.amountPaid;
          }
        }
      }
      
      // Update or create collection record
      if (recordSnapshot.exists()) {
        await updateDoc(recordDoc, {
          lastCollectionTime: now,
          totalCollections: (recordSnapshot.data()?.totalCollections || 0) + missedTimes.length,
          lastUpdated: now
        });
      } else {
        await setDoc(recordDoc, {
          userId,
          lastCollectionTime: now,
          totalCollections: missedTimes.length,
          lastUpdated: now
        });
      }
      
      console.log(`✅ Processed ${missedTimes.length} missed collections, total collected: $${totalCollected.toFixed(2)}`);
      return totalCollected;
      
    } catch (error) {
      console.error('❌ Failed to process missed collections:', error);
      return 0;
    }
  }

  /**
   * Perform a single hourly collection
   */
  static async performHourlyCollection(userId: string, investments: any[]): Promise<boolean> {
    try {
      console.log('💰 Performing scheduled hourly collection for user:', userId);
      
      const result = await SimpleRentalProcessor.calculatePendingRental(userId, investments);
      
      if (result.pendingAmount > 0.01) {
        console.log(`💵 Collecting hourly rental: $${result.pendingAmount.toFixed(2)}`);
        
        const collectionResult = await SimpleRentalProcessor.collectPendingRental(userId, investments);
        
        if (collectionResult.success) {
          // Update collection record
          const recordDoc = doc(db, `users/${userId}/rentalCollections`, 'hourlyRecord');
          const recordSnapshot = await getDoc(recordDoc);
          
          if (recordSnapshot.exists()) {
            await updateDoc(recordDoc, {
              lastCollectionTime: new Date(),
              lastUpdated: new Date()
            });
          } else {
            await setDoc(recordDoc, {
              userId,
              lastCollectionTime: new Date(),
              totalCollections: 1,
              lastUpdated: new Date()
            });
          }
          
          console.log(`✅ Hourly collection successful: $${collectionResult.amountPaid.toFixed(2)}`);
          return true;
        }
      } else {
        console.log('✨ No meaningful rental income to collect this hour');
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to perform hourly collection:', error);
      return false;
    }
  }

  /**
   * Start the hourly timer for an active user
   */
  static startHourlyTimer(userId: string, investments: any[]): void {
    // Clear existing timer if any
    this.stopHourlyTimer(userId);
    
    console.log('⏰ Starting hourly rental timer for user:', userId);
    
    const checkAndCollect = async () => {
      if (this.isCollectionTime()) {
        console.log('🎯 Collection time reached! Processing rental...');
        await this.performHourlyCollection(userId, investments);
      }
    };
    
    // Check every minute
    const timer = setInterval(checkAndCollect, 60 * 1000);
    this.timers.set(userId, timer);
    
    console.log('✅ Hourly timer started - checking every minute for :00/:30');
    
    // Also check immediately in case we're right at a collection time
    checkAndCollect();
  }

  /**
   * Stop the hourly timer for a user
   */
  static stopHourlyTimer(userId: string): void {
    const timer = this.timers.get(userId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(userId);
      console.log('🛑 Stopped hourly timer for user:', userId);
    }
  }

  /**
   * Initialize hourly collection for a user (catch-up + start timer)
   */
  static async initializeForUser(userId: string, investments: any[]): Promise<void> {
    try {
      console.log('🚀 Initializing hourly rental collection for user:', userId);
      
      // First, process any missed collections
      const missedAmount = await this.processMissedCollections(userId, investments);
      
      if (missedAmount > 0) {
        console.log(`💰 Caught up on missed collections: $${missedAmount.toFixed(2)}`);
      }
      
      // Then start the timer for future collections
      this.startHourlyTimer(userId, investments);
      
      console.log('✅ Hourly rental system initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize hourly rental system:', error);
    }
  }

  /**
   * Cleanup for user logout
   */
  static cleanupForUser(userId: string): void {
    this.stopHourlyTimer(userId);
    console.log('🧹 Cleaned up hourly rental system for user:', userId);
  }
}