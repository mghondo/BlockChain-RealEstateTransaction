import { RentalIncomeService } from './rentalIncomeService';

export class RentalIncomeProcessor {
  private static processingInterval: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  // Start automatic rental income processing
  static startProcessing(userId: string): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    console.log('Starting rental income processor for user:', userId);

    // Process rental income every 2 real hours (1 game month)
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing) return;

      this.isProcessing = true;
      try {
        await this.processCurrentRentals(userId);
      } catch (error) {
        console.error('Error in rental income processing:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 2 * 60 * 60 * 1000); // 2 hours = 1 game month
  }

  // Stop automatic processing
  static stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('Stopped rental income processor');
  }

  // Process current rentals for a user
  private static async processCurrentRentals(userId: string): Promise<void> {
    try {
      const currentGameTime = new Date(); // This should come from game time service
      const income = await RentalIncomeService.processUserRentalIncome(userId, currentGameTime);
      
      if (income > 0) {
        console.log(`Processed ${income} rental income for user ${userId}`);
        
        // Dispatch custom event to notify UI components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('rentalIncomeProcessed', {
            detail: { userId, amount: income, gameTime: currentGameTime }
          }));
        }
      }
    } catch (error) {
      console.error('Error processing current rentals:', error);
    }
  }

  // Manual trigger for rental processing (useful for testing)
  static async triggerManualProcessing(userId: string, gameTime: Date): Promise<number> {
    try {
      console.log('Manually triggering rental processing...');
      const income = await RentalIncomeService.processUserRentalIncome(userId, gameTime);
      
      if (income > 0 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rentalIncomeProcessed', {
          detail: { userId, amount: income, gameTime }
        }));
      }
      
      return income;
    } catch (error) {
      console.error('Error in manual rental processing:', error);
      return 0;
    }
  }
}