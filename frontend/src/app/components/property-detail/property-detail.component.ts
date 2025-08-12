import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PropertyDetails, PropertyMetadata, ContractService } from '../../services/contract.service';
import { IPFSService } from '../../services/ipfs.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="property-detail-container" *ngIf="property; else loadingTemplate">
      <!-- Back Button -->
      <div class="back-navigation">
        <button mat-button (click)="goBack()" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
          Back to Properties
        </button>
      </div>

      <!-- Property Header -->
      <div class="property-header">
        <div class="header-content">
          <div class="title-section">
            <h1>{{ metadata?.name || 'Property Details' }}</h1>
            <div class="status-chip">
              <mat-chip [ngClass]="getStatusClass()">
                <mat-icon>{{ getStatusIcon() }}</mat-icon>
                {{ property.currentPhase.name }}
              </mat-chip>
            </div>
          </div>
          
          <div class="key-metrics">
            <div class="metric">
              <span class="metric-value">{{ formatPrice(property.config.purchasePrice) }}</span>
              <span class="metric-label">Total Value</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ getSharePrice() }}</span>
              <span class="metric-label">Per Share</span>
            </div>
            <div class="metric">
              <span class="metric-value">{{ property.availableShares }}</span>
              <span class="metric-label">Available Shares</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Image Gallery -->
          <mat-card class="image-gallery">
            <div class="main-image">
              <img 
                [src]="mainImageUrl || '/assets/property-placeholder.jpg'" 
                [alt]="metadata?.name || 'Property'"
                (error)="onImageError($event)">
            </div>
          </mat-card>

          <!-- Property Description -->
          <mat-card class="description-card">
            <mat-card-header>
              <mat-card-title>About This Property</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>{{ metadata?.description || 'Property description loading...' }}</p>
              
              <div class="attributes-section" *ngIf="metadata?.attributes">
                <h4>Property Features</h4>
                <mat-chip-listbox class="attributes-list">
                  <mat-chip-option 
                    *ngFor="let attr of metadata?.attributes || []" 
                    [disabled]="true"
                    class="attribute-chip">
                    <strong>{{ attr.trait_type }}:</strong> {{ attr.value }}
                  </mat-chip-option>
                </mat-chip-listbox>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Contract Details -->
          <mat-card class="contract-details">
            <mat-card-header>
              <mat-card-title>Contract Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="contract-info">
                <div class="info-row">
                  <span class="label">Escrow Address:</span>
                  <span class="value">{{ escrowAddress }}</span>
                </div>
                <div class="info-row">
                  <span class="label">NFT Address:</span>
                  <span class="value">{{ property.config.nftAddress }}</span>
                </div>
                <div class="info-row">
                  <span class="label">NFT Token ID:</span>
                  <span class="value">{{ property.config.nftID }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Seller:</span>
                  <span class="value">{{ property.config.seller }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Inspector:</span>
                  <span class="value">{{ property.config.inspector }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Lender:</span>
                  <span class="value">{{ property.config.lender }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Right Column -->
        <div class="right-column">
          <!-- Investment Card -->
          <mat-card class="investment-card">
            <mat-card-header>
              <mat-card-title>Investment Details</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <!-- Funding Progress -->
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
                <div class="funding-details">
                  <span>{{ formatPrice(property.totalEarnestDeposited) }} raised</span>
                  <span>{{ formatPrice(property.config.escrowAmount) }} goal</span>
                </div>
              </div>

              <!-- User Investment Info -->
              <div class="user-investment" *ngIf="userShares > 0">
                <h4>Your Investment</h4>
                <div class="investment-stats">
                  <div class="stat">
                    <span class="stat-value">{{ userShares }}</span>
                    <span class="stat-label">Your Shares</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{{ getUserInvestmentValue() }}</span>
                    <span class="stat-label">Investment Value</span>
                  </div>
                  <div class="stat">
                    <span class="stat-value">{{ getUserOwnershipPercentage() }}%</span>
                    <span class="stat-label">Ownership</span>
                  </div>
                </div>
              </div>

              <!-- Investment Options -->
              <div class="investment-options" *ngIf="canInvest()">
                <h4>Invest in This Property</h4>
                
                <!-- Quick Investment Form -->
                <div class="quick-invest">
                  <mat-form-field appearance="outline" class="shares-input">
                    <mat-label>Number of Shares</mat-label>
                    <input matInput 
                           type="number" 
                           [(ngModel)]="investmentShares"
                           [min]="1" 
                           [max]="property.availableShares"
                           placeholder="Enter shares to purchase">
                    <mat-hint>{{ getInvestmentAmount() }} total</mat-hint>
                  </mat-form-field>

                  <div class="investment-buttons">
                    <button mat-raised-button 
                            color="primary" 
                            [disabled]="!canSubmitInvestment()"
                            (click)="startInvestmentWizard()"
                            class="invest-wizard-btn">
                      <mat-icon>trending_up</mat-icon>
                      Start Investment Wizard
                    </button>
                    
                    <button mat-stroked-button 
                            color="primary" 
                            [disabled]="!canSubmitInvestment()"
                            (click)="investInProperty()"
                            class="quick-invest-btn">
                      <mat-icon>account_balance_wallet</mat-icon>
                      Quick Invest {{ getInvestmentAmount() }}
                    </button>
                  </div>
                </div>

                <!-- Investment Benefits -->
                <div class="investment-benefits">
                  <div class="benefit-item">
                    <mat-icon>calculate</mat-icon>
                    <span>Use Investment Wizard for detailed calculations and cross-chain options</span>
                  </div>
                  <div class="benefit-item">
                    <mat-icon>swap_horiz</mat-icon>
                    <span>Bridge USDC from Polygon for lower gas fees</span>
                  </div>
                  <div class="benefit-item">
                    <mat-icon>timeline</mat-icon>
                    <span>Real-time transaction tracking and status updates</span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons for Different Roles -->
              <div class="role-actions" *ngIf="hasRoleActions()">
                <h4>Available Actions</h4>
                
                <!-- Inspector Actions -->
                <div class="inspector-actions" *ngIf="isInspector()">
                  <button mat-button 
                          color="accent"
                          (click)="updateInspection(true)"
                          *ngIf="property.currentPhase.id === 1">
                    <mat-icon>check_circle</mat-icon>
                    Pass Inspection
                  </button>
                  <button mat-button 
                          color="warn"
                          (click)="updateInspection(false)"
                          *ngIf="property.currentPhase.id === 1">
                    <mat-icon>cancel</mat-icon>
                    Fail Inspection
                  </button>
                </div>

                <!-- Approval Actions -->
                <div class="approval-actions" *ngIf="canApprove()">
                  <button mat-button 
                          color="primary"
                          (click)="approveTransaction()"
                          *ngIf="property.currentPhase.id === 1">
                    <mat-icon>thumb_up</mat-icon>
                    Approve Transaction
                  </button>
                </div>

                <!-- Finalization Actions -->
                <div class="finalization-actions" *ngIf="canFinalize()">
                  <button mat-raised-button 
                          color="primary"
                          (click)="finalizeSale()"
                          *ngIf="property.currentPhase.id === 3">
                    <mat-icon>gavel</mat-icon>
                    Finalize Sale
                  </button>
                  <button mat-button 
                          color="warn"
                          (click)="cancelSale()">
                    <mat-icon>cancel</mat-icon>
                    Cancel Sale
                  </button>
                </div>
              </div>

              <!-- Timelock Status -->
              <div class="timelock-status" *ngIf="timelockStatus">
                <h4>Pending Action</h4>
                <div class="timelock-info">
                  <mat-icon>schedule</mat-icon>
                  <span>Action will be available {{ getTimelockTimeRemaining() }}</span>
                </div>
                <mat-progress-bar mode="determinate" [value]="getTimelockProgress()"></mat-progress-bar>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Transaction History -->
          <mat-card class="history-card">
            <mat-card-header>
              <mat-card-title>Recent Activity</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="activity-list">
                <div class="activity-item" *ngFor="let activity of recentActivity">
                  <mat-icon [ngClass]="activity.type">{{ getActivityIcon(activity.type) }}</mat-icon>
                  <div class="activity-content">
                    <span class="activity-text">{{ activity.description }}</span>
                    <span class="activity-time">{{ activity.timestamp | date:'short' }}</span>
                  </div>
                </div>
                
                <div class="no-activity" *ngIf="recentActivity.length === 0">
                  <mat-icon>history</mat-icon>
                  <span>No recent activity</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>

    <!-- Loading Template -->
    <ng-template #loadingTemplate>
      <div class="loading-container">
        <mat-progress-spinner diameter="60" mode="indeterminate"></mat-progress-spinner>
        <p>Loading property details...</p>
      </div>
    </ng-template>
  `,
  styleUrls: ['./property-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  escrowAddress: string = '';
  property?: PropertyDetails | null;
  metadata?: PropertyMetadata | null;
  mainImageUrl?: string | null;
  userShares = 0;
  investmentShares = 1;
  timelockStatus?: {isPending: boolean, executeAfter: bigint} | null;
  recentActivity: Array<{type: string, description: string, timestamp: Date}> = [];
  currentUserAddress?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contractService: ContractService,
    private ipfsService: IPFSService,
    private walletService: WalletService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.escrowAddress = params['address'];
      this.loadPropertyDetails();
    });

    this.walletService.accountChanged$.pipe(takeUntil(this.destroy$)).subscribe(account => {
      this.currentUserAddress = account || undefined;
      if (account) {
        this.loadUserShares();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadPropertyDetails() {
    try {
      this.property = await this.contractService.getPropertyDetails(this.escrowAddress);
      if (!this.property) {
        this.router.navigate(['/properties']);
        return;
      }

      await this.loadMetadata();
      await this.loadTimelockStatus();
      this.loadUserShares();
      
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to load property details:', error);
      this.snackBar.open('Failed to load property details', 'Close', { duration: 5000 });
    }
  }

  private async loadMetadata() {
    if (!this.property) return;

    try {
      // In a real app, you'd get the metadata URI from the contract
      const metadataUri = `ipfs://QmSampleHash${this.property.config.nftID}`;
      
      this.metadata = await this.ipfsService.getMetadata(metadataUri);
      
      if (this.metadata?.image) {
        this.mainImageUrl = await this.ipfsService.getOptimizedImageUrl(this.metadata.image, 800);
      }
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  }

  private async loadTimelockStatus() {
    if (!this.escrowAddress) return;

    try {
      this.timelockStatus = await this.contractService.getTimelockStatus(this.escrowAddress, 'FINALIZE_SALE');
    } catch (error) {
      console.error('Failed to load timelock status:', error);
    }
  }

  private async loadUserShares() {
    if (!this.currentUserAddress || !this.escrowAddress) return;

    try {
      const shares = await this.contractService.getUserShares(this.escrowAddress, this.currentUserAddress);
      this.userShares = Number(shares);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to load user shares:', error);
    }
  }

  // Investment methods
  startInvestmentWizard() {
    if (!this.canSubmitInvestment() || !this.property) return;
    
    // Navigate to investment wizard with property address
    this.router.navigate(['/invest', this.escrowAddress], {
      queryParams: {
        shares: this.investmentShares,
        amount: this.getInvestmentAmount().replace('$', '').replace(',', '')
      }
    });
  }

  async investInProperty() {
    if (!this.canSubmitInvestment() || !this.property) return;

    try {
      const amount = BigInt(this.investmentShares) * this.property.config.escrowAmount / BigInt(100);
      
      const investment$ = await this.contractService.depositEarnest(this.escrowAddress, Number(amount));
      
      investment$.pipe(takeUntil(this.destroy$)).subscribe({
        next: (tx: any) => {
          this.snackBar.open('Investment transaction submitted!', 'Close', { duration: 5000 });
          // Reload property details after successful investment
          setTimeout(() => this.loadPropertyDetails(), 2000);
        },
        error: (error: any) => {
          console.error('Investment failed:', error);
          this.snackBar.open('Investment failed. Please try again.', 'Close', { duration: 5000 });
        }
      });

    } catch (error) {
      console.error('Failed to invest:', error);
      this.snackBar.open('Failed to submit investment', 'Close', { duration: 5000 });
    }
  }

  // Role-based actions
  async updateInspection(passed: boolean) {
    try {
      const update$ = await this.contractService.updateInspection(this.escrowAddress, passed);
      
      update$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open(`Inspection ${passed ? 'passed' : 'failed'} successfully!`, 'Close', { duration: 5000 });
          this.loadPropertyDetails();
        },
        error: (error: any) => {
          console.error('Failed to update inspection:', error);
          this.snackBar.open('Failed to update inspection status', 'Close', { duration: 5000 });
        }
      });
    } catch (error) {
      console.error('Failed to update inspection:', error);
    }
  }

  async approveTransaction() {
    try {
      const role = this.getUserRole();
      if (!role) return;

      const approval$ = await this.contractService.approveRole(this.escrowAddress, role);
      
      approval$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Transaction approved successfully!', 'Close', { duration: 5000 });
          this.loadPropertyDetails();
        },
        error: (error: any) => {
          console.error('Failed to approve transaction:', error);
          this.snackBar.open('Failed to approve transaction', 'Close', { duration: 5000 });
        }
      });
    } catch (error) {
      console.error('Failed to approve transaction:', error);
    }
  }

  async finalizeSale() {
    try {
      const finalize$ = await this.contractService.finalizeSale(this.escrowAddress);
      
      finalize$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Sale finalized successfully!', 'Close', { duration: 5000 });
          this.loadPropertyDetails();
        },
        error: (error: any) => {
          console.error('Failed to finalize sale:', error);
          this.snackBar.open('Failed to finalize sale', 'Close', { duration: 5000 });
        }
      });
    } catch (error) {
      console.error('Failed to finalize sale:', error);
    }
  }

  async cancelSale() {
    try {
      const cancel$ = await this.contractService.cancelSale(this.escrowAddress);
      
      cancel$.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Sale cancelled successfully!', 'Close', { duration: 5000 });
          this.loadPropertyDetails();
        },
        error: (error: any) => {
          console.error('Failed to cancel sale:', error);
          this.snackBar.open('Failed to cancel sale', 'Close', { duration: 5000 });
        }
      });
    } catch (error) {
      console.error('Failed to cancel sale:', error);
    }
  }

  // Utility methods
  formatPrice(price: bigint): string {
    const priceInEther = Number(price) / 1e6;
    return `$${priceInEther.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  getSharePrice(): string {
    if (!this.property) return '$0';
    const sharePrice = Number(this.property.config.purchasePrice) / (this.property.totalShares * 1e6);
    return `$${sharePrice.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  getFundingPercentage(): number {
    if (!this.property || this.property.config.escrowAmount === BigInt(0)) return 0;
    
    const percentage = (Number(this.property.totalEarnestDeposited) / Number(this.property.config.escrowAmount)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getInvestmentAmount(): string {
    if (!this.property) return '$0';
    const amount = BigInt(this.investmentShares) * this.property.config.escrowAmount / BigInt(100);
    return this.formatPrice(amount);
  }

  getUserInvestmentValue(): string {
    if (!this.property) return '$0';
    const value = BigInt(this.userShares) * this.property.config.purchasePrice / BigInt(100);
    return this.formatPrice(value);
  }

  getUserOwnershipPercentage(): string {
    const totalShares = this.property?.totalShares || 1;
    return (this.userShares / totalShares * 100 || 0).toFixed(1);
  }

  getStatusClass(): string {
    if (!this.property) return 'status-unknown';
    
    const phaseId = this.property.currentPhase.id;
    const statusClasses = ['status-initialization', 'status-inspection', 'status-approval', 'status-funding', 'status-completed', 'status-cancelled'];
    return statusClasses[phaseId] || 'status-unknown';
  }

  getStatusIcon(): string {
    if (!this.property) return 'help';
    
    const phaseId = this.property.currentPhase.id;
    const icons = ['hourglass_empty', 'search', 'thumb_up', 'account_balance', 'check_circle', 'cancel'];
    return icons[phaseId] || 'help';
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      'investment': 'account_balance_wallet',
      'inspection': 'search',
      'approval': 'thumb_up',
      'finalization': 'gavel',
      'cancellation': 'cancel'
    };
    return icons[type] || 'info';
  }

  getTimelockTimeRemaining(): string {
    if (!this.timelockStatus?.isPending) return '';
    
    const now = Date.now() / 1000;
    const executeAfter = Number(this.timelockStatus.executeAfter);
    const remaining = executeAfter - now;
    
    if (remaining <= 0) return 'now';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    return `in ${hours}h ${minutes}m`;
  }

  getTimelockProgress(): number {
    if (!this.timelockStatus?.isPending) return 0;
    
    const now = Date.now() / 1000;
    const executeAfter = Number(this.timelockStatus.executeAfter);
    const delay = 24 * 60 * 60; // 24 hours
    const elapsed = now - (executeAfter - delay);
    
    return Math.min(Math.max((elapsed / delay) * 100, 0), 100);
  }

  // Permission checks
  canInvest(): boolean {
    return this.property?.currentPhase.id === 0 && 
           this.property?.availableShares > 0 &&
           !!this.currentUserAddress;
  }

  canSubmitInvestment(): boolean {
    return this.investmentShares > 0 && 
           this.investmentShares <= (this.property?.availableShares || 0) &&
           this.canInvest();
  }

  hasRoleActions(): boolean {
    return this.isInspector() || this.canApprove() || this.canFinalize();
  }

  isInspector(): boolean {
    return this.currentUserAddress === this.property?.config.inspector;
  }

  canApprove(): boolean {
    if (!this.currentUserAddress || !this.property) return false;
    
    return this.currentUserAddress === this.property.config.seller ||
           this.currentUserAddress === this.property.config.lender ||
           this.userShares > 0;
  }

  canFinalize(): boolean {
    return this.property?.currentPhase.id === 3;
  }

  getUserRole(): string | null {
    if (!this.currentUserAddress || !this.property) return null;
    
    if (this.currentUserAddress === this.property.config.seller) return 'seller';
    if (this.currentUserAddress === this.property.config.inspector) return 'inspector';
    if (this.currentUserAddress === this.property.config.lender) return 'lender';
    if (this.userShares > 0) return 'buyer';
    
    return null;
  }

  goBack() {
    this.router.navigate(['/properties']);
  }

  onImageError(event: any) {
    event.target.src = '/assets/property-placeholder.jpg';
  }
}