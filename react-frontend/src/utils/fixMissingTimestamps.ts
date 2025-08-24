import { doc, updateDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export const fixMissingTimestamps = async (userId: string) => {
  try {
    console.log('🔧 Fixing missing timestamps for user:', userId);
    
    const investmentsRef = collection(db, `users/${userId}/investments`);
    const snapshot = await getDocs(query(investmentsRef));
    
    const updates = [];
    
    for (const investmentDoc of snapshot.docs) {
      const data = investmentDoc.data();
      
      // Check if timestamps are missing
      if (!data.rentalIncomeStartDate || !data.appreciationStartDate) {
        const purchaseDate = data.purchaseDate?.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate);
        
        console.log(`📅 Fixing timestamps for property ${data.propertyAddress}:`);
        console.log(`  Purchase Date: ${purchaseDate.toISOString()}`);
        
        const updateData: any = {};
        
        if (!data.rentalIncomeStartDate) {
          updateData.rentalIncomeStartDate = purchaseDate;
          console.log(`  ✅ Setting rental start: ${purchaseDate.toISOString()}`);
        }
        
        if (!data.appreciationStartDate) {
          updateData.appreciationStartDate = purchaseDate;
          console.log(`  ✅ Setting appreciation start: ${purchaseDate.toISOString()}`);
        }
        
        updates.push(updateDoc(doc(db, `users/${userId}/investments`, investmentDoc.id), updateData));
      }
    }
    
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Fixed timestamps for ${updates.length} investments`);
      return updates.length;
    } else {
      console.log('ℹ️ All timestamps are already set correctly');
      return 0;
    }
    
  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
    throw error;
  }
};