import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { BackgroundCalculationService } from '../services/backgroundCalculationService';

interface GameTimeState {
  currentGameTime: Date;
  lastRealTime: Date;
  gameStartTime: Date;
  isCalculatingOfflineProgress: boolean;
  offlineProgressCompleted: boolean;
}

interface OfflineProgress {
  realTimeOffline: number;
  gameTimeElapsed: number;
  gameMonthsElapsed: number;
  rentalIncome: number;
  appreciation: number;
  newProperties: any[];
}

export const useGameTime = (userId: string) => {
  const [gameTime, setGameTime] = useState<GameTimeState | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // CRITICAL: 1 real hour = 2 game months
  // 1 real minute = 1 game hour
  // Multiplier: 60 * 24 * 60 = 86400 (1 real minute = 60 game hours)
  const TIME_MULTIPLIER = 1440; // 1 real hour = 60 game days = 2 game months
  
  const calculateGameTime = (realTime: Date, baseGameTime: Date, baseRealTime: Date): Date => {
    const realElapsedMs = realTime.getTime() - baseRealTime.getTime();
    const gameElapsedMs = realElapsedMs * TIME_MULTIPLIER;
    return new Date(baseGameTime.getTime() + gameElapsedMs);
  };
  
  const processOfflineProgress = async (lastSeenGameTime: Date, currentGameTime: Date): Promise<OfflineProgress> => {
    const now = new Date();
    const offlineRealTime = now.getTime() - (currentGameTime.getTime() / TIME_MULTIPLIER);
    const offlineGameTime = currentGameTime.getTime() - lastSeenGameTime.getTime();
    const gameMonthsElapsed = Math.floor(offlineGameTime / (1000 * 60 * 60 * 24 * 30)); // Approx game months
    
    console.log(`🕐 Processing offline progress: ${gameMonthsElapsed} game months elapsed`);
    
    // Use background calculation service
    const calculationResult = await BackgroundCalculationService.processOfflineProgress(
      userId,
      lastSeenGameTime,
      currentGameTime
    );
    
    return {
      realTimeOffline: offlineRealTime,
      gameTimeElapsed: offlineGameTime,
      gameMonthsElapsed: calculationResult.monthsProcessed,
      rentalIncome: calculationResult.rentalIncomeGenerated,
      appreciation: calculationResult.totalValueChange,
      newProperties: [], // TODO: Calculate new properties available
    };
  };
  
  // Initialize or resume game time
  useEffect(() => {
    if (!userId) return;
    
    const initializeGameTime = async () => {
      try {
        const userTimeDoc = await getDoc(doc(db, 'gameTime', userId));
        const now = new Date();
        
        if (userTimeDoc.exists()) {
          // Returning user - calculate offline progress
          const data = userTimeDoc.data();
          const lastRealTime = data.lastRealTime.toDate();
          const lastGameTime = data.currentGameTime.toDate();
          
          // Check if user was offline for more than 5 minutes (significant time)
          const offlineMs = now.getTime() - lastRealTime.getTime();
          if (offlineMs > 5 * 60 * 1000) { // 5 minutes
            console.log('🔄 User was offline, calculating progress...');
            setGameTime(prev => ({ 
              currentGameTime: lastGameTime,
              lastRealTime: lastRealTime,
              gameStartTime: data.gameStartTime.toDate(),
              isCalculatingOfflineProgress: true,
              offlineProgressCompleted: false,
            }));
            
            // Process offline progress
            const offlineProgress = await processOfflineProgress(lastGameTime, calculateGameTime(now, lastGameTime, lastRealTime));
            
            // Update game time to current
            const newGameTime = calculateGameTime(now, lastGameTime, lastRealTime);
            
            setGameTime({
              currentGameTime: newGameTime,
              lastRealTime: now,
              gameStartTime: data.gameStartTime.toDate(),
              isCalculatingOfflineProgress: false,
              offlineProgressCompleted: true,
            });
            
            // TODO: Show offline progress modal
            console.log('✅ Offline progress calculated:', offlineProgress);
          } else {
            // User just resumed - continue from where they left off
            const newGameTime = calculateGameTime(now, lastGameTime, lastRealTime);
            setGameTime({
              currentGameTime: newGameTime,
              lastRealTime: now,
              gameStartTime: data.gameStartTime.toDate(),
              isCalculatingOfflineProgress: false,
              offlineProgressCompleted: false,
            });
            console.log('🎮 Resuming game time from:', newGameTime);
          }
        } else {
          // New user - initialize game time
          const gameStartTime = now;
          setGameTime({
            currentGameTime: gameStartTime,
            lastRealTime: now,
            gameStartTime,
            isCalculatingOfflineProgress: false,
            offlineProgressCompleted: false,
          });
          
          console.log('🆕 Initializing new game time for user');
          
          // Save to Firebase
          await setDoc(doc(db, 'gameTime', userId), {
            currentGameTime: gameStartTime,
            lastRealTime: serverTimestamp(),
            gameStartTime: gameStartTime,
          });
        }
      } catch (error) {
        console.error('❌ Error initializing game time:', error);
      }
    };
    
    initializeGameTime();
  }, [userId]);
  
  // Update game time every minute
  useEffect(() => {
    if (!gameTime) return;
    
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const newGameTime = calculateGameTime(now, gameTime.currentGameTime, gameTime.lastRealTime);
      
      setGameTime(prev => ({
        ...prev!,
        currentGameTime: newGameTime,
        lastRealTime: now,
      }));
      
      // Update Firebase every 5 minutes
      if (now.getMinutes() % 5 === 0) {
        updateDoc(doc(db, 'gameTime', userId), {
          currentGameTime: newGameTime,
          lastRealTime: serverTimestamp(),
        }).catch(error => {
          console.error('Error updating game time in Firebase:', error);
        });
      }
    }, 60000); // Update every minute
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameTime, userId]);
  
  return {
    gameTime: gameTime?.currentGameTime,
    isCalculatingOfflineProgress: gameTime?.isCalculatingOfflineProgress || false,
    offlineProgressCompleted: gameTime?.offlineProgressCompleted || false,
    realTime: gameTime?.lastRealTime,
    gameStartTime: gameTime?.gameStartTime,
  };
};