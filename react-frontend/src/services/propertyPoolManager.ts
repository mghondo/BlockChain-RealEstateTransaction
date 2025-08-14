import { propertyService, propertyPoolService } from './firebaseService';
import { generateProperty, generatePropertyBatch, validateClassDistribution } from '../utils/propertyGenerator';
import { Property, PropertyStatus } from '../types/property';
import { Timestamp } from 'firebase/firestore';

export class PropertyPoolManager {
  private static instance: PropertyPoolManager;
  private updateInterval: NodeJS.Timeout | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Configuration
  private readonly config = {
    minPoolSize: 50,
    updateInterval: 60000, // 1 minute
    maintenanceInterval: 300000, // 5 minutes
    endingSoonThreshold: 30, // 30 minutes
    maxPropertiesPerBatch: 10,
    cleanupRetentionDays: 7
  };

  public static getInstance(): PropertyPoolManager {
    if (!PropertyPoolManager.instance) {
      PropertyPoolManager.instance = new PropertyPoolManager();
    }
    return PropertyPoolManager.instance;
  }

  /**
   * Start the property pool management system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Property pool manager is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting property pool manager...');

    try {
      // Initial pool setup
      await this.initializePool();

      // Start periodic updates
      this.startStatusUpdates();
      this.startPoolMaintenance();

      console.log('Property pool manager started successfully');
    } catch (error) {
      console.error('Failed to start property pool manager:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the property pool management system
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping property pool manager...');
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }

    this.isRunning = false;
    console.log('Property pool manager stopped');
  }

  /**
   * Initialize the property pool if empty or insufficient
   */
  private async initializePool(): Promise<void> {
    try {
      const needsMore = await propertyPoolService.needsMoreProperties(this.config.minPoolSize);
      
      if (needsMore) {
        console.log('Pool needs initialization, generating properties...');
        
        const activeProperties = await propertyService.getActiveProperties();
        const needed = this.config.minPoolSize - activeProperties.length;
        
        if (needed > 0) {
          await this.generatePropertiesBatch(Math.min(needed, this.config.maxPropertiesPerBatch));
        }
      }
    } catch (error) {
      console.error('Failed to initialize property pool:', error);
      throw error;
    }
  }

