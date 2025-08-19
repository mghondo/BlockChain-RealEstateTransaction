import React, { useState, useEffect } from 'react';
import { useGameTime } from '../../hooks/useGameTime';
import { useUserSession } from '../../services/sessionService';
import { useWallet } from '../../hooks/useWallet';
import { OfflineProgressModal } from '../GameTime/OfflineProgressModal';

interface GameEngineProps {
  children: React.ReactNode;
}

export const GameEngine: React.FC<GameEngineProps> = ({ children }) => {
  const { account } = useWallet();
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
    if (offlineProgressCompleted && showOfflineModal) {
      // TODO: Get actual offline progress data from the hook
      // For now, we'll show the modal with placeholder data
      setOfflineProgress({
        gameMonthsElapsed: 3, // This should come from the hook
        rentalIncome: 150.25, // This should come from background calculations
        appreciation: 75.50, // This should come from background calculations
        newProperties: [], // This should come from property service
      });
    }
  }, [offlineProgressCompleted, showOfflineModal]);
  
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