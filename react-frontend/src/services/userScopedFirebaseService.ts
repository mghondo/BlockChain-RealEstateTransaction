import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
  serverTimestamp,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Property, PropertyFilters, PropertySortOptions, WatchlistItem, PropertyStatus } from '../types/property';

// User-scoped collection paths
export const getUserCollectionPath = (userId: string, collection: string) => {
  return `users/${userId}/${collection}`;
};

// User-scoped Property Service
export class UserScopedPropertyService {
  private static instance: UserScopedPropertyService;
  
  public static getInstance(): UserScopedPropertyService {
    if (!UserScopedPropertyService.instance) {
      UserScopedPropertyService.instance = new UserScopedPropertyService();
    }
    return UserScopedPropertyService.instance;
  }

  // Create a new property for a specific user
  async createProperty(userId: string, property: Omit<Property, 'id'>): Promise<string> {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      const docRef = await addDoc(userPropertiesRef, {
        ...property,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating property:', error);
      throw new Error('Failed to create property');
    }
  }

  // Create multiple properties for a user
  async createPropertiesBatch(userId: string, properties: Omit<Property, 'id'>[]): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const propertyIds: string[] = [];
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));

      for (const property of properties) {
        const docRef = doc(userPropertiesRef);
        batch.set(docRef, {
          ...property,
          createdAt: serverTimestamp()
        });
        propertyIds.push(docRef.id);
      }

      await batch.commit();
      return propertyIds;
    } catch (error) {
      console.error('Error creating properties batch:', error);
      throw new Error('Failed to create properties batch');
    }
  }

  // Get all properties for a user
  async getProperties(
    userId: string,
    filters?: PropertyFilters,
    sortOptions?: PropertySortOptions,
    limitCount?: number
  ): Promise<Property[]> {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      const constraints: QueryConstraint[] = [];

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          constraints.push(where('status', 'in', filters.status));
        }
        if (filters.class && filters.class.length > 0) {
          constraints.push(where('class', 'in', filters.class));
        }
        if (filters.region && filters.region.length > 0) {
          constraints.push(where('region', 'in', filters.region));
        }
      }

      // Apply sorting
      if (sortOptions) {
        constraints.push(orderBy(sortOptions.field, sortOptions.direction));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      // Apply limit
      if (limitCount) {
        constraints.push(limit(limitCount));
      }

      const q = query(userPropertiesRef, ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Property));
    } catch (error) {
      console.error('Error getting properties:', error);
      throw new Error('Failed to get properties');
    }
  }

  // Get properties count by status for a user
  async getPropertiesCountByStatus(userId: string): Promise<Record<PropertyStatus, number>> {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      const [available, endingSoon] = await Promise.all([
        getDocs(query(userPropertiesRef, where('status', '==', 'available'))),
        getDocs(query(userPropertiesRef, where('status', '==', 'ending_soon')))
      ]);

      return {
        available: available.size,
        ending_soon: endingSoon.size
      };
    } catch (error) {
      console.error('Error getting properties count:', error);
      throw new Error('Failed to get properties count');
    }
  }

  // Subscribe to real-time property updates for a user
  subscribeToProperties(
    userId: string,
    callback: (properties: Property[]) => void,
    filters?: PropertyFilters
  ): () => void {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        constraints.push(where('status', 'in', filters.status));
      }

      const q = query(userPropertiesRef, ...constraints);

      return onSnapshot(q, (querySnapshot) => {
        const properties = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Property));
        callback(properties);
      }, (error) => {
        console.error('Error in property subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up property subscription:', error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  // Update property status for a user
  async updatePropertyStatus(userId: string, propertyId: string, status: PropertyStatus): Promise<void> {
    try {
      const propertyRef = doc(db, getUserCollectionPath(userId, 'properties'), propertyId);
      await updateDoc(propertyRef, {
        status,
        statusUpdatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating property status:', error);
      throw new Error('Failed to update property status');
    }
  }

  // Update multiple property statuses in batch for a user
  async updatePropertyStatusesBatch(
    userId: string,
    updates: { id: string; status: PropertyStatus }[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      updates.forEach(({ id, status }) => {
        const propertyRef = doc(db, getUserCollectionPath(userId, 'properties'), id);
        batch.update(propertyRef, {
          status,
          statusUpdatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating property statuses:', error);
      throw new Error('Failed to update property statuses');
    }
  }

  // Delete a property for a user
  async deleteProperty(userId: string, propertyId: string): Promise<void> {
    try {
      const propertyRef = doc(db, getUserCollectionPath(userId, 'properties'), propertyId);
      await deleteDoc(propertyRef);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw new Error('Failed to delete property');
    }
  }

  // Get expired properties for a user (simplified query to avoid Firebase internal errors)
  async getExpiredProperties(userId: string): Promise<Property[]> {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      // Simplified query - get all active properties and filter client-side
      const q = query(
        userPropertiesRef,
        where('status', 'in', ['available', 'ending_soon'])
      );

      const querySnapshot = await getDocs(q);
      const now = new Date();

      // Filter client-side to avoid complex Firebase queries on new collections
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Property))
        .filter(property => {
          const selloutTime = property.selloutTime.toDate();
          return selloutTime <= now;
        });
    } catch (error) {
      console.error('Error getting expired properties:', error);
      return [];
    }
  }

  // Get ending soon properties for a user (simplified query to avoid Firebase internal errors)
  async getEndingSoonProperties(userId: string, thresholdMinutes: number = 30): Promise<Property[]> {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      // Simplified query - just get available properties and filter client-side
      const q = query(
        userPropertiesRef,
        where('status', '==', 'available')
      );

      const querySnapshot = await getDocs(q);
      const now = new Date();
      const thresholdTime = new Date(now.getTime() + (thresholdMinutes * 60 * 1000));

      // Filter client-side to avoid complex Firebase queries on new collections
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Property))
        .filter(property => {
          const selloutTime = property.selloutTime.toDate();
          return selloutTime <= thresholdTime && selloutTime > now;
        });
    } catch (error) {
      console.error('Error getting ending soon properties:', error);
      return [];
    }
  }

  // Get active properties (available + ending soon) for a user
  async getActiveProperties(userId: string): Promise<Property[]> {
    try {
      const userPropertiesRef = collection(db, getUserCollectionPath(userId, 'properties'));
      const q = query(
        userPropertiesRef,
        where('status', 'in', ['available', 'ending_soon'])
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Property));
    } catch (error) {
      console.error('Error getting active properties:', error);
      return [];
    }
  }

  // Initialize properties for a new user
  async initializeUserProperties(userId: string, propertyCount: number = 60): Promise<void> {
    try {
      console.log(`🏠 Initializing ${propertyCount} properties for user ${userId}...`);
      
      // Import property generator
      const { generatePropertyBatch } = await import('../utils/propertyGenerator');
      
      // Generate properties
      const properties = await generatePropertyBatch(propertyCount);
      
      // Create properties for the user
      const propertyIds = await this.createPropertiesBatch(userId, properties);
      
      console.log(`✅ Successfully initialized ${propertyIds.length} properties for user ${userId}`);
    } catch (error) {
      console.error('Error initializing user properties:', error);
      throw new Error('Failed to initialize user properties');
    }
  }
}

