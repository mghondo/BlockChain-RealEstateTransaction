import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { userInitializationService } from '../services/userInitializationService';
import { UserScopedPropertyPoolManager } from '../services/userScopedPropertyPoolManager';

// User profile data that we store in Firestore
interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  walletAddress?: string;
  createdAt: Date;
  lastLoginAt: Date;
  gameStartTime?: Date;
  subscription?: {
    status: 'free' | 'premium';
    plan: 'trial' | 'monthly';
    startDate?: Date;
    endDate?: Date;
  };
}

// Authentication context interface
interface AuthContextType {
  // Current user state
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Authentication methods
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Profile management
  linkWallet: (walletAddress: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  
  // Utility methods
  isAuthenticated: boolean;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // User is signed in - load their profile and initialize game state
        await loadUserProfile(firebaseUser.uid);
        await initializeUserGameState(firebaseUser.uid);
      } else {
        // User is signed out - cleanup any running services
        setUserProfile(null);
        await cleanupUserServices();
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load user profile from Firestore
  const loadUserProfile = async (uid: string): Promise<void> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
          gameStartTime: data.gameStartTime?.toDate(),
        } as UserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Register new user
  const register = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update display name if provided
      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
      }
      
      // Create user profile in Firestore
      const newUserProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: displayName || firebaseUser.displayName || undefined,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gameStartTime: new Date(), // Initialize game timeline
        subscription: {
          status: 'free',
          plan: 'free'
        }
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        gameStartTime: serverTimestamp(),
      });
      
      setUserProfile(newUserProfile);
      console.log('✅ User registered and profile created:', firebaseUser.email);
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Login existing user
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update last login time
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        lastLoginAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ User logged in:', firebaseUser.email);
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Login with Google
  const loginWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);
      
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      
      // Check if this is a new user (first time signing in)
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        // Create user profile for new Google user
        const newUserProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          gameStartTime: new Date(),
          subscription: {
            status: 'free',
            plan: 'free'
          }
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...newUserProfile,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          gameStartTime: serverTimestamp(),
        });
        
        setUserProfile(newUserProfile);
        console.log('✅ New Google user registered and profile created:', firebaseUser.email);
      } else {
        // Update last login time for existing user
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          lastLoginAt: serverTimestamp()
        }, { merge: true });
        
        console.log('✅ Existing Google user logged in:', firebaseUser.email);
      }
      
    } catch (error: any) {
      console.error('❌ Google login failed:', error);
      throw new Error(error.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      console.log('✅ User logged out');
    } catch (error: any) {
      console.error('❌ Logout failed:', error);
      throw new Error(error.message || 'Logout failed');
    }
  };

  // Link wallet address to user account
  const linkWallet = async (walletAddress: string): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        walletAddress,
        walletLinkedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local state
      if (userProfile) {
        setUserProfile({ ...userProfile, walletAddress });
      }
      
      console.log('✅ Wallet linked to user account:', walletAddress);
    } catch (error: any) {
      console.error('❌ Failed to link wallet:', error);
      throw new Error('Failed to link wallet');
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      
      // Update local state
      if (userProfile) {
        setUserProfile({ ...userProfile, ...updates });
      }
      
      console.log('✅ User profile updated');
    } catch (error: any) {
      console.error('❌ Failed to update profile:', error);
      throw new Error('Failed to update profile');
    }
  };

  // Initialize user's game state and property portfolio
  const initializeUserGameState = async (uid: string): Promise<void> => {
    try {
      console.log(`🎮 Ensuring user ${uid} is initialized...`);
      const wasNewUser = await userInitializationService.ensureUserInitialized(uid);
      
      if (wasNewUser) {
        console.log(`✅ New user ${uid} initialized with property portfolio`);
      } else {
        console.log(`✅ Existing user ${uid} services resumed`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to initialize user ${uid}:`, error);
      // Don't throw here - let the user continue even if initialization fails
    }
  };

  // Cleanup user services when logging out
  const cleanupUserServices = async (): Promise<void> => {
    try {
      // Stop all running property pool managers
      UserScopedPropertyPoolManager.stopAllInstances();
      console.log('🧹 User services cleaned up');
    } catch (error: any) {
      console.error('❌ Error cleaning up user services:', error);
    }
  };

  // Computed properties
  const isAuthenticated = !!user;
  const isPremium = userProfile?.subscription?.status === 'premium';

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
    linkWallet,
    updateUserProfile,
    isAuthenticated,
    isPremium,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};