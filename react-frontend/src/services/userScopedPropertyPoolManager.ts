import { userScopedPropertyService } from './userScopedFirebaseService';
import { generateProperty, generatePropertyBatch, validateClassDistribution } from '../utils/propertyGenerator';
import { Property, PropertyStatus } from '../types/property';
import { Timestamp } from 'firebase/firestore';

export class UserScopedPropertyPoolManager {
  private static instances: Map<string, UserScopedPropertyPoolManager> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private userId: string;
  
  // Configuration
  private readonly config = {
    minPoolSize: 50,
    updateInterval: 60000, // 1 minute
    maintenanceInterval: 300000, // 5 minutes
    endingSoonThreshold: 30, // 30 minutes
    maxPropertiesPerBatch: 10,
  };

  constructor(userId: string) {
    this.userId = userId;
  }

  public static getInstance(userId: string): UserScopedPropertyPoolManager {
    if (!UserScopedPropertyPoolManager.instances.has(userId)) {
      UserScopedPropertyPoolManager.instances.set(userId, new UserScopedPropertyPoolManager(userId));
    }
    return UserScopedPropertyPoolManager.instances.get(userId)!;
  }

  /**
   * Start the property pool management system for this user
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`Property pool manager for user ${this.userId} is already running`);
      return;
    }

    this.isRunning = true;
    console.log(`Starting property pool manager for user ${this.userId}...`);

    try {
      // Initial pool setup
      await this.initializePool();

      // Start periodic updates
      this.startStatusUpdates();
      this.startPoolMaintenance();

      console.log(`Property pool manager for user ${this.userId} started successfully`);
    } catch (error) {
      console.error(`Failed to start property pool manager for user ${this.userId}:`, error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the property pool management system for this user
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log(`Stopping property pool manager for user ${this.userId}...`);
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    this.isRunning = false;
    console.log(`Property pool manager for user ${this.userId} stopped`);
  }

  /**
   * Initialize the property pool if empty or insufficient for this user
   */
  private async initializePool(): Promise<void> {
    try {
      const activeProperties = await userScopedPropertyService.getActiveProperties(this.userId);
      const needsMore = activeProperties.length < this.config.minPoolSize;
      
      if (needsMore) {
        console.log(`Pool for user ${this.userId} needs initialization, generating properties...`);
        
        const needed = this.config.minPoolSize - activeProperties.length;
        
        if (needed > 0) {
          await this.generatePropertiesBatch(Math.min(needed, this.config.maxPropertiesPerBatch));
        }
      }
    } catch (error) {
      console.error(`Failed to initialize property pool for user ${this.userId}:`, error);
      throw error;
    }
  }

