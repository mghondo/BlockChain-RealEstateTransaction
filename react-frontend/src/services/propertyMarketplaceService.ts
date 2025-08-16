import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

interface MarketplaceProperty {
  id: string;
  class: 'A' | 'B' | 'C';
  address: string;
  city: string;
  state: string;
  region: 'midwest' | 'southwest' | 'southeast' | 'anywhere';
  price: number;
  currentValue: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  rentalYield: number;
  imageUrl: string;
  status: 'available' | 'ending_soon' | 'sold_out';
  createdAt: Date;
  selloutTime: Date;
  sharesSold: number; // 0-100
  totalShares: number; // Always 100
  pricePerShare: number;
  minimumInvestment: number;
}

interface PropertyFilter {
  class?: 'A' | 'B' | 'C' | 'all';
  region?: 'midwest' | 'southwest' | 'southeast' | 'anywhere' | 'all';
  priceRange?: {
    min: number;
    max: number;
  };
  affordableOnly?: boolean;
  userEthBalance?: number;
  timeRemaining?: 'ending_soon' | 'all';
  sortBy?: 'price' | 'yield' | 'timeRemaining' | 'newest';
}

interface InvestmentCalculation {
  propertyId: string;
  propertyPrice: number;
  pricePerShare: number;
  maxAffordableShares: number;
  suggestedShares: number;
  totalCost: number;
  ownershipPercentage: number;
  monthlyRentalProjection: number;
  annualRentalProjection: number;
  gasFeesEth: number;
  totalCostWithGas: number;
  canAfford: boolean;
}

export class PropertyMarketplaceService {
  
