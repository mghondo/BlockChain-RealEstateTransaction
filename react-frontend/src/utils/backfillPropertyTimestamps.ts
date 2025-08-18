import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * One-time utility to add createdAt timestamps to existing properties
 * This prevents all existing properties from showing as "Just Listed"
 */
export async function backfillPropertyTimestamps(): Promise<void> {
  try {
    console.log('🔄 Backfilling createdAt timestamps for existing properties...');
    
    // Get properties without createdAt field
    const snapshot = await getDocs(collection(db, 'properties'));
    const updatePromises: Promise<void>[] = [];
    let updatedCount = 0;
    
    snapshot.docs.forEach((docSnapshot) => {
      const property = docSnapshot.data();
      
      // Only update properties that don't have createdAt
      if (!property.createdAt) {
        // Set createdAt to 1 hour ago so they won't show as "Just Listed"
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
        
        updatePromises.push(
          updateDoc(doc(db, 'properties', docSnapshot.id), {
            createdAt: oneHourAgo
          })
        );
        updatedCount++;
      }
    });
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`✅ Backfilled ${updatedCount} properties with createdAt timestamps`);
    } else {
      console.log('✅ All properties already have createdAt timestamps');
    }
    
  } catch (error) {
    console.error('❌ Error backfilling property timestamps:', error);
  }
}