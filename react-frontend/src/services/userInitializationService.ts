import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { userScopedPropertyService } from './userScopedFirebaseService';
import { UserScopedPropertyPoolManager } from './userScopedPropertyPoolManager';

export interface UserGameState {
  userId: string;
  isInitialized: boolean;
  gameStartTime: Date;
  propertiesInitialized: boolean;
  propertyCount: number;
  poolManagerStarted: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

export class UserInitializationService {
  private static instance: UserInitializationService;
  private initializingUsers = new Set<string>();

  public static getInstance(): UserInitializationService {
    if (!UserInitializationService.instance) {
      UserInitializationService.instance = new UserInitializationService();
    }
    return UserInitializationService.instance;
  }

  /**
   * Initialize a new user's game state and property portfolio
   */
  async initializeUser(userId: string): Promise<void> {
    // Prevent duplicate initialization
    if (this.initializingUsers.has(userId)) {
      console.log(`User ${userId} is already being initialized...`);
      return;
    }

    // Check if user is already initialized
    const existingState = await this.getUserGameState(userId);
    if (existingState?.isInitialized) {
      console.log(`User ${userId} is already initialized`);
      return;
    }

    this.initializingUsers.add(userId);

    try {
      console.log(`🎮 Initializing user ${userId}...`);

      // Create initial game state
      const gameState: UserGameState = {
        userId,
        isInitialized: false,
        gameStartTime: new Date(),
        propertiesInitialized: false,
        propertyCount: 0,
        poolManagerStarted: false,
        createdAt: new Date(),
        lastActiveAt: new Date()
      };

      // Save initial state
      await this.saveUserGameState(userId, gameState);

      // Initialize properties
      console.log(`🏠 Initializing properties for user ${userId}...`);
      await userScopedPropertyService.initializeUserProperties(userId, 60);
      
      // Update state
      gameState.propertiesInitialized = true;
      gameState.propertyCount = 60;
      await this.saveUserGameState(userId, gameState);

      // Start property pool manager
      console.log(`⚙️ Starting property pool manager for user ${userId}...`);
      const poolManager = UserScopedPropertyPoolManager.getInstance(userId);
      await poolManager.start();
      
      // Final state update
      gameState.poolManagerStarted = true;
      gameState.isInitialized = true;
      await this.saveUserGameState(userId, gameState);

      console.log(`✅ User ${userId} initialization complete!`);

    } catch (error) {
      console.error(`❌ Failed to initialize user ${userId}:`, error);
      throw error;
    } finally {
      this.initializingUsers.delete(userId);
    }
  }

  /**
   * Get user's game state
   */
  async getUserGameState(userId: string): Promise<UserGameState | null> {
    try {
      const userStateRef = doc(db, 'users', userId);
      const docSnapshot = await getDoc(userStateRef);
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        return {
          ...data,
          gameStartTime: data.gameStartTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActiveAt: data.lastActiveAt?.toDate() || new Date(),
        } as UserGameState;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting user game state for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Save user's game state
   */
  async saveUserGameState(userId: string, gameState: UserGameState): Promise<void> {
    try {
      const userStateRef = doc(db, 'users', userId);
      await setDoc(userStateRef, {
        ...gameState,
        gameStartTime: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`Error saving user game state for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user's last active time
   */
  async updateUserActivity(userId: string): Promise<void> {
    try {
      const userStateRef = doc(db, 'users', userId);
      await setDoc(userStateRef, {
        lastActiveAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`Error updating user activity for ${userId}:`, error);
    }
  }

  /**
   * Check if user needs initialization and do it if necessary
   */
  async ensureUserInitialized(userId: string): Promise<boolean> {
    try {
      const gameState = await this.getUserGameState(userId);
      
      if (!gameState || !gameState.isInitialized) {
        await this.initializeUser(userId);
        return true; // User was newly initialized
      }

      // User exists, update activity and ensure pool manager is running
      await this.updateUserActivity(userId);
      
      // Ensure pool manager is running
      const poolManager = UserScopedPropertyPoolManager.getInstance(userId);
      if (!poolManager.isManagerRunning()) {
        console.log(`🔄 Restarting pool manager for user ${userId}...`);
        await poolManager.start();
      }

      return false; // User was already initialized
    } catch (error) {
      console.error(`Error ensuring user initialization for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset user's data (for development/testing)
   */
  async resetUser(userId: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset user data in production');
    }

    try {
      console.log(`🔄 Resetting user ${userId}...`);

      // Stop pool manager if running
      const poolManager = UserScopedPropertyPoolManager.getInstance(userId);
      if (poolManager.isManagerRunning()) {
        poolManager.stop();
      }

      // Get all user properties and delete them
      const properties = await userScopedPropertyService.getProperties(userId);
      for (const property of properties) {
        await userScopedPropertyService.deleteProperty(userId, property.id);
      }

      // Reset user state
      const userStateRef = doc(db, 'users', userId);
      await setDoc(userStateRef, {
        isInitialized: false,
        propertiesInitialized: false,
        propertyCount: 0,
        poolManagerStarted: false,
        resetAt: serverTimestamp()
      }, { merge: true });

      console.log(`✅ User ${userId} reset complete`);

    } catch (error) {
      console.error(`❌ Failed to reset user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get initialization status for multiple users
   */
  async getUsersInitializationStatus(userIds: string[]): Promise<Record<string, boolean>> {
    const statuses: Record<string, boolean> = {};

    for (const userId of userIds) {
      try {
        const gameState = await this.getUserGameState(userId);
        statuses[userId] = gameState?.isInitialized || false;
      } catch (error) {
        console.error(`Error checking initialization status for user ${userId}:`, error);
        statuses[userId] = false;
      }
    }

    return statuses;
  }
}

// Export singleton instance
export const userInitializationService = UserInitializationService.getInstance();