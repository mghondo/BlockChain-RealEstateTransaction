import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SimpleRentalProcessor } from '../services/simpleRentalProcessor';

interface RentalPaymentData {
  pendingAmount: number;
  totalAccrued: number;
  alreadyPaid: number;
  isCollecting: boolean;
}

export const useRentalPayments = (investments: any[]) => {
  const { user } = useAuth();
  const [paymentData, setPaymentData] = useState<RentalPaymentData>({
    pendingAmount: 0,
    totalAccrued: 0,
    alreadyPaid: 0,
    isCollecting: false
  });

  // Calculate pending rental income
  const updatePaymentData = useCallback(async () => {
    if (!user?.uid || investments.length === 0) {
      setPaymentData({
        pendingAmount: 0,
        totalAccrued: 0,
        alreadyPaid: 0,
        isCollecting: false
      });
      return;
    }

    try {
      const result = await SimpleRentalProcessor.calculatePendingRental(user.uid, investments);
      setPaymentData(prev => ({
        ...prev,
        ...result
      }));
    } catch (error) {
      console.error('Error updating payment data:', error);
    }
  }, [user?.uid, investments]);

  // Collect pending rental income
  const collectRental = useCallback(async (): Promise<{ success: boolean, amountPaid: number }> => {
    if (!user?.uid || paymentData.isCollecting) {
      return { success: false, amountPaid: 0 };
    }

    setPaymentData(prev => ({ ...prev, isCollecting: true }));

    try {
      const result = await SimpleRentalProcessor.collectPendingRental(user.uid, investments);
      
      if (result.success) {
        // Refresh payment data after successful collection
        await updatePaymentData();
      }
      
      return result;
    } catch (error) {
      console.error('Error collecting rental:', error);
      return { success: false, amountPaid: 0 };
    } finally {
      setPaymentData(prev => ({ ...prev, isCollecting: false }));
    }
  }, [user?.uid, investments, paymentData.isCollecting, updatePaymentData]);

  // Auto-collect on login (if there's pending rental)
  const autoCollectOnLogin = useCallback(async () => {
    if (!user?.uid || investments.length === 0) return;

    console.log('🔄 Checking for auto-collection on login...');
    
    const result = await SimpleRentalProcessor.calculatePendingRental(user.uid, investments);
    
    if (result.pendingAmount > 1.00) { // Auto-collect if more than $1
      console.log(`💰 Auto-collecting $${result.pendingAmount.toFixed(2)} on login`);
      await collectRental();
    }
  }, [user?.uid, investments, collectRental]);

  // Update payment data when investments change
  useEffect(() => {
    updatePaymentData();
  }, [updatePaymentData]);

  // Auto-collect on component mount (login)
  useEffect(() => {
    if (user?.uid && investments.length > 0) {
      autoCollectOnLogin();
    }
  }, [user?.uid, investments.length]); // Only run when user or investment count changes

  return {
    paymentData,
    collectRental,
    updatePaymentData,
    canCollect: paymentData.pendingAmount > 0.01 && !paymentData.isCollecting
  };
};