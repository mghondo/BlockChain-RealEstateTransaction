import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry, switchMap, timeout, map } from 'rxjs/operators';
import { PropertyMetadata } from './contract.service';

export interface IPFSUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  hash?: string;
  error?: string;
  pinned: boolean;
}

export interface ERC1155Metadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  background_color?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  properties: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    yearBuilt: number;
    lotSize?: number;
    amenities: string[];
    legalDescription: string;
  };
}

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
  
  private uploadProgressSubject = new BehaviorSubject<IPFSUploadProgress[]>([]);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

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

  // Advanced upload functionality
  async uploadFile(file: File): Promise<string> {
    const uploadProgress: IPFSUploadProgress = {
      file,
      progress: 0,
      status: 'pending',
      pinned: false
    };

    const currentUploads = this.uploadProgressSubject.value;
    this.uploadProgressSubject.next([...currentUploads, uploadProgress]);

    try {
      // Compress image if needed
      const processedFile = await this.processImage(file);
      
      uploadProgress.status = 'uploading';
      uploadProgress.progress = 10;
      this.updateProgress(uploadProgress);

      // Simulate upload to Pinata (replace with actual API)
      const hash = await this.mockUploadToPinata(processedFile, uploadProgress);
      
      uploadProgress.hash = hash;
      uploadProgress.status = 'completed';
      uploadProgress.progress = 100;
      uploadProgress.pinned = true;
      this.updateProgress(uploadProgress);

      return hash;

    } catch (error: any) {
      uploadProgress.status = 'error';
      uploadProgress.error = error.message;
      this.updateProgress(uploadProgress);
      throw error;
    }
  }

  async uploadMetadata(metadata: ERC1155Metadata): Promise<string> {
    try {
      // Validate metadata schema
      this.validateERC1155Metadata(metadata);

      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      });
      
      const metadataFile = new File([metadataBlob], 'metadata.json', {
        type: 'application/json'
      });

      return await this.uploadFile(metadataFile);

    } catch (error: any) {
      throw new Error(`Metadata upload failed: ${error.message}`);
    }
  }

  private async processImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Resize if larger than 2048px
        const maxSize = 2048;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private async mockUploadToPinata(file: File, progress: IPFSUploadProgress): Promise<string> {
    // Mock implementation for development
    const progressInterval = setInterval(() => {
      if (progress.progress < 90) {
        progress.progress += 10;
        this.updateProgress(progress);
      }
    }, 200);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock hash based on file content
      const mockHash = 'Qm' + Math.random().toString(36).substring(2, 46);
      
      clearInterval(progressInterval);
      return mockHash;

    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  private validateERC1155Metadata(metadata: ERC1155Metadata): void {
    const required = ['name', 'description', 'image'];
    
    for (const field of required) {
      if (!metadata[field as keyof ERC1155Metadata]) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }

    if (!Array.isArray(metadata.attributes)) {
      throw new Error('Attributes must be an array');
    }

    if (!metadata.properties) {
      throw new Error('Properties object is required');
    }

    // Validate property schema
    const requiredProps = ['address', 'city', 'state', 'propertyType'];
    for (const prop of requiredProps) {
      if (!metadata.properties[prop as keyof typeof metadata.properties]) {
        throw new Error(`Required property '${prop}' is missing`);
      }
    }
  }

  private updateProgress(progress: IPFSUploadProgress): void {
    const currentUploads = this.uploadProgressSubject.value;
    const index = currentUploads.findIndex(u => u.file === progress.file);
    
    if (index >= 0) {
      currentUploads[index] = progress;
      this.uploadProgressSubject.next([...currentUploads]);
    }
  }

  createERC1155MetadataTemplate(propertyData: any): ERC1155Metadata {
    return {
      name: propertyData.name || 'Fractional Real Estate Property',
      description: propertyData.description || 'Tokenized real estate investment opportunity',
      image: propertyData.imageHash ? this.getIPFSUrl(propertyData.imageHash) : '',
      external_url: propertyData.externalUrl,
      background_color: 'f8fafc',
      attributes: [
        {
          trait_type: 'Property Type',
          value: propertyData.propertyType || 'Residential'
        },
        {
          trait_type: 'Bedrooms',
          value: propertyData.bedrooms || 0,
          display_type: 'number'
        },
        {
          trait_type: 'Bathrooms',
          value: propertyData.bathrooms || 0,
          display_type: 'number'
        },
        {
          trait_type: 'Square Feet',
          value: propertyData.squareFeet || 0,
          display_type: 'number'
        },
        {
          trait_type: 'Year Built',
          value: propertyData.yearBuilt || new Date().getFullYear(),
          display_type: 'date'
        },
        {
          trait_type: 'City',
          value: propertyData.city || ''
        },
        {
          trait_type: 'State',
          value: propertyData.state || ''
        }
      ],
      properties: {
        address: propertyData.address || '',
        city: propertyData.city || '',
        state: propertyData.state || '',
        zipCode: propertyData.zipCode || '',
        propertyType: propertyData.propertyType || 'Residential',
        bedrooms: propertyData.bedrooms || 0,
        bathrooms: propertyData.bathrooms || 0,
        squareFeet: propertyData.squareFeet || 0,
        yearBuilt: propertyData.yearBuilt || new Date().getFullYear(),
        lotSize: propertyData.lotSize,
        amenities: propertyData.amenities || [],
        legalDescription: propertyData.legalDescription || ''
      }
    };
  }

  private getIPFSUrl(hash: string): string {
    return `${this.gateways[0].url}${hash}`;
  }

  clearUploadHistory(): void {
    this.uploadProgressSubject.next([]);
  }

  getUploadHistory(): IPFSUploadProgress[] {
    return this.uploadProgressSubject.value;
  }

  async verifyHash(hash: string): Promise<boolean> {
    try {
      const response = await fetch(this.getIPFSUrl(hash), { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}