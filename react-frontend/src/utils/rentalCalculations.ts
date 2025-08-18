/**
 * Utility functions for rental income calculations
 */

export interface RentalIncomeCalculation {
  annualIncome: number;
  monthlyIncome: number;
  monthlyIncomePerShare: number;
}

/**
 * Calculate realistic rental income for a property (simulates existing lease amounts)
 * @param propertyValue - Current value of the property
 * @param rentalYield - Annual rental yield as decimal (e.g., 0.08 for 8%)
 * @param numberOfShares - Number of shares (default: 100 for full property)
 * @returns Rental income calculations
 */
export function calculateRentalIncome(
  propertyValue: number,
  rentalYield: number,
  numberOfShares: number = 100
): RentalIncomeCalculation {
  // Calculate base annual rental income
  const baseAnnualIncome = propertyValue * rentalYield;
  
  // Add realistic variation to simulate actual lease amounts (±2-8%)
  // Use property value as seed for consistent results per property
  const seed = propertyValue.toString().slice(-2); // Last 2 digits as seed
  const variation = (parseInt(seed) % 11 - 5) / 100; // -5% to +5% variation
  const annualIncome = baseAnnualIncome * (1 + variation);
  
  // Calculate monthly rental income for the full property
  const monthlyIncome = annualIncome / 12;
  
  // Calculate monthly rental income per share
  const monthlyIncomePerShare = monthlyIncome / 100;
  
  // Calculate monthly rental income for specified number of shares
  const monthlyIncomeForShares = monthlyIncomePerShare * numberOfShares;

  return {
    annualIncome,
    monthlyIncome,
    monthlyIncomePerShare: monthlyIncomeForShares
  };
}

/**
 * Format rental income as exact currency string (like real lease amounts)
 * @param amount - Amount to format
 * @returns Formatted currency string with cents
 */
export function formatRentalIncome(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Get rental income display text for property cards
 * @param propertyValue - Current value of the property
 * @param rentalYield - Annual rental yield as decimal
 * @param searchMode - 'total' or 'shares'
 * @param numberOfShares - Number of shares (for share mode)
 * @returns Display text for rental income
 */
export function getRentalIncomeDisplay(
  propertyValue: number,
  rentalYield: number,
  searchMode: string = 'total',
  numberOfShares: number = 1
): string {
  const calculation = calculateRentalIncome(propertyValue, rentalYield, searchMode === 'shares' ? numberOfShares : 100);
  
  if (searchMode === 'shares') {
    return `${formatRentalIncome(calculation.monthlyIncomePerShare)}/mo for ${numberOfShares} share${numberOfShares !== 1 ? 's' : ''}`;
  } else {
    return `${formatRentalIncome(calculation.monthlyIncome)}/mo total`;
  }
}