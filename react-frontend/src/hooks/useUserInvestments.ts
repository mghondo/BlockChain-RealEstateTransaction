import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface Investment {
  id: string;
  userId: string;
  propertyId: string;
  propertyAddress: string;
  propertyClass: string;
  sharesOwned: number;
  purchasePrice: number; // ETH amount paid
  purchaseUsdValue: number; // USD value at time of purchase
  currentValue: number;
  purchaseDate: Date;
  lastUpdated: Date;
  
  // Full property details
  propertyCity: string;
  propertyState: string;
  propertyRegion: string;
  propertyImageUrl: string;
  propertyBedrooms: number;
  propertyBathrooms: number;
  propertySqft: number;
  propertyYearBuilt: number;
  propertyTotalPrice: number; // Full USD property value
  rentalYield: number; // For rental income calculations
  
  // Game mechanics timestamps
  rentalIncomeStartDate: Date;
  appreciationStartDate: Date;
}

interface InvestmentWithCalculations extends Investment {
  // Calculated fields
  ownershipPercentage: number;
  totalRentalEarned: number;
  monthlyRentalIncome: number;
  appreciationAmount: number;
  currentPropertyValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
}

interface PortfolioSummary {
  totalProperties: number;
  totalInvested: number; // ETH
  totalInvestedUSD: number; // USD
  currentValue: number; // ETH
  currentValueUSD: number; // USD
  totalReturn: number; // USD
  totalReturnPercentage: number;
  monthlyRentalIncome: number; // USD
  totalRentalEarned: number; // USD
}

