import { useEffect } from 'react';
import { doc, updateDoc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface UserSession {
  userId: string;
  lastActiveTime: Date;
  gameTimeWhenLeft: Date;
  isOnline: boolean;
  deviceInfo: string;
  sessionCount: number;
}

export class SessionService {
  static async updateLastSeen(userId: string, gameTime: Date): Promise<void> {
    try {
      await updateDoc(doc(db, 'userSessions', userId), {
        lastActiveTime: serverTimestamp(),
        gameTimeWhenLeft: gameTime,
        isOnline: true,
        lastHeartbeat: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }
  
  static async getUserSession(userId: string): Promise<UserSession | null> {
    try {
      const sessionDoc = await getDoc(doc(db, 'userSessions', userId));
      if (sessionDoc.exists()) {
        const data = sessionDoc.data();
        return {
          userId,
          lastActiveTime: data.lastActiveTime.toDate(),
          gameTimeWhenLeft: data.gameTimeWhenLeft.toDate(),
          isOnline: data.isOnline || false,
          deviceInfo: data.deviceInfo || '',
          sessionCount: data.sessionCount || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user session:', error);
      return null;
    }
  }
  
  static async markUserOffline(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'userSessions', userId), {
        isOnline: false,
        lastSeenTime: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking user offline:', error);
    }
  }
  
  static async initializeSession(userId: string, gameTime: Date): Promise<void> {
    try {
      const sessionDoc = await getDoc(doc(db, 'userSessions', userId));
      const sessionCount = sessionDoc.exists() ? (sessionDoc.data().sessionCount || 0) + 1 : 1;
      
      await setDoc(doc(db, 'userSessions', userId), {
        lastActiveTime: serverTimestamp(),
        gameTimeWhenLeft: gameTime,
        isOnline: true,
        sessionCount,
        deviceInfo: navigator.userAgent,
        loginTime: serverTimestamp(),
      }, { merge: true });
      
      console.log(`🔄 Session ${sessionCount} initialized for user ${userId}`);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }
}

// Hook to handle session lifecycle
export const useUserSession = (userId: string, gameTime: Date | null) => {
  useEffect(() => {
    if (!userId || !gameTime) return;
    
    // Initialize session on mount
    SessionService.initializeSession(userId, gameTime);
    
    // Update heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      SessionService.updateLastSeen(userId, gameTime);
    }, 30000);
    
    // Mark offline on unmount/page close
    const handleBeforeUnload = () => {
      SessionService.markUserOffline(userId);
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        SessionService.markUserOffline(userId);
      } else {
        SessionService.initializeSession(userId, gameTime);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      SessionService.markUserOffline(userId);
    };
  }, [userId, gameTime]);
};