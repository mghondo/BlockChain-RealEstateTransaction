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

// Collection names
export const COLLECTIONS = {
  PROPERTIES: 'properties',
  WATCHLIST: 'watchlist',
  PROPERTY_INTERACTIONS: 'property_interactions'
} as const;

// Property Service
export class PropertyService {
  private static instance: PropertyService;
  
  public static getInstance(): PropertyService {
    if (!PropertyService.instance) {
      PropertyService.instance = new PropertyService();
    }
    return PropertyService.instance;
  }

  // Create a new property
  async createProperty(property: Omit<Property, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.PROPERTIES), {
        ...property,
        createdAt: serverTimestamp(),
        selloutTime: property.selloutTime,
        status: 'available'
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating property:', error);
      throw new Error('Failed to create property');
    }
  }

  // Create multiple properties in batch
  async createPropertiesBatch(properties: Omit<Property, 'id'>[]): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const propertyIds: string[] = [];

      properties.forEach((property) => {
        const docRef = doc(collection(db, COLLECTIONS.PROPERTIES));
        propertyIds.push(docRef.id);
        batch.set(docRef, {
          ...property,
          createdAt: serverTimestamp(),
          selloutTime: property.selloutTime,
          status: 'available'
        });
      });

      await batch.commit();
      return propertyIds;
    } catch (error) {
      console.error('Error creating properties batch:', error);
      throw new Error('Failed to create properties batch');
    }
  }

  // Get property by ID
  async getProperty(propertyId: string): Promise<Property | null> {
    try {
      const docRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Property;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting property:', error);
      throw new Error('Failed to get property');
    }
  }

  // Get properties with filters and sorting
  async getProperties(
    filters?: PropertyFilters,
    sortOptions?: PropertySortOptions,
    limitCount?: number
  ): Promise<Property[]> {
    try {
      const constraints: QueryConstraint[] = [];

      // Apply filters
      if (filters) {
        if (filters.class && filters.class.length > 0) {
          constraints.push(where('class', 'in', filters.class));
        }
        
        if (filters.status && filters.status.length > 0) {
          constraints.push(where('status', 'in', filters.status));
        }
        
        if (filters.region && filters.region.length > 0) {
          constraints.push(where('region', 'in', filters.region));
        }
        
        // Price range filter (if provided)
        if (filters.priceRange) {
          if (filters.priceRange.min > 0) {
            constraints.push(where('price', '>=', filters.priceRange.min));
          }
          if (filters.priceRange.max > 0) {
            constraints.push(where('price', '<=', filters.priceRange.max));
          }
        }
      }

      // Apply sorting
      if (sortOptions) {
        constraints.push(orderBy(sortOptions.field, sortOptions.direction));
      } else {
        // Default sort by creation time
        constraints.push(orderBy('createdAt', 'desc'));
      }

      // Apply limit
      if (limitCount) {
        constraints.push(limit(limitCount));
      }

      const q = query(collection(db, COLLECTIONS.PROPERTIES), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
    } catch (error) {
      console.error('Error getting properties:', error);
      throw new Error('Failed to get properties');
    }
  }

  // Get all properties (simple query without filters to avoid index issues)
  async getAllPropertiesSimple(): Promise<Property[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PROPERTIES));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
    } catch (error) {
      console.error('Error getting properties:', error);
      throw new Error('Failed to get properties');
    }
  }

  // Get active properties (available + ending_soon)
  async getActiveProperties(): Promise<Property[]> {
    // Use simple query and filter in memory to avoid index issues
    const allProperties = await this.getAllPropertiesSimple();
    return allProperties.filter(p => p.status === 'available' || p.status === 'ending_soon');
  }

  // Update property status
  async updatePropertyStatus(propertyId: string, status: PropertyStatus): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating property status:', error);
      throw new Error('Failed to update property status');
    }
  }

  // Update multiple property statuses in batch
  async updatePropertyStatusesBatch(updates: { id: string; status: PropertyStatus }[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      updates.forEach(({ id, status }) => {
        const docRef = doc(db, COLLECTIONS.PROPERTIES, id);
        batch.update(docRef, {
          status,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error updating property statuses:', error);
      throw new Error('Failed to update property statuses');
    }
  }

  // Delete property (for cleanup of sold properties)
  async deleteProperty(propertyId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.PROPERTIES, propertyId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw new Error('Failed to delete property');
    }
  }

  // Real-time listener for properties
  subscribeToProperties(
    callback: (properties: Property[]) => void,
    filters?: PropertyFilters,
    sortOptions?: PropertySortOptions
  ): () => void {
    try {
      const constraints: QueryConstraint[] = [];

      // Apply filters (similar to getProperties)
      if (filters) {
        if (filters.class && filters.class.length > 0) {
          constraints.push(where('class', 'in', filters.class));
        }
        
        if (filters.status && filters.status.length > 0) {
          constraints.push(where('status', 'in', filters.status));
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

      const q = query(collection(db, COLLECTIONS.PROPERTIES), ...constraints);
      
      return onSnapshot(q, (querySnapshot) => {
        const properties = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];
        
        callback(properties);
      }, (error) => {
        console.error('Error in properties subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up properties subscription:', error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  // Get properties count by status
  async getPropertiesCountByStatus(): Promise<Record<PropertyStatus, number>> {
    try {
      const [available, endingSoon, soldOut] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.PROPERTIES), where('status', '==', 'available'))),
        getDocs(query(collection(db, COLLECTIONS.PROPERTIES), where('status', '==', 'ending_soon'))),
        getDocs(query(collection(db, COLLECTIONS.PROPERTIES), where('status', '==', 'sold_out')))
      ]);

      return {
        available: available.size,
        ending_soon: endingSoon.size,
        sold_out: soldOut.size
      };
    } catch (error) {
      console.error('Error getting properties count:', error);
      throw new Error('Failed to get properties count');
    }
  }
}

// Watchlist Service
export class WatchlistService {
  private static instance: WatchlistService;
  
  public static getInstance(): WatchlistService {
    if (!WatchlistService.instance) {
      WatchlistService.instance = new WatchlistService();
    }
    return WatchlistService.instance;
  }

  // Add property to watchlist
  async addToWatchlist(userId: string, propertyId: string): Promise<string> {
    try {
      // Check if already in watchlist
      const existing = await this.getWatchlistItem(userId, propertyId);
      if (existing) {
        throw new Error('Property already in watchlist');
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.WATCHLIST), {
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

  // Remove property from watchlist
  async removeFromWatchlist(userId: string, propertyId: string): Promise<void> {
    try {
      const item = await this.getWatchlistItem(userId, propertyId);
      if (item) {
        const docRef = doc(db, COLLECTIONS.WATCHLIST, item.id);
        await deleteDoc(docRef);
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw new Error('Failed to remove from watchlist');
    }
  }

  // Get user's watchlist
  async getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.WATCHLIST),
        where('userId', '==', userId),
        orderBy('addedDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WatchlistItem[];
    } catch (error) {
      console.error('Error getting watchlist:', error);
      throw new Error('Failed to get watchlist');
    }
  }

  // Get watchlist item
  private async getWatchlistItem(userId: string, propertyId: string): Promise<WatchlistItem | null> {
    try {
      const q = query(
        collection(db, COLLECTIONS.WATCHLIST),
        where('userId', '==', userId),
        where('propertyId', '==', propertyId)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as WatchlistItem;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting watchlist item:', error);
      return null;
    }
  }

  // Check if property is in user's watchlist
  async isInWatchlist(userId: string, propertyId: string): Promise<boolean> {
    const item = await this.getWatchlistItem(userId, propertyId);
    return item !== null;
  }

  // Subscribe to user's watchlist changes
  subscribeToWatchlist(userId: string, callback: (watchlist: WatchlistItem[]) => void): () => void {
    try {
      const q = query(
        collection(db, COLLECTIONS.WATCHLIST),
        where('userId', '==', userId),
        orderBy('addedDate', 'desc')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const watchlist = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WatchlistItem[];
        
        callback(watchlist);
      }, (error) => {
        console.error('Error in watchlist subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up watchlist subscription:', error);
      return () => {};
    }
  }
}

// Property Pool Management Service
export class PropertyPoolService {
  private static instance: PropertyPoolService;
  
  public static getInstance(): PropertyPoolService {
    if (!PropertyPoolService.instance) {
      PropertyPoolService.instance = new PropertyPoolService();
    }
    return PropertyPoolService.instance;
  }

  // Check if pool needs more properties
  async needsMoreProperties(minPoolSize: number = 50): Promise<boolean> {
    try {
      const activeProperties = await PropertyService.getInstance().getActiveProperties();
      return activeProperties.length < minPoolSize;
    } catch (error) {
      console.error('Error checking pool size:', error);
      return true; // Assume we need more if we can't check
    }
  }

  // Get properties that should be marked as sold out
  async getExpiredProperties(): Promise<Property[]> {
    try {
      const now = Timestamp.now();
      const activeProperties = await PropertyService.getInstance().getActiveProperties();
      
      return activeProperties.filter(property => 
        property.selloutTime.toMillis() <= now.toMillis()
      );
    } catch (error) {
      console.error('Error getting expired properties:', error);
      return [];
    }
  }

  // Get properties that should be marked as ending soon
  async getEndingSoonProperties(thresholdMinutes: number = 30): Promise<Property[]> {
    try {
      const now = Timestamp.now();
      const thresholdMs = thresholdMinutes * 60 * 1000;
      const activeProperties = await PropertyService.getInstance().getActiveProperties();
      
      return activeProperties.filter(property => {
        const timeUntilSellout = property.selloutTime.toMillis() - now.toMillis();
        return timeUntilSellout <= thresholdMs && timeUntilSellout > 0 && property.status === 'available';
      });
    } catch (error) {
      console.error('Error getting ending soon properties:', error);
      return [];
    }
  }

  // Clean up sold out properties (optional - for maintenance)
  async cleanupSoldOutProperties(keepDays: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const q = query(
        collection(db, COLLECTIONS.PROPERTIES),
        where('status', '==', 'sold_out'),
        where('selloutTime', '<', cutoffTimestamp)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return querySnapshot.size;
    } catch (error) {
      console.error('Error cleaning up sold out properties:', error);
      return 0;
    }
  }
}

// Export service instances
export const propertyService = PropertyService.getInstance();
export const watchlistService = WatchlistService.getInstance();
export const propertyPoolService = PropertyPoolService.getInstance();