// User-scoped Watchlist Service
export class UserScopedWatchlistService {
  private static instance: UserScopedWatchlistService;

  public static getInstance(): UserScopedWatchlistService {
    if (!UserScopedWatchlistService.instance) {
      UserScopedWatchlistService.instance = new UserScopedWatchlistService();
    }
    return UserScopedWatchlistService.instance;
  }

  // Add property to user's watchlist
  async addToWatchlist(userId: string, propertyId: string): Promise<string> {
    try {
      const userWatchlistRef = collection(db, getUserCollectionPath(userId, 'watchlist'));
      const docRef = await addDoc(userWatchlistRef, {
        userId,
        propertyId,
        addedDate: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw new Error('Failed to add to watchlist');
    }
  }

  // Remove property from user's watchlist
  async removeFromWatchlist(userId: string, watchlistItemId: string): Promise<void> {
    try {
      const watchlistItemRef = doc(db, getUserCollectionPath(userId, 'watchlist'), watchlistItemId);
      await deleteDoc(watchlistItemRef);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw new Error('Failed to remove from watchlist');
    }
  }

  // Get user's watchlist
  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    try {
      const userWatchlistRef = collection(db, getUserCollectionPath(userId, 'watchlist'));
      const q = query(userWatchlistRef, orderBy('addedDate', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WatchlistItem));
    } catch (error) {
      console.error('Error getting watchlist:', error);
      throw new Error('Failed to get watchlist');
    }
  }
}

// Export singleton instances
export const userScopedPropertyService = UserScopedPropertyService.getInstance();
export const userScopedWatchlistService = UserScopedWatchlistService.getInstance();