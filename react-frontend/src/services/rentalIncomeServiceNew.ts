// Rental Income Service - Manages rental income and property appreciation
// 0.5 hour real time = 1 month game time (1440x acceleration)
// Properties appreciate 8% annually (2% quarterly)

interface PropertyPurchase {
  propertyId: string;
  userId: string;
  shares: number;
  purchasePrice: number;
  purchaseTime: number; // Unix timestamp
  transactionHash?: string;
}

interface RentalIncomePayment {
  propertyId: string;
  userId: string;
  shares: number;
  monthlyRate: number;
  paymentTime: number;
  amount: number;
  gameMonth: number; // Which game month this payment is for
}

interface PropertyAppreciation {
  propertyId: string;
  originalValue: number;
  currentValue: number;
  lastAppreciationTime: number;
  appreciationHistory: {
    time: number;
    value: number;
    appreciationRate: number;
  }[];
}

interface PropertyTimeline {
  propertyId: string;
  createdAt: number;
  purchases: PropertyPurchase[];
  rentalPayments: RentalIncomePayment[];
  appreciation: PropertyAppreciation;
  lastProcessedTime: number;
}

class RentalIncomeService {
  private static readonly GAME_TIME_MULTIPLIER = 1440; // 0.5 hour = 1 month (30 days * 24 hours / 0.5)
  private static readonly REAL_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds
  private static readonly GAME_MONTH_MS = 0.5 * RentalIncomeService.REAL_HOUR_MS; // 30 minutes
  private static readonly ANNUAL_APPRECIATION_RATE = 0.08; // 8% annual
  private static readonly QUARTERLY_APPRECIATION_RATE = RentalIncomeService.ANNUAL_APPRECIATION_RATE / 4; // 2% quarterly
  
