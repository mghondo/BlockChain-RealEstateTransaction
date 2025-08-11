import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, retry, switchMap, timeout, map } from 'rxjs/operators';
import { PropertyMetadata } from './contract.service';

export interface IPFSGateway {
  name: string;
  url: string;
  timeout: number;
}

@Injectable({
  providedIn: 'root'
})
export class IPFSService {
  private readonly gateways: IPFSGateway[] = [
    {
      name: 'Pinata',
      url: 'https://gateway.pinata.cloud/ipfs/',
      timeout: 10000
    },
    {
      name: 'IPFS.io',
      url: 'https://ipfs.io/ipfs/',
      timeout: 15000
    },
    {
      name: 'Cloudflare',
      url: 'https://cloudflare-ipfs.com/ipfs/',
      timeout: 10000
    },
    {
      name: 'Dweb.link',
      url: 'https://dweb.link/ipfs/',
      timeout: 12000
    }
  ];

  private metadataCache = new Map<string, PropertyMetadata>();
  private imageCache = new Map<string, string>();
  private failedGateways = new Set<string>();

  constructor(private http: HttpClient) {}

  extractIPFSHash(uri: string): string | null {
    if (!uri) return null;

    // Handle different IPFS URI formats
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', '');
    }
    
    if (uri.includes('/ipfs/')) {
      const parts = uri.split('/ipfs/');
      return parts[1]?.split('/')[0] || null;
    }
    
    // Check if it's already a hash
    const ipfsHashRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    if (ipfsHashRegex.test(uri)) {
      return uri;
    }

    return null;
  }

  async getMetadata(uri: string): Promise<PropertyMetadata | null> {
    const hash = this.extractIPFSHash(uri);
    if (!hash) {
      console.error('Invalid IPFS URI:', uri);
      return null;
    }

    // Check cache first
    if (this.metadataCache.has(hash)) {
      return this.metadataCache.get(hash)!;
    }

    try {
      const metadata = await this.fetchWithFallback<PropertyMetadata>(hash);
      if (metadata && this.isValidMetadata(metadata)) {
        this.metadataCache.set(hash, metadata);
        return metadata;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      return null;
    }
  }

  async getOptimizedImageUrl(imageUri: string, maxWidth: number = 800): Promise<string | null> {
    const hash = this.extractIPFSHash(imageUri);
    if (!hash) return null;

    const cacheKey = `${hash}-${maxWidth}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    try {
      // Try to get the image URL from working gateways
      const workingGateway = await this.findWorkingGateway(hash, 'image');
      if (workingGateway) {
        const imageUrl = `${workingGateway.url}${hash}`;
        this.imageCache.set(cacheKey, imageUrl);
        return imageUrl;
      }
      return null;
    } catch (error) {
      console.error('Failed to get optimized image URL:', error);
      return null;
    }
  }

  private async fetchWithFallback<T>(hash: string): Promise<T | null> {
    const workingGateway = await this.findWorkingGateway(hash, 'json');
    
    if (!workingGateway) {
      throw new Error('No working IPFS gateways available');
    }

    const url = `${workingGateway.url}${hash}`;
    
    try {
      const response = await this.http.get<T>(url)
        .pipe(
          timeout(workingGateway.timeout),
          retry(2),
          catchError(this.handleError)
        ).toPromise();
        
      return response || null;
    } catch (error) {
      console.error(`Failed to fetch from ${workingGateway.name}:`, error);
      this.failedGateways.add(workingGateway.url);
      throw error;
    }
  }

  private async findWorkingGateway(hash: string, contentType: 'json' | 'image' = 'json'): Promise<IPFSGateway | null> {
    // Filter out failed gateways and sort by timeout (faster first)
    const availableGateways = this.gateways
      .filter(gateway => !this.failedGateways.has(gateway.url))
      .sort((a, b) => a.timeout - b.timeout);

    for (const gateway of availableGateways) {
      try {
        const testUrl = `${gateway.url}${hash}`;
        const isWorking = await this.testGateway(testUrl, gateway.timeout, contentType);
        
        if (isWorking) {
          return gateway;
        }
      } catch (error) {
        console.warn(`Gateway ${gateway.name} failed:`, error);
        this.failedGateways.add(gateway.url);
      }
    }

    // If all gateways failed, clear the failed list and try again once
    if (availableGateways.length === 0 && this.failedGateways.size > 0) {
      console.log('All gateways failed, clearing failed list and retrying...');
      this.failedGateways.clear();
      return this.findWorkingGateway(hash, contentType);
    }

    return null;
  }

  private async testGateway(url: string, timeoutMs: number, contentType: 'json' | 'image'): Promise<boolean> {
    try {
      if (contentType === 'image') {
        // For images, just try to fetch headers
        const response = await this.http.head(url)
          .pipe(
            timeout(timeoutMs),
            catchError(() => of(null))
          ).toPromise();
        return response !== null;
      } else {
        // For JSON, try to fetch a small part of the content
        const response = await this.http.get(url, { 
          headers: { 'Range': 'bytes=0-1023' },
          responseType: 'text'
        })
          .pipe(
            timeout(timeoutMs),
            catchError(() => of(null))
          ).toPromise();
        
        return response !== null && response !== undefined && response.length > 0;
      }
    } catch (error) {
      return false;
    }
  }

  private isValidMetadata(metadata: any): metadata is PropertyMetadata {
    return (
      typeof metadata === 'object' &&
      metadata !== null &&
      typeof metadata.name === 'string' &&
      typeof metadata.description === 'string' &&
      typeof metadata.image === 'string' &&
      Array.isArray(metadata.attributes)
    );
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'An error occurred while fetching IPFS content';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server error (${error.status}): ${error.message}`;
    }
    
    console.error('IPFS Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  // Preload images for better UX
  preloadImage(imageUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imageUrl;
    });
  }

  // Batch preload multiple images
  async preloadImages(imageUrls: string[]): Promise<boolean[]> {
    const preloadPromises = imageUrls.map(url => this.preloadImage(url));
    return Promise.all(preloadPromises);
  }

  // Clear caches
  clearCache() {
    this.metadataCache.clear();
    this.imageCache.clear();
  }

  // Clear failed gateways list
  resetGateways() {
    this.failedGateways.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      metadataEntries: this.metadataCache.size,
      imageEntries: this.imageCache.size,
      failedGateways: Array.from(this.failedGateways)
    };
  }

  // Utility method to validate IPFS hash format
  isValidIPFSHash(hash: string): boolean {
    const ipfsHashRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    return ipfsHashRegex.test(hash);
  }
}