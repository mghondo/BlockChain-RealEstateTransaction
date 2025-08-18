/**
 * Property Appreciation Configuration
 * 
 * Central configuration for property appreciation rates across all classes.
 * Modify these values to easily adjust appreciation behavior system-wide.
 */

export interface AppreciationConfig {
  // Flat rate configuration
  FLAT_RATE_ALL_CLASSES: number;
  USE_FLAT_RATE: boolean;
  
  // Individual class rates (used when USE_FLAT_RATE is false)
  CLASS_RATES: {
    A: number;
    B: number;
    C: number;
  };
  
  // Randomization settings
  VARIATION_ENABLED: boolean;
  VARIATION_PERCENTAGE: number; // ±percentage (0.2 = ±20%)
  
  // Safety bounds
  MIN_RATE: number;
  MAX_RATE: number;
  
  // Quarter calculation
  COMPOUND_QUARTERLY: boolean; // true = compound quarterly, false = simple division by 4
}

export const APPRECIATION_CONFIG: AppreciationConfig = {
  // Current setting: 8% flat for all classes
  FLAT_RATE_ALL_CLASSES: 0.08, // 8% annual
  USE_FLAT_RATE: true,
  
  // Individual class rates (currently not used)
  CLASS_RATES: {
    A: 0.08, // 8% annually for Class A (luxury)
    B: 0.08, // 8% annually for Class B (mid-tier)  
    C: 0.08, // 8% annually for Class C (budget)
  },
  
  // Randomization (currently disabled for consistency)
  VARIATION_ENABLED: false,
  VARIATION_PERCENTAGE: 0.2, // ±20%
  
  // Safety bounds
  MIN_RATE: 0.01, // 1% minimum annual
  MAX_RATE: 0.15, // 15% maximum annual
  
  // Calculation method
  COMPOUND_QUARTERLY: true, // Use compound quarterly calculation
};

/**
 * Helper function to get appreciation rate for a property class
 */
export function getAppreciationRate(propertyClass: 'A' | 'B' | 'C'): number {
  const config = APPRECIATION_CONFIG;
  
  // Use flat rate or class-specific rate
  let baseRate: number;
  if (config.USE_FLAT_RATE) {
    baseRate = config.FLAT_RATE_ALL_CLASSES;
  } else {
    baseRate = config.CLASS_RATES[propertyClass];
  }
  
  // Add variation if enabled
  if (config.VARIATION_ENABLED) {
    const variation = (Math.random() - 0.5) * 2 * config.VARIATION_PERCENTAGE;
    baseRate = baseRate * (1 + variation);
  }
  
  // Apply safety bounds
  return Math.max(config.MIN_RATE, Math.min(config.MAX_RATE, baseRate));
}

/**
 * Calculate quarterly rate from annual rate
 */
export function calculateQuarterlyRate(annualRate: number): number {
  const config = APPRECIATION_CONFIG;
  
  if (config.COMPOUND_QUARTERLY) {
    // Compound quarterly: (1 + annual)^(1/4) - 1
    return Math.pow(1 + annualRate, 0.25) - 1;
  } else {
    // Simple quarterly: annual / 4
    return annualRate / 4;
  }
}

/**
 * Development helper to quickly change appreciation rates
 * Call this function in browser console: window.setAppreciationRate(0.10)
 */
export function setAppreciationRate(newRate: number): void {
  if (typeof window !== 'undefined') {
    console.log(`🏠 Updating appreciation rate from ${APPRECIATION_CONFIG.FLAT_RATE_ALL_CLASSES * 100}% to ${newRate * 100}%`);
    (APPRECIATION_CONFIG as any).FLAT_RATE_ALL_CLASSES = newRate;
    console.log('✅ Rate updated. New properties will use this rate.');
  }
}

// Export for browser console access
if (typeof window !== 'undefined') {
  (window as any).setAppreciationRate = setAppreciationRate;
  (window as any).appreciationConfig = APPRECIATION_CONFIG;
}