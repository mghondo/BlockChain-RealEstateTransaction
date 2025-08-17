import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Property, PropertyClass } from '../types/property';

export interface PropertyContractTiming {
  minHours: number;
  maxHours: number;
  gameYears: string;
}

export const CONTRACT_TIMINGS: Record<PropertyClass, PropertyContractTiming> = {
  'A': {
    minHours: 24, // 2 game years
    maxHours: 36, // 3 game years
    gameYears: '2-3 years'
  },
  'B': {
    minHours: 12, // 1 game year
    maxHours: 24, // 2 game years
    gameYears: '1-2 years'
  },
  'C': {
    minHours: 6,  // 6 game months
    maxHours: 6,  // 6 game months
    gameYears: '6 months'
  }
};

export class PropertyContractService {
  
  /**
   * Calculate when a property should go under contract
   * Based on property class and random timing within the range
   */
  static calculateContractTime(property: Property, gameStartTime: Date): Date {
    const timing = CONTRACT_TIMINGS[property.class];
    
    // Random time between min and max hours
    const randomHours = Math.random() * (timing.maxHours - timing.minHours) + timing.minHours;
    
    // Convert to milliseconds (real time, not game time)
    const contractTimeMs = gameStartTime.getTime() + (randomHours * 60 * 60 * 1000);
    
    return new Date(contractTimeMs);
  }

  /**
   * Initialize contract times for all properties that don't have them
   */
  static async initializePropertyContractTimes(gameStartTime: Date): Promise<void> {
    try {
      console.log('🏠 Initializing property contract times...');
      
      // Get all properties without contract times
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('contractTime', '==', null)
      );
      
      const snapshot = await getDocs(propertiesQuery);
      const updatePromises: Promise<void>[] = [];
      
      snapshot.docs.forEach((docSnapshot) => {
        const property = docSnapshot.data() as Property;
        const contractTime = this.calculateContractTime(property, gameStartTime);
        
        console.log(`📅 Property ${property.id} (Class ${property.class}) will go under contract at:`, contractTime);
        
        updatePromises.push(
          updateDoc(doc(db, 'properties', docSnapshot.id), {
            contractTime: contractTime,
            contractTimeInitialized: serverTimestamp()
          })
        );
      });
      
      await Promise.all(updatePromises);
      console.log(`✅ Initialized contract times for ${updatePromises.length} properties`);
      
    } catch (error) {
      console.error('❌ Error initializing property contract times:', error);
    }
  }

  /**
   * Check for properties that should go pending now and process pending → sold cycle
   */
  static async processContractUpdates(currentGameTime: Date): Promise<Property[]> {
    try {
      const now = new Date();
      
      // Step 1: Get properties that should go pending (contractTime <= now and status still 'for-sale')
      const contractQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'for-sale'),
        where('contractTime', '<=', now)
      );
      
      const contractSnapshot = await getDocs(contractQuery);
      const newlyPendingProperties: Property[] = [];
      const contractUpdatePromises: Promise<void>[] = [];
      
      contractSnapshot.docs.forEach((docSnapshot) => {
        const property = docSnapshot.data() as Property;
        newlyPendingProperties.push(property);
        
        console.log(`⏳ Property ${property.id} (${property.title || property.address}) going pending!`);
        
        contractUpdatePromises.push(
          updateDoc(doc(db, 'properties', docSnapshot.id), {
            status: 'pending',
            pendingStartTime: serverTimestamp(),
            gameTimeWhenPending: currentGameTime
          })
        );
      });
      
      await Promise.all(contractUpdatePromises);
      
      // Step 2: Check for properties that have been pending for 10+ minutes and should be sold/replaced
      const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));
      const pendingQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'pending'),
        where('pendingStartTime', '<=', tenMinutesAgo)
      );
      
      const pendingSnapshot = await getDocs(pendingQuery);
      const replacementPromises: Promise<void>[] = [];
      
      pendingSnapshot.docs.forEach((docSnapshot) => {
        const property = docSnapshot.data() as Property;
        
        console.log(`✅ Property ${property.id} (${property.title || property.address}) completed pending period - marking for replacement`);
        
        replacementPromises.push(
          updateDoc(doc(db, 'properties', docSnapshot.id), {
            status: 'sold',
            replacementScheduled: true
          })
        );
      });
      
      await Promise.all(replacementPromises);
      
      // Step 3: Generate new properties to replace sold ones
      if (pendingSnapshot.docs.length > 0) {
        await this.replaceProperties(pendingSnapshot.docs.length);
      }
      
      if (newlyPendingProperties.length > 0) {
        console.log(`⏳ ${newlyPendingProperties.length} properties went pending`);
      }
      
      return newlyPendingProperties;
      
    } catch (error) {
      console.error('❌ Error processing contract updates:', error);
      return [];
    }
  }

  /**
   * Replace sold properties with new ones
   */
  static async replaceProperties(count: number): Promise<void> {
    try {
      console.log(`🔄 Generating ${count} new properties to replace sold ones...`);
      
      // Import the property generator
      const { generateProperty } = await import('../utils/propertyGenerator');
      const { addDoc, collection } = await import('firebase/firestore');
      
      const newPropertyPromises: Promise<any>[] = [];
      
      for (let i = 0; i < count; i++) {
        const newProperty = generateProperty();
        console.log(`📦 Generated replacement property: ${newProperty.address} (Class ${newProperty.class})`);
        
        newPropertyPromises.push(
          addDoc(collection(db, 'properties'), newProperty)
        );
      }
      
      await Promise.all(newPropertyPromises);
      console.log(`✅ Successfully generated ${count} replacement properties`);
      
    } catch (error) {
      console.error('❌ Error replacing properties:', error);
    }
  }

  /**
   * Get contract timing info for display
   */
  static getContractTimingDisplay(propertyClass: PropertyClass): string {
    const timing = CONTRACT_TIMINGS[propertyClass];
    return `Expected to contract in ${timing.gameYears}`;
  }

  /**
   * Calculate time remaining until contract (for display)
   */
  static getTimeUntilContract(contractTime: Date): string {
    const now = new Date();
    const msRemaining = contractTime.getTime() - now.getTime();
    
    if (msRemaining <= 0) {
      return 'Ready for contract';
    }
    
    const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemaining / 24);
    
    if (daysRemaining > 0) {
      return `${daysRemaining}d ${hoursRemaining % 24}h remaining`;
    } else {
      return `${hoursRemaining}h remaining`;
    }
  }

  /**
   * Calculate time remaining in pending period (for display)
   */
  static getPendingTimeRemaining(pendingStartTime: Date): string {
    const now = new Date();
    const pendingStartMs = pendingStartTime.getTime();
    const tenMinutesMs = 10 * 60 * 1000;
    const completionTime = pendingStartMs + tenMinutesMs;
    const msRemaining = completionTime - now.getTime();
    
    if (msRemaining <= 0) {
      return 'Processing sale...';
    }
    
    const minutesRemaining = Math.ceil(msRemaining / (1000 * 60));
    return `${minutesRemaining}m until sold`;
  }
}