  /**
   * Start periodic status updates for properties
   */
  private startStatusUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updatePropertyStatuses();
      } catch (error) {
        console.error('Error in property status update:', error);
      }
    }, this.config.updateInterval);
  }

  /**
   * Start periodic pool maintenance
   */
  private startPoolMaintenance(): void {
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performPoolMaintenance();
      } catch (error) {
        console.error('Error in pool maintenance:', error);
      }
    }, this.config.maintenanceInterval);
  }

  /**
   * Update property statuses based on time remaining
   */
  private async updatePropertyStatuses(): Promise<void> {
    try {
      const now = Timestamp.now();
      const thresholdMs = this.config.endingSoonThreshold * 60 * 1000;

      // Get properties that need status updates
      const [expiredProperties, endingSoonProperties] = await Promise.all([
        propertyPoolService.getExpiredProperties(),
        propertyPoolService.getEndingSoonProperties(this.config.endingSoonThreshold)
      ]);

      const statusUpdates: { id: string; status: PropertyStatus }[] = [];

      // Mark expired properties as sold out
      expiredProperties.forEach(property => {
        if (property.status !== 'sold_out') {
          statusUpdates.push({ id: property.id, status: 'sold_out' });
        }
      });

      // Mark properties as ending soon
      endingSoonProperties.forEach(property => {
        if (property.status !== 'ending_soon') {
          statusUpdates.push({ id: property.id, status: 'ending_soon' });
        }
      });

      // Batch update statuses
      if (statusUpdates.length > 0) {
        console.log(`Updating status for ${statusUpdates.length} properties`);
        await propertyService.updatePropertyStatusesBatch(statusUpdates);
      }

    } catch (error) {
      console.error('Failed to update property statuses:', error);
    }
  }

  /**
   * Perform comprehensive pool maintenance
   */
  private async performPoolMaintenance(): Promise<void> {
    try {
      console.log('Performing pool maintenance...');

      // Check if we need more properties
      const needsMore = await propertyPoolService.needsMoreProperties(this.config.minPoolSize);
      
      if (needsMore) {
        await this.replenishPool();
      }

      // Clean up old sold out properties (optional)
      await this.cleanupOldProperties();

      // Validate class distribution
      await this.validatePoolDistribution();

      console.log('Pool maintenance completed');
    } catch (error) {
      console.error('Failed to perform pool maintenance:', error);
    }
  }

  /**
   * Replenish the property pool
   */
  private async replenishPool(): Promise<void> {
    try {
      const activeProperties = await propertyService.getActiveProperties();
      const needed = this.config.minPoolSize - activeProperties.length;

      if (needed <= 0) {
        return;
      }

      console.log(`Replenishing pool with ${needed} properties`);
      
      const batchSize = Math.min(needed, this.config.maxPropertiesPerBatch);
      await this.generatePropertiesBatch(batchSize);
      
    } catch (error) {
      console.error('Failed to replenish pool:', error);
    }
  }

  /**
   * Generate a batch of properties
   */
  private async generatePropertiesBatch(count: number): Promise<void> {
    try {
      console.log(`Generating ${count} new properties...`);
      
      const properties = await generatePropertyBatch(count);
      
      if (properties.length > 0) {
        const propertyIds = await propertyService.createPropertiesBatch(properties);
        console.log(`Successfully created ${propertyIds.length} properties`);
      }
    } catch (error) {
      console.error('Failed to generate property batch:', error);
      throw error;
    }
  }

  /**
   * Clean up old sold out properties
   */
  private async cleanupOldProperties(): Promise<void> {
    try {
      const cleaned = await propertyPoolService.cleanupSoldOutProperties(this.config.cleanupRetentionDays);
      
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} old properties`);
      }
    } catch (error) {
      console.error('Failed to cleanup old properties:', error);
    }
  }

  /**
   * Validate and correct class distribution
   */
  private async validatePoolDistribution(): Promise<void> {
    try {
      const activeProperties = await propertyService.getActiveProperties();
      
      if (!validateClassDistribution(activeProperties)) {
        console.log('Class distribution is off, generating corrective properties...');
        
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
          console.log(`Generating ${totalNeeded} corrective properties:`, needed);
          // This would require a more sophisticated generation algorithm
          // For now, we'll just generate normal properties
          await this.generatePropertiesBatch(Math.min(totalNeeded, 5));
        }
      }
    } catch (error) {
      console.error('Failed to validate pool distribution:', error);
    }
  }

  /**
   * Get current pool statistics
   */
  public async getPoolStats(): Promise<{
    total: number;
    available: number;
    endingSoon: number;
    soldOut: number;
    classDistribution: { A: number; B: number; C: number };
    isHealthy: boolean;
  }> {
    try {
      const [properties, counts] = await Promise.all([
        propertyService.getProperties(),
        propertyService.getPropertiesCountByStatus()
      ]);

      const classDistribution = { A: 0, B: 0, C: 0 };
      properties.forEach(p => classDistribution[p.class]++);

      const activeCount = counts.available + counts.ending_soon;
      const isHealthy = activeCount >= this.config.minPoolSize && validateClassDistribution(properties);

      return {
        total: properties.length,
        available: counts.available,
        endingSoon: counts.ending_soon,
        soldOut: counts.sold_out,
        classDistribution,
        isHealthy
      };
    } catch (error) {
      console.error('Failed to get pool stats:', error);
      throw error;
    }
  }

  /**
   * Force a maintenance cycle (for testing/admin purposes)
   */
  public async forceMaintenance(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Property pool manager is not running');
    }

    console.log('Forcing maintenance cycle...');
    await this.performPoolMaintenance();
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
    console.log('Configuration updated:', this.config);
  }

  /**
   * Check if the manager is running
   */
  public isManagerRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const propertyPoolManager = PropertyPoolManager.getInstance();