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
   * Check for properties that should go pending/sold now and process lifecycle
   */
  static async processContractUpdates(currentGameTime: Date): Promise<Property[]> {
    try {
      const now = new Date();
      
      // Step 1: Get properties that should transition (contractTime <= now and status still 'for-sale')
      const contractQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'for-sale'),
        where('contractTime', '<=', now)
      );
      
      const contractSnapshot = await getDocs(contractQuery);
      // Instead of setting status to pending/sold, we'll delete old properties and create new ones instantly
      const propertiesToReplace = contractSnapshot.docs.map(docSnapshot => {
        const property = docSnapshot.data() as Property;
        console.log(`🔄 Property ${property.id} (Class ${property.class} - ${property.title || property.address}) reached end of lifecycle - replacing instantly`);
        return { docId: docSnapshot.id, property };
      });
      
      if (propertiesToReplace.length > 0) {
        await this.instantlyReplaceProperties(propertiesToReplace);
        console.log(`🔄 Replaced ${propertiesToReplace.length} properties instantly`);
      }
      
      // Return empty array since no properties go "pending" anymore - they're instantly replaced
      return [];
      
    } catch (error) {
      console.error('❌ Error processing contract updates:', error);
      return [];
    }
  }

  /**
   * Instantly replace properties that have reached end of lifecycle
   */
  static async instantlyReplaceProperties(propertiesToReplace: { docId: string; property: any }[]): Promise<void> {
    try {
      console.log(`🔄 Instantly replacing ${propertiesToReplace.length} properties...`);
      
      // Import the property generator and Firebase functions
      const { generateProperty } = await import('../utils/propertyGenerator');
      const { deleteDoc, addDoc, collection } = await import('firebase/firestore');
      
      const replacementPromises: Promise<any>[] = [];
      
      // For each property to replace, delete the old one and create a new one
      propertiesToReplace.forEach(({ docId, property }) => {
        console.log(`🗑️ Deleting old property: ${property.address} (Class ${property.class})`);
        
        // Delete the old property
        replacementPromises.push(deleteDoc(doc(db, 'properties', docId)));
        
        // Generate and add a new property
        const newProperty = generateProperty();
        console.log(`✨ Creating new property: ${newProperty.address} (Class ${newProperty.class})`);
        
        replacementPromises.push(addDoc(collection(db, 'properties'), newProperty));
      });
      
      await Promise.all(replacementPromises);
      console.log(`✅ Successfully replaced ${propertiesToReplace.length} properties instantly`);
      
    } catch (error) {
      console.error('❌ Error during instant property replacement:', error);
    }
  }

  /**
   * Replace sold properties with new ones (legacy method)
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
    return `Will cycle out in ${timing.gameYears}`;
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