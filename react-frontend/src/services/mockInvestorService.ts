import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface MockInvestor {
  id?: string;
  propertyId: string;
  username: string;
  profileIcon: string;
  sharesInvested: number;
  investmentAmount: number; // ETH
  investmentDate: Date;
  location: string; // Fake location like "Austin, TX"
  investorType: 'conservative' | 'aggressive' | 'balanced';
}

interface InvestmentCompletion {
  propertyId: string;
  userShares: number;
  userInvestment: number;
  mockInvestors: MockInvestor[];
  totalSharesCompleted: number;
  completionTime: Date;
}

export class MockInvestorService {
  
  // Generate realistic investor usernames
  private static generateUsername(): string {
    const firstNames = [
      'Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Avery', 'Quinn',
      'Blake', 'Cameron', 'Sage', 'Rowan', 'Emery', 'Phoenix', 'River', 'Skyler',
      'Dakota', 'Finley', 'Hayden', 'Kendall', 'Logan', 'Micah', 'Parker', 'Reese'
    ];
    
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
      'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
    ];
    
    const numbers = Math.floor(Math.random() * 999) + 1;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Various username patterns
    const patterns = [
      `${firstName}${lastName}${numbers}`,
      `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
      `${firstName}${numbers}`,
      `${lastName.toLowerCase()}${numbers}`,
      `${firstName.toLowerCase()}${lastName.toLowerCase()}${numbers}`,
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  // Generate realistic profile icons
  private static generateProfileIcon(): string {
    const icons = [
      '👤', '🧑‍💼', '👩‍💼', '🧑‍🎓', '👩‍🎓', '🧑‍⚕️', '👩‍⚕️', '🧑‍🔬', '👩‍🔬',
      '🧑‍💻', '👩‍💻', '🧑‍🎨', '👩‍🎨', '🧑‍🍳', '👩‍🍳', '🧑‍🌾', '👩‍🌾', '🧑‍🏫',
      '👩‍🏫', '🧑‍⚖️', '👩‍⚖️', '🧑‍✈️', '👩‍✈️', '🧑‍🚀', '👩‍🚀', '🧑‍🚒', '👩‍🚒'
    ];
    
    return icons[Math.floor(Math.random() * icons.length)];
  }

  // Generate fake locations
  private static generateLocation(): string {
    const locations = [
      'Austin, TX', 'Seattle, WA', 'Denver, CO', 'Portland, OR', 'Nashville, TN',
      'Atlanta, GA', 'Phoenix, AZ', 'San Diego, CA', 'Tampa, FL', 'Charlotte, NC',
      'Raleigh, NC', 'Minneapolis, MN', 'Kansas City, MO', 'Las Vegas, NV',
      'Sacramento, CA', 'Oklahoma City, OK', 'Louisville, KY', 'Milwaukee, WI',
      'Albuquerque, NM', 'Tucson, AZ', 'Fresno, CA', 'Mesa, AZ', 'Virginia Beach, VA',
      'Omaha, NE', 'Oakland, CA', 'Miami, FL', 'Tulsa, OK', 'Honolulu, HI'
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // Determine investor type based on property class
  private static determineInvestorType(propertyClass: 'A' | 'B' | 'C'): 'conservative' | 'aggressive' | 'balanced' {
    const random = Math.random();
    
    switch (propertyClass) {
      case 'A': // Luxury properties attract more conservative investors
        if (random < 0.5) return 'conservative';
        if (random < 0.8) return 'balanced';
        return 'aggressive';
      
      case 'B': // Balanced properties attract balanced investors
        if (random < 0.3) return 'conservative';
        if (random < 0.7) return 'balanced';
        return 'aggressive';
      
      case 'C': // Budget properties attract more aggressive investors
        if (random < 0.2) return 'conservative';
        if (random < 0.5) return 'balanced';
        return 'aggressive';
      
      default:
        return 'balanced';
    }
  }

  // Generate investment amount based on investor type
  private static generateInvestmentAmount(
    pricePerShare: number, 
    investorType: 'conservative' | 'aggressive' | 'balanced',
    maxShares: number
  ): number {
    let baseShares: number;
    
    switch (investorType) {
      case 'conservative':
        baseShares = Math.floor(Math.random() * 5) + 1; // 1-5 shares
        break;
      case 'balanced':
        baseShares = Math.floor(Math.random() * 15) + 3; // 3-17 shares
        break;
      case 'aggressive':
        baseShares = Math.floor(Math.random() * 25) + 10; // 10-34 shares
        break;
    }
    
    // Ensure we don't exceed available shares
    return Math.min(baseShares, maxShares);
  }

  // Generate mock investors to complete a property investment
  static generateMockInvestors(
    propertyId: string,
    propertyClass: 'A' | 'B' | 'C',
    pricePerShare: number,
    userShares: number
  ): MockInvestor[] {
    const remainingShares = 100 - userShares;
    const mockInvestors: MockInvestor[] = [];
    let sharesLeft = remainingShares;

    // Generate 3-8 mock investors
    const numInvestors = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < numInvestors && sharesLeft > 0; i++) {
      const investorType = this.determineInvestorType(propertyClass);
      
      // For the last investor, they get all remaining shares
      const isLastInvestor = i === numInvestors - 1 || sharesLeft <= 5;
      const shares = isLastInvestor 
        ? sharesLeft 
        : this.generateInvestmentAmount(pricePerShare, investorType, sharesLeft);

      if (shares > 0) {
        const mockInvestor: MockInvestor = {
          propertyId,
          username: this.generateUsername(),
          profileIcon: this.generateProfileIcon(),
          sharesInvested: shares,
          investmentAmount: shares * pricePerShare,
          investmentDate: new Date(),
          location: this.generateLocation(),
          investorType,
        };

        mockInvestors.push(mockInvestor);
        sharesLeft -= shares;
      }
    }

    // Ensure all shares are allocated
    if (sharesLeft > 0 && mockInvestors.length > 0) {
      mockInvestors[mockInvestors.length - 1].sharesInvested += sharesLeft;
      mockInvestors[mockInvestors.length - 1].investmentAmount += sharesLeft * pricePerShare;
    }

    return mockInvestors;
  }

  // Complete property investment with mock investors
  static async completePropertyInvestment(
    propertyId: string,
    propertyClass: 'A' | 'B' | 'C',
    pricePerShare: number,
    userShares: number,
    userInvestmentAmount: number
  ): Promise<InvestmentCompletion> {
    try {
      console.log(`Completing investment for property ${propertyId} with ${userShares} user shares`);

      // Generate mock investors
      const mockInvestors = this.generateMockInvestors(
        propertyId,
        propertyClass,
        pricePerShare,
        userShares
      );

      // Save mock investors to database
      const mockInvestorPromises = mockInvestors.map(investor => 
        addDoc(collection(db, 'mockInvestors'), investor)
      );

      const mockInvestorDocs = await Promise.all(mockInvestorPromises);

      // Add IDs to mock investors
      mockInvestors.forEach((investor, index) => {
        investor.id = mockInvestorDocs[index].id;
      });

      // Update property status
      const totalSharesSold = userShares + mockInvestors.reduce((sum, inv) => sum + inv.sharesInvested, 0);
      
      await updateDoc(doc(db, 'properties', propertyId), {
        sharesSold: totalSharesSold,
        status: totalSharesSold >= 100 ? 'sold_out' : 'available',
        lastInvestmentDate: new Date(),
      });

      const completion: InvestmentCompletion = {
        propertyId,
        userShares,
        userInvestment: userInvestmentAmount,
        mockInvestors,
        totalSharesCompleted: totalSharesSold,
        completionTime: new Date(),
      };

      console.log(`Investment completed: ${totalSharesSold} total shares sold`);
      return completion;

    } catch (error) {
      console.error('Error completing property investment:', error);
      throw error;
    }
  }

  // Get mock investors for a property
  static async getMockInvestors(propertyId: string): Promise<MockInvestor[]> {
    try {
      const investorsQuery = query(
        collection(db, 'mockInvestors'),
        where('propertyId', '==', propertyId)
      );

      const snapshot = await getDocs(investorsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        investmentDate: doc.data().investmentDate.toDate(),
      })) as MockInvestor[];

    } catch (error) {
      console.error('Error getting mock investors:', error);
      return [];
    }
  }

  // Get investment statistics for a property
  static async getPropertyInvestmentStats(propertyId: string): Promise<{
    totalInvestors: number;
    totalInvestment: number;
    averageInvestment: number;
    investorTypes: { conservative: number; balanced: number; aggressive: number };
  }> {
    try {
      const mockInvestors = await this.getMockInvestors(propertyId);
      
      const totalInvestment = mockInvestors.reduce((sum, inv) => sum + inv.investmentAmount, 0);
      const investorTypes = mockInvestors.reduce(
        (counts, inv) => {
          counts[inv.investorType]++;
          return counts;
        },
        { conservative: 0, balanced: 0, aggressive: 0 }
      );

      return {
        totalInvestors: mockInvestors.length,
        totalInvestment,
        averageInvestment: mockInvestors.length > 0 ? totalInvestment / mockInvestors.length : 0,
        investorTypes,
      };

    } catch (error) {
      console.error('Error getting property investment stats:', error);
      return {
        totalInvestors: 0,
        totalInvestment: 0,
        averageInvestment: 0,
        investorTypes: { conservative: 0, balanced: 0, aggressive: 0 },
      };
    }
  }

  // Simulate the animated joining process (for UI)
  static async simulateInvestorJoining(
    mockInvestors: MockInvestor[],
    onInvestorJoin: (investor: MockInvestor, index: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < mockInvestors.length; i++) {
      const investor = mockInvestors[i];
      
      // Random delay between 200ms - 800ms for realistic timing
      const delay = Math.random() * 600 + 200;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      onInvestorJoin(investor, i, mockInvestors.length);
    }
  }
}

export type { MockInvestor, InvestmentCompletion };