import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * One-time cleanup function to convert all existing Class C pending properties to sold
 * This fixes the issue where Class C properties were set to pending before the code change
 */
export async function cleanupClassCPendingProperties(): Promise<void> {
  try {
    console.log('🧹 Starting cleanup of Class C pending properties...');
    
    // Find all Class C properties that are currently pending
    const pendingClassCQuery = query(
      collection(db, 'properties'),
      where('status', '==', 'pending'),
      where('class', '==', 'C')
    );
    
    const snapshot = await getDocs(pendingClassCQuery);
    
    if (snapshot.empty) {
      console.log('✅ No Class C pending properties found - cleanup not needed');
      return;
    }
    
    console.log(`🔄 Found ${snapshot.docs.length} Class C pending properties to clean up`);
    
    // Update all Class C pending properties to sold
    const updatePromises = snapshot.docs.map(docSnapshot => {
      const property = docSnapshot.data();
      console.log(`🔄 Converting Class C property ${property.id || docSnapshot.id} from pending to sold`);
      
      return updateDoc(doc(db, 'properties', docSnapshot.id), {
        status: 'sold',
        replacementScheduled: true,
        soldDirectly: true,
        cleanedUp: true, // Flag to indicate this was cleaned up
        cleanupTime: new Date()
      });
    });
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Successfully cleaned up ${snapshot.docs.length} Class C pending properties`);
    
    // Trigger property replacement for the cleaned up properties
    const { propertyPoolManager } = await import('../services/propertyPoolManager');
    await propertyPoolManager.forceMaintenance();
    
    console.log('🔄 Triggered property pool maintenance to replace cleaned up properties');
    
  } catch (error) {
    console.error('❌ Error during Class C pending cleanup:', error);
    throw error;
  }
}

/**
 * Check how many Class C pending properties currently exist
 */
export async function checkClassCPendingCount(): Promise<number> {
  try {
    const pendingClassCQuery = query(
      collection(db, 'properties'),
      where('status', '==', 'pending'),
      where('class', '==', 'C')
    );
    
    const snapshot = await getDocs(pendingClassCQuery);
    const count = snapshot.docs.length;
    
    console.log(`📊 Current Class C pending properties: ${count}`);
    return count;
    
  } catch (error) {
    console.error('❌ Error checking Class C pending count:', error);
    return 0;
  }
}