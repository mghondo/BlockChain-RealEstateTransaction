import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PropertyDetails, PropertyMetadata } from '../../services/contract.service';
import { IPFSService } from '../../services/ipfs.service';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <mat-card class="property-card" [class.loading]="isLoading">
      <div class="image-container">
        <img 
          [src]="imageUrl || '/assets/property-placeholder.jpg'" 
          [alt]="metadata?.name || 'Property'"
          class="property-image"
          (error)="onImageError($event)"
          (load)="onImageLoad()"
        />
        <div class="status-chip">
          <mat-chip [ngClass]="getStatusClass()">
            <mat-icon>{{ getStatusIcon() }}</mat-icon>
            {{ property.currentPhase.name }}
          </mat-chip>
        </div>
        <div class="overlay" *ngIf="isLoading">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        </div>
      </div>

      <mat-card-content class="card-content">
        <div class="property-header">
          <h3 class="property-title">{{ metadata?.name || 'Loading...' }}</h3>
          <div class="price-info">
            <span class="price">{{ formatPrice(property.config.purchasePrice) }}</span>
            <span class="price-label">Total Value</span>
          </div>
        </div>

        <p class="property-description">
          {{ metadata?.description || 'Property description loading...' }}
        </p>

        <div class="property-stats">
          <div class="stat">
            <span class="stat-value">{{ property.totalShares }}</span>
            <span class="stat-label">Total Shares</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ property.availableShares }}</span>
            <span class="stat-label">Available</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getSharePrice() }}</span>
            <span class="stat-label">Per Share</span>
          </div>
        </div>

        <div class="funding-progress">
          <div class="progress-header">
            <span>Funding Progress</span>
            <span>{{ getFundingPercentage() }}%</span>
          </div>
          <mat-progress-bar 
            mode="determinate" 
            [value]="getFundingPercentage()"
            class="funding-bar">
          </mat-progress-bar>
          <div class="funding-amount">
            {{ formatPrice(property.totalEarnestDeposited) }} / {{ formatPrice(property.config.escrowAmount) }}
          </div>
        </div>

        <div class="property-attributes" *ngIf="metadata?.attributes">
          <mat-chip-listbox class="attributes-list">
            <mat-chip-option 
              *ngFor="let attr of getDisplayAttributes()" 
              [disabled]="true"
              class="attribute-chip">
              {{ attr.trait_type }}: {{ attr.value }}
            </mat-chip-option>
          </mat-chip-listbox>
        </div>
      </mat-card-content>

      <mat-card-actions class="card-actions">
        <button 
          mat-raised-button 
          color="primary"
          [routerLink]="['/property', escrowAddress]"
          class="view-details-btn">
          <mat-icon>visibility</mat-icon>
          View Details
        </button>
        
        <button 
          mat-button 
          color="accent"
          *ngIf="canInvest()"
          (click)="onInvestClick()"
          class="invest-btn">
          <mat-icon>account_balance_wallet</mat-icon>
          Invest
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styleUrls: ['./property-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyCardComponent implements OnInit {
  @Input() property!: PropertyDetails;
  @Input() escrowAddress!: string;
  
  metadata?: PropertyMetadata | null;
  imageUrl?: string | null;
  isLoading = true;

  constructor(private ipfsService: IPFSService) {}

  async ngOnInit() {
    await this.loadMetadata();
  }

  private async loadMetadata() {
    try {
      // Get metadata URI from contract - for now using a placeholder
      const metadataUri = `ipfs://QmSampleHash${this.property.config.nftID}`;
      
      this.metadata = await this.ipfsService.getMetadata(metadataUri);
      
      if (this.metadata?.image) {
        this.imageUrl = await this.ipfsService.getOptimizedImageUrl(this.metadata.image, 400);
      }
    } catch (error) {
      console.error('Failed to load property metadata:', error);
    } finally {
      this.isLoading = false;
    }
  }

  formatPrice(price: bigint): string {
    const priceInEther = Number(price) / 1e6; // Assuming USDC (6 decimals)
    return `$${priceInEther.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  getSharePrice(): string {
    const sharePrice = Number(this.property.config.purchasePrice) / (this.property.totalShares * 1e6);
    return `$${sharePrice.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  getFundingPercentage(): number {
    if (this.property.config.escrowAmount === BigInt(0)) return 0;
    
    const percentage = (Number(this.property.totalEarnestDeposited) / Number(this.property.config.escrowAmount)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getStatusClass(): string {
    const phaseId = this.property.currentPhase.id;
    switch (phaseId) {
      case 0: return 'status-initialization';
      case 1: return 'status-inspection';
      case 2: return 'status-approval';
      case 3: return 'status-funding';
      case 4: return 'status-completed';
      case 5: return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  getStatusIcon(): string {
    const phaseId = this.property.currentPhase.id;
    switch (phaseId) {
      case 0: return 'hourglass_empty';
      case 1: return 'search';
      case 2: return 'thumb_up';
      case 3: return 'account_balance';
      case 4: return 'check_circle';
      case 5: return 'cancel';
      default: return 'help';
    }
  }

  getDisplayAttributes(): Array<{trait_type: string, value: string | number}> {
    if (!this.metadata?.attributes) return [];
    
    // Show only first 3 most relevant attributes
    return this.metadata.attributes.slice(0, 3);
  }

  canInvest(): boolean {
    return this.property.currentPhase.id === 0 && this.property.availableShares > 0;
  }

  onInvestClick() {
    // This would typically open an investment modal or navigate to investment page
    console.log('Invest clicked for property:', this.escrowAddress);
  }

  onImageError(event: any) {
    console.warn('Failed to load property image:', event);
    event.target.src = '/assets/property-placeholder.jpg';
  }

  onImageLoad() {
    this.isLoading = false;
  }
}