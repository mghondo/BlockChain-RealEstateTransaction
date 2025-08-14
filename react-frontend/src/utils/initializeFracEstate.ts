import { propertyService, propertyPoolService } from '../services/firebaseService';
import { propertyPoolManager } from '../services/propertyPoolManager';
import { generatePropertyBatch } from './propertyGenerator';

/**
 * Initialize FracEstate with sample data for development and demo purposes
 */
export async function initializeFracEstate(force = false): Promise<void> {
  console.log('🏠 Initializing FracEstate...');
  
  try {
    // Check if already initialized
    const existingProperties = await propertyService.getAllPropertiesSimple();
    
    if (existingProperties.length > 0 && !force) {
      console.log(`✅ FracEstate already initialized with ${existingProperties.length} properties`);
      return;
    }
    
    if (force && existingProperties.length > 0) {
      console.log('🔄 Force reinitializing FracEstate...');
      // In a real app, you might want to clear existing data here
    }
    
    // Generate initial property pool
    console.log('🏗️ Generating initial property pool...');
    const initialPropertyCount = 60; // Start with 60 properties
    
    const properties = await generatePropertyBatch(initialPropertyCount);
    console.log(`📝 Generated ${properties.length} properties`);
    
    // Create properties in Firebase
    console.log('💾 Saving properties to Firebase...');
    const propertyIds = await propertyService.createPropertiesBatch(properties);
    console.log(`✅ Created ${propertyIds.length} properties in Firebase`);
    
    // Start the property pool manager
    console.log('🔧 Starting property pool manager...');
    await propertyPoolManager.start();
    
    // Get pool statistics
    const stats = await propertyPoolManager.getPoolStats();
    console.log('📊 Property pool statistics:', stats);
    
    console.log('🎉 FracEstate initialization complete!');
    
  } catch (error) {
    console.error('❌ Failed to initialize FracEstate:', error);
    throw error;
  }
}

/**
 * Reset FracEstate data (development only)
 */
export async function resetFracEstate(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset data in production');
  }
  
  console.log('🔄 Resetting FracEstate...');
  
  try {
    // Stop pool manager
    propertyPoolManager.stop();
    
    // Get all properties
    const allProperties = await propertyService.getAllPropertiesSimple();
    console.log(`🗑️ Removing ${allProperties.length} existing properties...`);
    
    // Delete all properties (in batches to avoid overwhelming Firebase)
    const batchSize = 10;
    for (let i = 0; i < allProperties.length; i += batchSize) {
      const batch = allProperties.slice(i, i + batchSize);
      await Promise.all(batch.map(property => 
        propertyService.deleteProperty(property.id)
      ));
      console.log(`🗑️ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProperties.length / batchSize)}`);
    }
    
    console.log('✅ FracEstate reset complete');
    
  } catch (error) {
    console.error('❌ Failed to reset FracEstate:', error);
    throw error;
  }
}

/**
 * Get FracEstate health status
 */
export async function getFracEstateHealth(): Promise<{
  isHealthy: boolean;
  poolManagerRunning: boolean;
  propertyCount: number;
  activeProperties: number;
  classDistribution: { A: number; B: number; C: number };
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    // Check pool manager
    const poolManagerRunning = propertyPoolManager.isManagerRunning();
    if (!poolManagerRunning) {
      issues.push('Property pool manager is not running');
    }
    
    // Get property statistics
    const stats = await propertyPoolManager.getPoolStats();
    
    // Check minimum property count
    if (stats.total < 50) {
      issues.push(`Low property count: ${stats.total} (minimum: 50)`);
    }
    
    // Check active properties
    const activeProperties = stats.available + stats.endingSoon;
    if (activeProperties < 30) {
      issues.push(`Low active property count: ${activeProperties} (minimum: 30)`);
    }
    
    // Check class distribution
    if (!stats.isHealthy) {
      issues.push('Property class distribution is unbalanced');
    }
    
    const isHealthy = issues.length === 0;
    
    return {
      isHealthy,
      poolManagerRunning,
      propertyCount: stats.total,
      activeProperties,
      classDistribution: stats.classDistribution,
      issues
    };
    
  } catch (error) {
    console.error('Failed to get FracEstate health:', error);
    return {
      isHealthy: false,
      poolManagerRunning: false,
      propertyCount: 0,
      activeProperties: 0,
      classDistribution: { A: 0, B: 0, C: 0 },
      issues: ['Failed to check system health']
    };
  }
}

/**
 * Fix common FracEstate issues
 */
export async function fixFracEstateIssues(): Promise<void> {
  console.log('🔧 Fixing FracEstate issues...');
  
  try {
    const health = await getFracEstateHealth();
    
    if (!health.poolManagerRunning) {
      console.log('🔧 Starting property pool manager...');
      await propertyPoolManager.start();
    }
    
    if (health.activeProperties < 30) {
      console.log('🔧 Generating more properties...');
      const needed = 50 - health.activeProperties;
      await propertyPoolManager.forceMaintenance();
    }
    
    console.log('✅ FracEstate issues fixed');
    
  } catch (error) {
    console.error('❌ Failed to fix FracEstate issues:', error);
    throw error;
  }
}

/**
 * Development helper to populate with test data
 */
export async function populateTestData(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Test data population skipped in production');
    return;
  }
  
  console.log('🧪 Populating test data...');
  
  try {
    // Generate additional test properties
    const testProperties = await generatePropertyBatch(20);
    
    // Add some specific test cases
    const testCases = testProperties.slice(0, 5).map((property, index) => ({
      ...property,
      // Make some properties ending soon for testing
      selloutTime: new Date(Date.now() + (index + 1) * 10 * 60 * 1000) as any
    }));
    
    await propertyService.createPropertiesBatch(testCases);
    
    console.log('✅ Test data populated');
    
  } catch (error) {
    console.error('❌ Failed to populate test data:', error);
    throw error;
  }
}

// Export utility functions for browser console
if (typeof window !== 'undefined') {
  (window as any).fracEstate = {
    initialize: initializeFracEstate,
    reset: resetFracEstate,
    health: getFracEstateHealth,
    fix: fixFracEstateIssues,
    testData: populateTestData,
    poolManager: propertyPoolManager
  };
  
  console.log('🔧 FracEstate utilities available at window.fracEstate');
}