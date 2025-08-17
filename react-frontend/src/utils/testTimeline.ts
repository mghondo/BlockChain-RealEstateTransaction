import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PropertyTimelineService } from '../services/propertyTimelineService';

/**
 * Test utility to verify the timeline system is working
 */
export const testTimelineSystem = async () => {
  console.log('🧪 Testing timeline system...');
  
  try {
    // Check if properties exist
    const propertiesQuery = query(collection(db, 'properties'));
    const snapshot = await getDocs(propertiesQuery);
    
    console.log(`📊 Found ${snapshot.docs.length} properties in database`);
    
    // Check timeline initialization status
    const timelineQuery = query(
      collection(db, 'properties'),
      where('timelineInitialized', '==', true)
    );
    const timelineSnapshot = await getDocs(timelineQuery);
    
    console.log(`⏰ Properties with timeline: ${timelineSnapshot.docs.length}`);
    
    // Check available properties
    const availableQuery = query(
      collection(db, 'properties'),
      where('status', '==', 'available')
    );
    const availableSnapshot = await getDocs(availableQuery);
    
    console.log(`🏠 Available properties: ${availableSnapshot.docs.length}`);
    
    // Check sold properties
    const soldQuery = query(
      collection(db, 'properties'),
      where('status', '==', 'sold_out')
    );
    const soldSnapshot = await getDocs(soldQuery);
    
    console.log(`💰 Sold properties: ${soldSnapshot.docs.length}`);
    
    // Show some property details for debugging
    if (timelineSnapshot.docs.length > 0) {
      console.log('📋 Sample properties with timelines:');
      timelineSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const property = doc.data();
        const contractTime = property.contractTime?.toDate();
        console.log(`${index + 1}. ${property.address} (Class ${property.class}) - Contract: ${contractTime ? contractTime.toLocaleString() : 'None'}`);
      });
    }
    
    return {
      totalProperties: snapshot.docs.length,
      propertiesWithTimeline: timelineSnapshot.docs.length,
      availableProperties: availableSnapshot.docs.length,
      soldProperties: soldSnapshot.docs.length
    };
    
  } catch (error) {
    console.error('❌ Timeline test failed:', error);
    throw error;
  }
};

// Auto-run test when imported (for development)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testTimelineSystem().catch(console.error);
  }, 2000); // Wait 2 seconds for app initialization
}