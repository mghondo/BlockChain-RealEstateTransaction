import { doc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

interface PropertyTimingConfig {
  minHours: number;
  maxHours: number;
}

const TIMELINE_CONFIG: Record<'A' | 'B' | 'C', PropertyTimingConfig> = {
  'A': { minHours: 24, maxHours: 36 }, // 2-3 game years
  'B': { minHours: 12, maxHours: 24 }, // 1-2 game years  
  'C': { minHours: 6, maxHours: 6 }    // 6 game months
};

export class PropertyTimelineService {
  
  /**
   * Initialize timeline for properties that don't have one
   * This runs in background without affecting UI
   */
  static async initializePropertyTimelines(): Promise<void> {
    try {
      console.log('🔄 Initializing property timelines (background)...');
      
      // Get all properties and filter for those without timeline
      const snapshot = await getDocs(collection(db, 'properties'));
      const updatePromises: Promise<void>[] = [];
      let processedCount = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const property = docSnapshot.data();
        
        // Skip if already has timeline initialized
        if (property.timelineInitialized === true) {
          return;
        }
        
        const timing = TIMELINE_CONFIG[property.class as 'A' | 'B' | 'C'];
        
        if (timing) {
          processedCount++;
          // Random time between min and max hours from now
          const randomHours = Math.random() * (timing.maxHours - timing.minHours) + timing.minHours;
          const contractTime = new Date(Date.now() + (randomHours * 60 * 60 * 1000));
          
          console.log(`⏰ Property ${property.address} (Class ${property.class}) will sell at:`, contractTime);
          
          updatePromises.push(
            updateDoc(doc(db, 'properties', docSnapshot.id), {
              contractTime: contractTime,
              timelineInitialized: true,
              timelineSetAt: serverTimestamp()
            })
          );
        }
      });
      
      await Promise.all(updatePromises);
      console.log(`✅ Initialized timelines for ${processedCount} properties`);
      
    } catch (error) {
      console.error('❌ Error initializing property timelines:', error);
    }
  }

  /**
   * Process properties that should sell now (background only)
   */
  static async processPropertySales(): Promise<number> {
    try {
      const now = new Date();
      
      // Find properties whose time has come
      const readyQuery = query(
        collection(db, 'properties'),
        where('status', '==', 'available'),
        where('contractTime', '<=', now)
      );
      
      const snapshot = await getDocs(readyQuery);
      const updatePromises: Promise<void>[] = [];
      let soldCount = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        const property = docSnapshot.data();
        soldCount++;
        
        console.log(`🏠 Property SOLD: ${property.address} (Class ${property.class})`);
        
        updatePromises.push(
          updateDoc(doc(db, 'properties', docSnapshot.id), {
            status: 'sold_out',
            soldAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(updatePromises);
      
      // Generate replacement properties
      if (soldCount > 0) {
        await this.generateReplacementProperties(soldCount);
      }
      
      return soldCount;
      
    } catch (error) {
      console.error('❌ Error processing property sales:', error);
      return 0;
    }
  }

  /**
   * Generate new properties to replace sold ones
   */
  static async generateReplacementProperties(count: number): Promise<void> {
    try {
      console.log(`🏗️ Generating ${count} replacement properties...`);
      
      const { generateProperty } = await import('../utils/propertyGenerator');
      const newPropertyPromises: Promise<any>[] = [];
      
      for (let i = 0; i < count; i++) {
        const newProperty = generateProperty();
        console.log(`📦 New property: ${newProperty.address} (Class ${newProperty.class})`);
        
        newPropertyPromises.push(
          addDoc(collection(db, 'properties'), {
            ...newProperty,
            createdAt: serverTimestamp()
          })
        );
      }
      
      await Promise.all(newPropertyPromises);
      console.log(`✅ Generated ${count} replacement properties`);
      
    } catch (error) {
      console.error('❌ Error generating replacement properties:', error);
    }
  }

  /**
   * Start the background timeline processor
   */
  static startBackgroundProcessor(): void {
    console.log('🚀 Starting property timeline background processor...');
    
    // Initialize timelines immediately
    this.initializePropertyTimelines();
    
    // Process every minute
    setInterval(async () => {
      const soldCount = await this.processPropertySales();
      if (soldCount > 0) {
        console.log(`📊 Background processor: ${soldCount} properties sold this cycle`);
      }
    }, 60000); // Every minute
    
    // Re-initialize any new properties every 5 minutes
    setInterval(() => {
      this.initializePropertyTimelines();
    }, 5 * 60000);
  }
}