  private timelines: Map<string, PropertyTimeline> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
    this.startProcessing();
  }

  /**
   * Convert real time to game time
   * @param realTimeMs Real time in milliseconds
   * @returns Game time in milliseconds
   */
  private realToGameTime(realTimeMs: number): number {
    return realTimeMs * RentalIncomeService.GAME_TIME_MULTIPLIER;
  }

  /**
   * Convert game time to real time
   * @param gameTimeMs Game time in milliseconds
   * @returns Real time in milliseconds
   */
  private gameToRealTime(gameTimeMs: number): number {
    return gameTimeMs / RentalIncomeService.GAME_TIME_MULTIPLIER;
  }

  /**
   * Get the current game time since property creation
   * @param propertyCreatedAt Property creation timestamp
   * @returns Game time elapsed in milliseconds
   */
  private getGameTimeElapsed(propertyCreatedAt: number): number {
    const realTimeElapsed = Date.now() - propertyCreatedAt;
    return this.realToGameTime(realTimeElapsed);
  }

  /**
   * Calculate game month number from elapsed time
   * @param gameTimeElapsed Game time elapsed in milliseconds
   * @returns Month number (0-based)
   */
  private getGameMonth(gameTimeElapsed: number): number {
    const gameMonthMs = 30 * 24 * 60 * 60 * 1000; // 30 days in game time
    return Math.floor(gameTimeElapsed / gameMonthMs);
  }

  /**
   * Register a property purchase
   */
  recordPurchase(purchase: PropertyPurchase): void {
    let timeline = this.timelines.get(purchase.propertyId);
    
    if (!timeline) {
      // Create new timeline for this property
      timeline = {
        propertyId: purchase.propertyId,
        createdAt: purchase.purchaseTime,
        purchases: [],
        rentalPayments: [],
        appreciation: {
          propertyId: purchase.propertyId,
          originalValue: purchase.purchasePrice,
          currentValue: purchase.purchasePrice,
          lastAppreciationTime: purchase.purchaseTime,
          appreciationHistory: [{
            time: purchase.purchaseTime,
            value: purchase.purchasePrice,
            appreciationRate: 0
          }]
        },
        lastProcessedTime: purchase.purchaseTime
      };
      this.timelines.set(purchase.propertyId, timeline);
    }

    timeline.purchases.push(purchase);
    this.saveToStorage();
    
    console.log(`🏠 Property ${purchase.propertyId} purchase recorded:`, {
      shares: purchase.shares,
      price: purchase.purchasePrice,
      time: new Date(purchase.purchaseTime).toISOString()
    });
  }

  /**
   * Process rental income for a property
   */
  private processRentalIncome(timeline: PropertyTimeline): void {
    const now = Date.now();
    const gameTimeElapsed = this.getGameTimeElapsed(timeline.createdAt);
    const currentGameMonth = this.getGameMonth(gameTimeElapsed);
    
    // Get all unique users who have purchased shares
    const userShares = new Map<string, number>();
    timeline.purchases.forEach(purchase => {
      const currentShares = userShares.get(purchase.userId) || 0;
      userShares.set(purchase.userId, currentShares + purchase.shares);
    });

    // Find the last processed month for each user
    const lastPaymentMonth = new Map<string, number>();
    timeline.rentalPayments.forEach(payment => {
      const userLastMonth = lastPaymentMonth.get(payment.userId) || -1;
      lastPaymentMonth.set(payment.userId, Math.max(userLastMonth, payment.gameMonth));
    });

    // Process rental payments for each user
    userShares.forEach((shares, userId) => {
      const userLastMonth = lastPaymentMonth.get(userId) || -1;
      
      // Pay for all months since last payment
      for (let month = userLastMonth + 1; month <= currentGameMonth; month++) {
        const monthlyRentalRate = 0.008; // 0.8% per month (roughly 10% annual)
        const propertyValue = timeline.appreciation.currentValue;
        const monthlyRental = (propertyValue * monthlyRentalRate * shares) / 100;

        const payment: RentalIncomePayment = {
          propertyId: timeline.propertyId,
          userId,
          shares,
          monthlyRate: monthlyRentalRate,
          paymentTime: now,
          amount: monthlyRental,
          gameMonth: month
        };

        timeline.rentalPayments.push(payment);
        
        console.log(`💰 Rental income processed:`, {
          propertyId: timeline.propertyId,
          userId,
          month,
          shares,
          amount: monthlyRental.toFixed(6),
          totalReceived: this.getTotalRentalIncome(timeline.propertyId, userId).toFixed(6)
        });
      }
    });
  }

  /**
   * Process property appreciation
   */
  private processAppreciation(timeline: PropertyTimeline): void {
    const now = Date.now();
    const gameTimeElapsed = this.getGameTimeElapsed(timeline.createdAt);
    
    // Check if a quarter has passed in game time (3 months)
    const quarterMs = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months in game time
    const quartersElapsed = Math.floor(gameTimeElapsed / quarterMs);
    const currentQuarters = timeline.appreciation.appreciationHistory.length - 1;
    
    if (quartersElapsed > currentQuarters) {
      // Apply quarterly appreciation
      const newValue = timeline.appreciation.currentValue * (1 + RentalIncomeService.QUARTERLY_APPRECIATION_RATE);
      
      timeline.appreciation.currentValue = newValue;
      timeline.appreciation.lastAppreciationTime = now;
      timeline.appreciation.appreciationHistory.push({
        time: now,
        value: newValue,
        appreciationRate: RentalIncomeService.QUARTERLY_APPRECIATION_RATE
      });

      console.log(`📈 Property ${timeline.propertyId} appreciated:`, {
        quarter: quartersElapsed,
        oldValue: timeline.appreciation.appreciationHistory[currentQuarters].value.toFixed(4),
        newValue: newValue.toFixed(4),
        rate: `${(RentalIncomeService.QUARTERLY_APPRECIATION_RATE * 100).toFixed(1)}%`
      });
    }
  }

  /**
   * Start the processing interval
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process every 30 seconds (frequent enough for demo purposes)
    this.processingInterval = setInterval(() => {
      this.processAllTimelines();
    }, 30000);

    // Initial processing
    setTimeout(() => this.processAllTimelines(), 1000);
  }

  /**
   * Process all property timelines
   */
  private processAllTimelines(): void {
    this.timelines.forEach(timeline => {
      try {
        this.processRentalIncome(timeline);
        this.processAppreciation(timeline);
        timeline.lastProcessedTime = Date.now();
      } catch (error) {
        console.error(`Error processing timeline for property ${timeline.propertyId}:`, error);
      }
    });

    this.saveToStorage();
  }

  /**
   * Get total rental income for a user on a property
   */
  getTotalRentalIncome(propertyId: string, userId: string): number {
    const timeline = this.timelines.get(propertyId);
    if (!timeline) return 0;

    return timeline.rentalPayments
      .filter(payment => payment.userId === userId)
      .reduce((total, payment) => total + payment.amount, 0);
  }

  /**
   * Get property current value with appreciation
   */
  getPropertyCurrentValue(propertyId: string): number {
    const timeline = this.timelines.get(propertyId);
    if (!timeline) return 0;

    // Force update appreciation before returning
    this.processAppreciation(timeline);
    return timeline.appreciation.currentValue;
  }

  /**
   * Get rental payment history for a user
   */
  getRentalHistory(propertyId: string, userId: string): RentalIncomePayment[] {
    const timeline = this.timelines.get(propertyId);
    if (!timeline) return [];

    return timeline.rentalPayments
      .filter(payment => payment.userId === userId)
      .sort((a, b) => b.paymentTime - a.paymentTime);
  }

  /**
   * Get property appreciation history
   */
  getAppreciationHistory(propertyId: string): PropertyAppreciation['appreciationHistory'] {
    const timeline = this.timelines.get(propertyId);
    if (!timeline) return [];

    return timeline.appreciation.appreciationHistory;
  }

  /**
   * Get timeline statistics for dashboard
   */
  getTimelineStats(propertyId: string) {
    const timeline = this.timelines.get(propertyId);
    if (!timeline) return null;

    const gameTimeElapsed = this.getGameTimeElapsed(timeline.createdAt);
    const currentGameMonth = this.getGameMonth(gameTimeElapsed);
    const realTimeElapsed = Date.now() - timeline.createdAt;

    return {
      propertyId,
      realTimeElapsed: realTimeElapsed / 1000 / 60, // minutes
      gameTimeElapsed: gameTimeElapsed / 1000 / 60 / 60 / 24, // days
      currentGameMonth,
      totalPurchases: timeline.purchases.length,
      totalRentalPayments: timeline.rentalPayments.length,
      originalValue: timeline.appreciation.originalValue,
      currentValue: timeline.appreciation.currentValue,
      totalAppreciation: timeline.appreciation.currentValue - timeline.appreciation.originalValue,
      appreciationPercentage: ((timeline.appreciation.currentValue / timeline.appreciation.originalValue) - 1) * 100
    };
  }

  /**
   * Save timelines to localStorage
   */
  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.timelines.entries()));
      localStorage.setItem('rentalIncomeTimelines', serialized);
    } catch (error) {
      console.error('Failed to save rental income timelines:', error);
    }
  }

  /**
   * Load timelines from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('rentalIncomeTimelines');
      if (stored) {
        const entries = JSON.parse(stored);
        this.timelines = new Map(entries);
        console.log(`💰 Loaded ${this.timelines.size} rental income timelines from storage`);
      }
    } catch (error) {
      console.error('Failed to load rental income timelines:', error);
      this.timelines = new Map();
    }
  }

  /**
   * Get all user rental income across all properties
   */
  getUserTotalRentalIncome(userId: string): number {
    let total = 0;
    this.timelines.forEach(timeline => {
      total += this.getTotalRentalIncome(timeline.propertyId, userId);
    });
    return total;
  }

  /**
   * Get user's latest rental payments (for notifications)
   */
  getUserRecentRentalPayments(userId: string, limit: number = 5): RentalIncomePayment[] {
    const allPayments: RentalIncomePayment[] = [];
    
    this.timelines.forEach(timeline => {
      const userPayments = timeline.rentalPayments.filter(payment => payment.userId === userId);
      allPayments.push(...userPayments);
    });

    return allPayments
      .sort((a, b) => b.paymentTime - a.paymentTime)
      .slice(0, limit);
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData(): void {
    this.timelines.clear();
    localStorage.removeItem('rentalIncomeTimelines');
    console.log('🗑️ All rental income timeline data cleared');
  }

  /**
   * Stop processing (for cleanup)
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

// Export singleton instance
export const rentalIncomeService = new RentalIncomeService();
export type { PropertyPurchase, RentalIncomePayment, PropertyAppreciation, PropertyTimeline };