  // Get all available properties for marketplace
  static async getAvailableProperties(filters?: PropertyFilter): Promise<MarketplaceProperty[]> {
    try {
      console.log('Fetching available properties with filters:', filters);
      
      // Base query for available properties
      let q = query(
        collection(db, 'properties'),
        where('status', 'in', ['available', 'ending_soon'])
      );
      
      // Apply class filter
      if (filters?.class && filters.class !== 'all') {
        q = query(q, where('class', '==', filters.class));
      }
      
      // Apply region filter
      if (filters?.region && filters.region !== 'all') {
        q = query(q, where('region', '==', filters.region));
      }
      
      const snapshot = await getDocs(q);
      let properties = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          selloutTime: data.selloutTime.toDate(),
          pricePerShare: data.currentValue / 100,
          minimumInvestment: data.currentValue / 100, // 1 share minimum
        };
      }) as MarketplaceProperty[];
      
      // Apply client-side filters
      if (filters) {
        properties = this.applyClientFilters(properties, filters);
      }
      
      console.log(`Found ${properties.length} properties matching filters`);
      return properties;
      
    } catch (error) {
      console.error('Error fetching available properties:', error);
      return [];
    }
  }
  
  // Apply filters that can't be done in Firestore query
  private static applyClientFilters(
    properties: MarketplaceProperty[], 
    filters: PropertyFilter
  ): MarketplaceProperty[] {
    let filtered = [...properties];
    
    // Price range filter
    if (filters.priceRange) {
      filtered = filtered.filter(p => 
        p.currentValue >= filters.priceRange!.min && 
        p.currentValue <= filters.priceRange!.max
      );
    }
    
    // Affordability filter
    if (filters.affordableOnly && filters.userEthBalance) {
      filtered = filtered.filter(p => 
        p.pricePerShare <= filters.userEthBalance!
      );
    }
    
    // Time remaining filter
    if (filters.timeRemaining === 'ending_soon') {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      filtered = filtered.filter(p => p.selloutTime <= oneHourFromNow);
    }
    
    // Sort properties
    switch (filters.sortBy) {
      case 'price':
        filtered.sort((a, b) => a.currentValue - b.currentValue);
        break;
      case 'yield':
        filtered.sort((a, b) => b.rentalYield - a.rentalYield);
        break;
      case 'timeRemaining':
        filtered.sort((a, b) => a.selloutTime.getTime() - b.selloutTime.getTime());
        break;
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default:
        // Default sort by newest
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    
    return filtered;
  }
  
  // Get detailed property information
  static async getPropertyDetails(propertyId: string): Promise<MarketplaceProperty | null> {
    try {
      const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
      
      if (propertyDoc.exists()) {
        const data = propertyDoc.data();
        return {
          id: propertyDoc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          selloutTime: data.selloutTime.toDate(),
          pricePerShare: data.currentValue / 100,
          minimumInvestment: data.currentValue / 100,
        } as MarketplaceProperty;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching property details:', error);
      return null;
    }
  }
  
  // Calculate investment details for a property
  static calculateInvestment(
    property: MarketplaceProperty,
    userEthBalance: number,
    desiredShares?: number
  ): InvestmentCalculation {
    const pricePerShare = property.currentValue / 100;
    const maxAffordableShares = Math.floor(userEthBalance / pricePerShare);
    
    // Use desired shares or suggest 25% of affordable amount (min 1, max 100)
    const suggestedShares = desiredShares || Math.max(1, Math.min(25, Math.floor(maxAffordableShares * 0.25)));
    const actualShares = Math.min(suggestedShares, maxAffordableShares, 100 - property.sharesSold);
    
    const totalCost = actualShares * pricePerShare;
    const ownershipPercentage = actualShares / 100;
    
    // Calculate rental projections
    const annualRental = property.currentValue * (property.rentalYield / 100);
    const monthlyRental = annualRental / 12;
    const userMonthlyRental = monthlyRental * ownershipPercentage;
    const userAnnualRental = userMonthlyRental * 12;
    
    // Estimate gas fees (simplified)
    const gasFeesEth = 0.002; // Approximate gas cost for property investment
    const totalCostWithGas = totalCost + gasFeesEth;
    
    return {
      propertyId: property.id,
      propertyPrice: property.currentValue,
      pricePerShare,
      maxAffordableShares,
      suggestedShares: actualShares,
      totalCost,
      ownershipPercentage: ownershipPercentage * 100, // Convert to percentage
      monthlyRentalProjection: userMonthlyRental,
      annualRentalProjection: userAnnualRental,
      gasFeesEth,
      totalCostWithGas,
      canAfford: totalCostWithGas <= userEthBalance,
    };
  }
  
  // Get property stats for marketplace overview
  static async getMarketplaceStats(): Promise<{
    totalProperties: number;
    averageYield: number;
    totalValue: number;
    endingSoon: number;
    classCounts: { A: number; B: number; C: number };
  }> {
    try {
      const properties = await this.getAvailableProperties();
      
      const stats = {
        totalProperties: properties.length,
        averageYield: properties.reduce((sum, p) => sum + p.rentalYield, 0) / properties.length,
        totalValue: properties.reduce((sum, p) => sum + p.currentValue, 0),
        endingSoon: properties.filter(p => p.status === 'ending_soon').length,
        classCounts: {
          A: properties.filter(p => p.class === 'A').length,
          B: properties.filter(p => p.class === 'B').length,
          C: properties.filter(p => p.class === 'C').length,
        },
      };
      
      return stats;
    } catch (error) {
      console.error('Error calculating marketplace stats:', error);
      return {
        totalProperties: 0,
        averageYield: 0,
        totalValue: 0,
        endingSoon: 0,
        classCounts: { A: 0, B: 0, C: 0 },
      };
    }
  }
  
  // Create sample marketplace properties (for testing)
  static async createSampleProperties(): Promise<void> {
    try {
      console.log('Creating sample marketplace properties...');
      
      const sampleProperties = [
        {
          class: 'C',
          address: '789 Pine Street',
          city: 'Cleveland',
          state: 'OH',
          region: 'midwest',
          price: 120000,
          currentValue: 125000,
          sqft: 1100,
          bedrooms: 2,
          bathrooms: 1,
          yearBuilt: 2005,
          rentalYield: 14.2,
          imageUrl: '/property-images/class-c/midwest/sample2.jpg',
          status: 'available',
          sharesSold: 0,
          totalShares: 100,
        },
        {
          class: 'B',
          address: '321 Desert View Drive',
          city: 'Phoenix',
          state: 'AZ',
          region: 'southwest',
          price: 650000,
          currentValue: 675000,
          sqft: 2200,
          bedrooms: 4,
          bathrooms: 3,
          yearBuilt: 2019,
          rentalYield: 7.8,
          imageUrl: '/property-images/class-b/southwest/sample2.jpg',
          status: 'available',
          sharesSold: 0,
          totalShares: 100,
        },
        {
          class: 'A',
          address: '555 Luxury Lane',
          city: 'Miami',
          state: 'FL',
          region: 'southeast',
          price: 2400000,
          currentValue: 2450000,
          sqft: 4500,
          bedrooms: 5,
          bathrooms: 4,
          yearBuilt: 2021,
          rentalYield: 5.2,
          imageUrl: '/property-images/class-a/southeast/sample1.jpg',
          status: 'available',
          sharesSold: 0,
          totalShares: 100,
        },
        {
          class: 'C',
          address: '888 Budget Boulevard',
          city: 'Detroit',
          state: 'MI',
          region: 'midwest',
          price: 95000,
          currentValue: 98000,
          sqft: 950,
          bedrooms: 2,
          bathrooms: 1,
          yearBuilt: 1995,
          rentalYield: 15.8,
          imageUrl: '/property-images/class-c/midwest/sample3.jpg',
          status: 'ending_soon',
          sharesSold: 73,
          totalShares: 100,
        },
      ];
      
      // Add properties to Firestore
      for (const property of sampleProperties) {
        await addDoc(collection(db, 'properties'), {
          ...property,
          createdAt: new Date(),
          selloutTime: new Date(Date.now() + Math.random() * 2 * 60 * 60 * 1000), // 0-2 hours
        });
      }
      
      console.log(`Created ${sampleProperties.length} sample properties`);
    } catch (error) {
      console.error('Error creating sample properties:', error);
      throw error;
    }
  }
}

export type { MarketplaceProperty, PropertyFilter, InvestmentCalculation };