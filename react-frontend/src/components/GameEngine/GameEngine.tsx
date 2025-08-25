import React, { useState, useEffect } from 'react';
import { useGameTime } from '../../hooks/useGameTime';
import { useUserSession } from '../../services/sessionService';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../contexts/AuthContext';
import { useUserInvestments } from '../../hooks/useUserInvestments';
import { SimpleRentalProcessor } from '../../services/simpleRentalProcessor';
import { OfflineProgressModal } from '../GameTime/OfflineProgressModal';

interface GameEngineProps {
  children: React.ReactNode;
}

export const GameEngine: React.FC<GameEngineProps> = ({ children }) => {
  const { account } = useWallet();
  const { user } = useAuth();
  const { investments } = useUserInvestments();
  const { gameTime, isCalculatingOfflineProgress, offlineProgressCompleted } = useGameTime(account || '');
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState({
    gameMonthsElapsed: 0,
    rentalIncome: 0,
    appreciation: 0,
    newProperties: [],
  });
  
  // Initialize session tracking
  useUserSession(account || '', gameTime || new Date());
  
  // Handle offline progress calculation and completion
  useEffect(() => {
    if (isCalculatingOfflineProgress && !showOfflineModal) {
      setShowOfflineModal(true);
    }
  }, [isCalculatingOfflineProgress, showOfflineModal]);

  useEffect(() => {
    if (offlineProgressCompleted && showOfflineModal && user?.uid && investments.length > 0) {
      // Calculate real offline progress data
      const calculateRealProgress = async () => {
        try {
          console.log('🔄 Calculating real offline progress for welcome modal...');
          
          // Get pending rental income
          const rentalData = await SimpleRentalProcessor.calculatePendingRental(user.uid, investments);
          
          // Calculate total appreciation from all investments
          const totalAppreciation = investments.reduce((total, investment) => {
            return total + (investment.appreciationAmount || 0);
          }, 0);
          
          // Calculate game months elapsed (simplified - could be more sophisticated)
          const gameMonthsElapsed = Math.max(1, Math.floor(rentalData.totalAccrued / 100)); // Rough estimate
          
          console.log('💰 Offline progress calculated:', {
            availableCash: rentalData.pendingAmount,
            paperGains: totalAppreciation,
            gameMonthsElapsed
          });
          
          setOfflineProgress({
            gameMonthsElapsed,
            rentalIncome: rentalData.pendingAmount, // Available cash that goes to wallet
            appreciation: totalAppreciation, // Paper gains from property appreciation
            newProperties: [], // TODO: Could add new properties available since last login
          });
        } catch (error) {
          console.error('❌ Failed to calculate offline progress:', error);
          // Fallback to basic data
          setOfflineProgress({
            gameMonthsElapsed: 1,
            rentalIncome: 0,
            appreciation: 0,
            newProperties: [],
          });
        }
      };
      
      calculateRealProgress();
    }
  }, [offlineProgressCompleted, showOfflineModal, user?.uid, investments]);
  
  const handleCloseOfflineModal = () => {
    setShowOfflineModal(false);
    // Also ensure we don't show it again until next offline session
  };
  
  return (
    <>
      {children}
      <OfflineProgressModal
        open={showOfflineModal}
        onClose={handleCloseOfflineModal}
        progress={offlineProgress}
        isCalculating={isCalculatingOfflineProgress}
      />
    </>
  );
};