export const useUserInvestments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<InvestmentWithCalculations[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate rental income earned since purchase
  const calculateRentalEarned = useCallback((investment: Investment): number => {
    const now = new Date();
    const startDate = new Date(investment.rentalIncomeStartDate);
    const timeElapsedMs = now.getTime() - startDate.getTime();
    const monthsElapsed = timeElapsedMs / (1000 * 60 * 60 * 24 * 30.44); // Average month length
    const hoursElapsed = timeElapsedMs / (1000 * 60 * 60);
    const daysElapsed = timeElapsedMs / (1000 * 60 * 60 * 24);
    
    console.log(`⏰ Rental calculation for ${investment.propertyAddress}:`, {
      now: now.toISOString(),
      startDate: startDate.toISOString(),
      timeElapsedMs,
      hoursElapsed: hoursElapsed.toFixed(2),
      daysElapsed: daysElapsed.toFixed(2),
      monthsElapsed: monthsElapsed.toFixed(4),
      propertyTotalPrice: investment.propertyTotalPrice,
      rentalYield: investment.rentalYield,
      sharesOwned: investment.sharesOwned
    });
    
    if (monthsElapsed <= 0) {
      console.log('⚠️ No time elapsed yet, returning 0 rental');
      return 0;
    }
    
    // Calculate annual rental income for user's shares
    const annualPropertyRental = investment.propertyTotalPrice * investment.rentalYield;
    const userAnnualRental = (annualPropertyRental * investment.sharesOwned) / 100;
    const userMonthlyRental = userAnnualRental / 12;
    const totalRentalEarned = userMonthlyRental * monthsElapsed;
    
    console.log(`💰 Rental calculation details:`, {
      annualPropertyRental,
      userAnnualRental,
      userMonthlyRental,
      totalRentalEarned
    });
    
    return totalRentalEarned;
  }, []);

  // Calculate property appreciation since purchase
  const calculateAppreciation = useCallback((investment: Investment): number => {
    const now = new Date();
    const startDate = new Date(investment.appreciationStartDate);
    const monthsElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    if (monthsElapsed <= 0) return 0;
    
    // Simple appreciation model: ~3-5% annual depending on property class
    const annualAppreciationRate = investment.propertyClass === 'A' ? 0.05 : 
                                  investment.propertyClass === 'B' ? 0.04 : 0.03;
    
    const monthlyAppreciationRate = annualAppreciationRate / 12;
    const appreciationMultiplier = Math.pow(1 + monthlyAppreciationRate, monthsElapsed);
    
    const currentPropertyValue = investment.propertyTotalPrice * appreciationMultiplier;
    const userCurrentValue = (currentPropertyValue * investment.sharesOwned) / 100;
    
    return userCurrentValue - investment.purchaseUsdValue;
  }, []);

  // Fetch user investments from Firebase
  const fetchInvestments = useCallback(async () => {
    if (!user?.uid) {
      setInvestments([]);
      setPortfolioSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching user investments for:', user.uid);
      
      const investmentsRef = collection(db, `users/${user.uid}/investments`);
      const q = query(investmentsRef, orderBy('purchaseDate', 'desc'));
      const snapshot = await getDocs(q);

      const rawInvestments: Investment[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to Date objects
          purchaseDate: data.purchaseDate?.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate),
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated),
          rentalIncomeStartDate: data.rentalIncomeStartDate?.toDate ? data.rentalIncomeStartDate.toDate() : new Date(data.rentalIncomeStartDate),
          appreciationStartDate: data.appreciationStartDate?.toDate ? data.appreciationStartDate.toDate() : new Date(data.appreciationStartDate),
        } as Investment;
      });

      console.log(`📊 Found ${rawInvestments.length} investments:`, rawInvestments);
      
      // Debug each investment's raw data with type checking
      rawInvestments.forEach((inv, index) => {
        console.log(`🔍 Investment ${index + 1} COMPLETE raw data:`, inv);
        
        console.log(`🔍 Investment ${index + 1} data types:`, {
          propertyAddress: `${inv.propertyAddress} (${typeof inv.propertyAddress})`,
          sharesOwned: `${inv.sharesOwned} (${typeof inv.sharesOwned})`,
          purchasePrice: `${inv.purchasePrice} (${typeof inv.purchasePrice})`,
          purchaseUsdValue: `${inv.purchaseUsdValue} (${typeof inv.purchaseUsdValue})`,
          propertyTotalPrice: `${inv.propertyTotalPrice} (${typeof inv.propertyTotalPrice})`,
          rentalYield: `${inv.rentalYield} (${typeof inv.rentalYield})`,
          propertyBedrooms: `${inv.propertyBedrooms} (${typeof inv.propertyBedrooms})`,
          propertyBathrooms: `${inv.propertyBathrooms} (${typeof inv.propertyBathrooms})`,
          propertySqft: `${inv.propertySqft} (${typeof inv.propertySqft})`,
          propertyImageUrl: inv.propertyImageUrl ? 'HAS IMAGE URL' : 'NO IMAGE URL'
        });
        
        // Check for undefined/null values
        const missingFields = [];
        if (inv.purchaseUsdValue === undefined || inv.purchaseUsdValue === null || isNaN(inv.purchaseUsdValue)) missingFields.push('purchaseUsdValue');
        if (inv.propertyTotalPrice === undefined || inv.propertyTotalPrice === null || isNaN(inv.propertyTotalPrice)) missingFields.push('propertyTotalPrice');
        if (inv.rentalYield === undefined || inv.rentalYield === null || isNaN(inv.rentalYield)) missingFields.push('rentalYield');
        if (inv.propertyBedrooms === undefined || inv.propertyBedrooms === null) missingFields.push('propertyBedrooms');
        if (inv.propertyBathrooms === undefined || inv.propertyBathrooms === null) missingFields.push('propertyBathrooms');
        if (inv.propertySqft === undefined || inv.propertySqft === null) missingFields.push('propertySqft');
        
        if (missingFields.length > 0) {
          console.error(`❌ Missing/invalid fields in investment ${index + 1}:`, missingFields);
        } else {
          console.log(`✅ All required fields present for investment ${index + 1}`);
        }
      });

      // Calculate enhanced data for each investment
      const enhancedInvestments: InvestmentWithCalculations[] = rawInvestments.map(investment => {
        const ownershipPercentage = investment.sharesOwned;
        const totalRentalEarned = calculateRentalEarned(investment);
        const appreciationAmount = calculateAppreciation(investment);
        
        // Calculate current property value with appreciation
        const now = new Date();
        const startDate = new Date(investment.appreciationStartDate);
        const monthsElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        
        const annualAppreciationRate = investment.propertyClass === 'A' ? 0.05 : 
                                      investment.propertyClass === 'B' ? 0.04 : 0.03;
        const monthlyAppreciationRate = annualAppreciationRate / 12;
        const appreciationMultiplier = Math.max(1, Math.pow(1 + monthlyAppreciationRate, monthsElapsed));
        
        const currentPropertyValue = investment.propertyTotalPrice * appreciationMultiplier;
        const currentUserValue = (currentPropertyValue * investment.sharesOwned) / 100;
        
        // Calculate monthly rental income
        const annualPropertyRental = investment.propertyTotalPrice * investment.rentalYield;
        const monthlyRentalIncome = ((annualPropertyRental * investment.sharesOwned) / 100) / 12;
        
        // Calculate total return (appreciation + rental)
        const totalReturn = appreciationAmount + totalRentalEarned;
        const totalReturnPercentage = investment.purchaseUsdValue > 0 ? 
                                    (totalReturn / investment.purchaseUsdValue) * 100 : 0;

        const enhanced = {
          ...investment,
          ownershipPercentage,
          totalRentalEarned,
          monthlyRentalIncome,
          appreciationAmount,
          currentPropertyValue,
          totalReturn,
          totalReturnPercentage
        };
        
        console.log(`💰 Enhanced investment ${investment.propertyAddress}:`, {
          ownershipPercentage,
          purchaseUsdValue: investment.purchaseUsdValue,
          totalRentalEarned,
          monthlyRentalIncome,
          appreciationAmount,
          totalReturn,
          totalReturnPercentage,
          monthsElapsed
        });
        
        return enhanced;
      });

      setInvestments(enhancedInvestments);

      // Calculate portfolio summary
      if (enhancedInvestments.length > 0) {
        const totalInvestedETH = enhancedInvestments.reduce((sum, inv) => sum + inv.purchasePrice, 0);
        const totalInvestedUSD = enhancedInvestments.reduce((sum, inv) => sum + inv.purchaseUsdValue, 0);
        const currentValueUSD = enhancedInvestments.reduce((sum, inv) => sum + inv.purchaseUsdValue + inv.totalReturn, 0);
        const totalReturnUSD = enhancedInvestments.reduce((sum, inv) => sum + inv.totalReturn, 0);
        const monthlyRentalIncome = enhancedInvestments.reduce((sum, inv) => sum + inv.monthlyRentalIncome, 0);
        const totalRentalEarned = enhancedInvestments.reduce((sum, inv) => sum + inv.totalRentalEarned, 0);

        setPortfolioSummary({
          totalProperties: enhancedInvestments.length,
          totalInvested: totalInvestedETH,
          totalInvestedUSD,
          currentValue: totalInvestedETH, // TODO: Convert current USD back to ETH
          currentValueUSD,
          totalReturn: totalReturnUSD,
          totalReturnPercentage: totalInvestedUSD > 0 ? (totalReturnUSD / totalInvestedUSD) * 100 : 0,
          monthlyRentalIncome,
          totalRentalEarned
        });
      } else {
        setPortfolioSummary(null);
      }

    } catch (err) {
      console.error('❌ Failed to fetch investments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch investments');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, calculateRentalEarned, calculateAppreciation]);

  // Fetch investments when user changes
  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  return {
    investments,
    portfolioSummary,
    loading,
    error,
    refetch: fetchInvestments
  };
};