  /**
   * Start periodic status updates for this user's properties
   */
  private startStatusUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updatePropertyStatuses();
      } catch (error) {
        console.error(`Error in property status update for user ${this.userId}:`, error);
      }
    }, this.config.updateInterval);
  }

  /**
   * Start periodic pool maintenance for this user
   */
  private startPoolMaintenance(): void {
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performPoolMaintenance();
      } catch (error) {
        console.error(`Error in pool maintenance for user ${this.userId}:`, error);
      }
    }, this.config.maintenanceInterval);
  }

  /**
   * Update property statuses and handle instant replacement for expired properties
   */
  private async updatePropertyStatuses(): Promise<void> {
    try {
      // Get properties that need status updates
      const [expiredProperties, endingSoonProperties] = await Promise.all([
        userScopedPropertyService.getExpiredProperties(this.userId),
        userScopedPropertyService.getEndingSoonProperties(this.userId, this.config.endingSoonThreshold)
      ]);

      // INSTANT REPLACEMENT: Delete expired properties and generate new ones
      if (expiredProperties.length > 0) {
        console.log(`🔄 Instantly replacing ${expiredProperties.length} expired properties for user ${this.userId}...`);
        
        // Delete expired properties and generate new ones
        await this.instantlyReplaceProperties(expiredProperties);
        console.log(`✅ Instantly replaced ${expiredProperties.length} properties for user ${this.userId}`);
      }

      // Update properties to ending soon status
      const statusUpdates: { id: string; status: PropertyStatus }[] = [];
      endingSoonProperties.forEach(property => {
        if (property.status !== 'ending_soon') {
          statusUpdates.push({ id: property.id, status: 'ending_soon' });
        }
      });

      // Batch update ending soon statuses
      if (statusUpdates.length > 0) {
        console.log(`Updating ${statusUpdates.length} properties to ending soon for user ${this.userId}`);
        await userScopedPropertyService.updatePropertyStatusesBatch(this.userId, statusUpdates);
      }

    } catch (error) {
      console.error(`Failed to update property statuses for user ${this.userId}:`, error);
    }
  }

  /**
   * Instantly replace properties that have reached end of lifecycle
   */
  private async instantlyReplaceProperties(propertiesToReplace: Property[]): Promise<void> {
    try {
      console.log(`🔄 Instantly replacing ${propertiesToReplace.length} properties for user ${this.userId}...`);
      
      const replacementPromises: Promise<any>[] = [];
      
      // For each property to replace, delete the old one and create a new one
      for (const property of propertiesToReplace) {
        console.log(`🗑️ Deleting old property: ${property.address} (Class ${property.class}) for user ${this.userId}`);
        
        // Delete the old property
        replacementPromises.push(userScopedPropertyService.deleteProperty(this.userId, property.id));
        
        // Generate and add a new property
        const newProperty = await generateProperty();
        console.log(`✨ Creating new property: ${newProperty.address} (Class ${newProperty.class}) for user ${this.userId}`);
        
        replacementPromises.push(userScopedPropertyService.createProperty(this.userId, newProperty));
      }
      
      await Promise.all(replacementPromises);
      console.log(`✅ Successfully replaced ${propertiesToReplace.length} properties instantly for user ${this.userId}`);
      
    } catch (error) {
      console.error(`Error during instant property replacement for user ${this.userId}:`, error);
    }
  }

  /**
   * Perform comprehensive pool maintenance for this user
   */
  private async performPoolMaintenance(): Promise<void> {
    try {
      console.log(`Performing pool maintenance for user ${this.userId}...`);

      // Check if we need more properties
      const activeProperties = await userScopedPropertyService.getActiveProperties(this.userId);
      const needsMore = activeProperties.length < this.config.minPoolSize;
      
      if (needsMore) {
        await this.replenishPool();
      }

      // Validate class distribution
      await this.validatePoolDistribution();

      console.log(`Pool maintenance completed for user ${this.userId}`);
    } catch (error) {
      console.error(`Failed to perform pool maintenance for user ${this.userId}:`, error);
    }
  }

  /**
   * Replenish the property pool for this user
   */
  private async replenishPool(): Promise<void> {
    try {
      const activeProperties = await userScopedPropertyService.getActiveProperties(this.userId);
      const needed = this.config.minPoolSize - activeProperties.length;

      if (needed <= 0) {
        return;
      }

      console.log(`Replenishing pool with ${needed} properties for user ${this.userId}`);
      
      const batchSize = Math.min(needed, this.config.maxPropertiesPerBatch);
      await this.generatePropertiesBatch(batchSize);
      
    } catch (error) {
      console.error(`Failed to replenish pool for user ${this.userId}:`, error);
    }
  }

  /**
   * Generate a batch of properties for this user
   */
  private async generatePropertiesBatch(count: number): Promise<void> {
    try {
      console.log(`Generating ${count} new properties for user ${this.userId}...`);
      
      const properties = await generatePropertyBatch(count);
      
      if (properties.length > 0) {
        const propertyIds = await userScopedPropertyService.createPropertiesBatch(this.userId, properties);
        console.log(`Successfully created ${propertyIds.length} properties for user ${this.userId}`);
      }
    } catch (error) {
      console.error(`Failed to generate property batch for user ${this.userId}:`, error);
      throw error;
    }
  }

  /**
   * Validate and correct class distribution for this user
   */
  private async validatePoolDistribution(): Promise<void> {
    try {
      const activeProperties = await userScopedPropertyService.getActiveProperties(this.userId);
      
      if (!validateClassDistribution(activeProperties)) {
        console.log(`Class distribution is off for user ${this.userId}, generating corrective properties...`);
        
        // Analyze current distribution
        const classCounts = { A: 0, B: 0, C: 0 };
        activeProperties.forEach(p => classCounts[p.class]++);
        
        const total = activeProperties.length;
        const targetCounts = {
          A: Math.floor(total * 0.2),
          B: Math.floor(total * 0.4),
          C: Math.floor(total * 0.4)
        };
        
        // Determine what we need
        const needed = {
          A: Math.max(0, targetCounts.A - classCounts.A),
          B: Math.max(0, targetCounts.B - classCounts.B),
          C: Math.max(0, targetCounts.C - classCounts.C)
        };
        
        const totalNeeded = needed.A + needed.B + needed.C;
        
        if (totalNeeded > 0) {
          console.log(`Generating ${totalNeeded} corrective properties for user ${this.userId}:`, needed);
          await this.generatePropertiesBatch(Math.min(totalNeeded, 5));
        }
      }
    } catch (error) {
      console.error(`Failed to validate pool distribution for user ${this.userId}:`, error);
    }
  }

  /**
   * Get current pool statistics for this user
   */
  public async getPoolStats(): Promise<{
    total: number;
    available: number;
    endingSoon: number;
    classDistribution: { A: number; B: number; C: number };
    isHealthy: boolean;
  }> {
    try {
      const [properties, counts] = await Promise.all([
        userScopedPropertyService.getProperties(this.userId),
        userScopedPropertyService.getPropertiesCountByStatus(this.userId)
      ]);

      const classDistribution = { A: 0, B: 0, C: 0 };
      properties.forEach(p => classDistribution[p.class]++);

      const activeCount = counts.available + counts.ending_soon;
      const isHealthy = activeCount >= this.config.minPoolSize && validateClassDistribution(properties);

      return {
        total: properties.length,
        available: counts.available,
        endingSoon: counts.ending_soon,
        classDistribution,
        isHealthy
      };
    } catch (error) {
      console.error(`Failed to get pool stats for user ${this.userId}:`, error);
      throw error;
    }
  }

  /**
   * Force a maintenance cycle (for testing/admin purposes)
   */
  public async forceMaintenance(): Promise<void> {
    if (!this.isRunning) {
      throw new Error(`Property pool manager for user ${this.userId} is not running`);
    }

    console.log(`Forcing maintenance cycle for user ${this.userId}...`);
    await this.performPoolMaintenance();
  }

  /**
   * Check if the manager is running
   */
  public isManagerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get user ID
   */
  public getUserId(): string {
    return this.userId;
  }

  /**
   * Get configuration
   */
  public getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration (requires restart to take effect)
   */
  public updateConfig(newConfig: Partial<typeof this.config>): void {
    Object.assign(this.config, newConfig);
    console.log(`Configuration updated for user ${this.userId}:`, this.config);
  }

  /**
   * Static method to stop all instances
   */
  public static stopAllInstances(): void {
    UserScopedPropertyPoolManager.instances.forEach(instance => {
      instance.stop();
    });
    UserScopedPropertyPoolManager.instances.clear();
  }

  /**
   * Static method to get all running instances
   */
  public static getRunningInstances(): UserScopedPropertyPoolManager[] {
    return Array.from(UserScopedPropertyPoolManager.instances.values()).filter(instance => 
      instance.isManagerRunning()
    );
  }
}