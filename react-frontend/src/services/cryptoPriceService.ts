interface PriceData {
  ethToUsd: number;
  usdcToUsd: number;
  ethToUsdc: number;
  lastUpdated: Date;
  gasPrice: number;
}

interface GasFeeEstimate {
  low: number;
  standard: number;
  fast: number;
  estimatedTime: string;
}

export class CryptoPriceService {
  private static readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static priceCache: { data: PriceData | null; timestamp: number } = {
    data: null,
    timestamp: 0,
  };

  static async fetchCurrentPrices(): Promise<PriceData> {
    try {
      const now = Date.now();
      if (this.priceCache.data && (now - this.priceCache.timestamp) < this.CACHE_DURATION) {
        return this.priceCache.data;
      }

      // console.log('Fetching fresh crypto prices from CoinGecko...');

      const response = await fetch(
        `${this.COINGECKO_BASE_URL}/simple/price?ids=ethereum,usd-coin&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      
      const ethToUsd = data.ethereum?.usd || 3000;
      const usdcToUsd = data['usd-coin']?.usd || 1;
      const ethToUsdc = ethToUsd / usdcToUsd;
      const gasPrice = Math.floor(Math.random() * 40) + 10; // 10-50 gwei

      const priceData: PriceData = {
        ethToUsd,
        usdcToUsd,
        ethToUsdc,
        lastUpdated: new Date(),
        gasPrice,
      };

      this.priceCache = { data: priceData, timestamp: now };
      await this.savePricesToFirebase(priceData);
      return priceData;

    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      
      if (this.priceCache.data) {
        console.log('Using cached price data due to API error');
        return this.priceCache.data;
      }

      // Use realistic fallback prices for development
      const fallbackPrices = {
        ethToUsd: 3200, // More realistic current ETH price
        usdcToUsd: 1,
        ethToUsdc: 3200,
        lastUpdated: new Date(),
        gasPrice: 25,
      };
      
      console.log('Using fallback price data:', fallbackPrices);
      this.priceCache = { data: fallbackPrices, timestamp: now };
      await this.savePricesToFirebase(fallbackPrices);
      return fallbackPrices;
    }
  }

  private static async savePricesToFirebase(prices: PriceData): Promise<void> {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      await setDoc(doc(db, 'cryptoPrices', 'current'), {
        ethToUsd: prices.ethToUsd,
        usdcToUsd: prices.usdcToUsd,
        ethToUsdc: prices.ethToUsdc,
        gasPrice: prices.gasPrice,
        lastUpdated: prices.lastUpdated,
      });
    } catch (error) {
      console.error('Error saving prices to Firebase:', error);
    }
  }

  static convertUsdcToEth(usdcAmount: number, prices: PriceData): number {
    return usdcAmount / prices.ethToUsdc;
  }

  static convertEthToUsdc(ethAmount: number, prices: PriceData): number {
    return ethAmount * prices.ethToUsdc;
  }

  static calculateGasFees(transactionType: 'simple' | 'investment' | 'conversion', prices: PriceData): GasFeeEstimate {
    const baseGas = prices.gasPrice;
    const gasUnits = {
      simple: 21000,
      investment: 85000,
      conversion: 65000,
    };

    const units = gasUnits[transactionType];
    
    return {
      low: (baseGas * 0.8 * units) / 1e9,
      standard: (baseGas * units) / 1e9,
      fast: (baseGas * 1.3 * units) / 1e9,
      estimatedTime: baseGas < 20 ? '< 2 min' : baseGas < 40 ? '2-5 min' : '5-10 min',
    };
  }
}

export type { PriceData, GasFeeEstimate };