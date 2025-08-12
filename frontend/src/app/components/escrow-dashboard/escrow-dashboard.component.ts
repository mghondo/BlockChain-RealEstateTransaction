import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { BlockchainEventsService, EscrowPhase, TimelockAction } from '../../services/blockchain-events-simple.service';
import { Web3Service } from '../../services/web3.service';
import { ContractService } from '../../services/contract.service';

import { PhaseIndicatorComponent } from '../phase-indicator/phase-indicator.component';
import { TimelockCountdownComponent } from '../timelock-countdown/timelock-countdown.component';

export interface EscrowSummary {
  address: string;
  propertyId: string;
  propertyTitle: string;
  purchasePrice: number;
  escrowAmount: number;
  userRole: string[];
  phase: EscrowPhase;
  timelockActions: { [actionType: string]: TimelockAction };
  yieldBalance: number;
  lastActivity: number;
  isActive: boolean;
}

@Component({
  selector: 'app-escrow-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PhaseIndicatorComponent,
    TimelockCountdownComponent
  ],
  template: `
    <div class="escrow-dashboard">
      <div class="dashboard-header">
        <div class="header-content">
          <h1>Escrow Dashboard</h1>
          <p class="subtitle">Manage your real estate transactions</p>
        </div>
        <div class="header-stats">
          <div class="stat-card">
            <span class="stat-value">{{ escrows.length }}</span>
            <span class="stat-label">Total Escrows</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getActiveEscrowsCount() }}</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">\${{ getTotalValue() | number:'1.2-2' }}</span>
            <span class="stat-label">Total Value</span>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-options">
          <button 
            class="filter-btn"
            [class.active]="activeFilter === 'all'"
            (click)="setFilter('all')">
            All Escrows
          </button>
          <button 
            class="filter-btn"
            [class.active]="activeFilter === 'active'"
            (click)="setFilter('active')">
            Active
          </button>
          <button 
            class="filter-btn"
            [class.active]="activeFilter === 'completed'"
            (click)="setFilter('completed')">
            Completed
          </button>
          <button 
            class="filter-btn"
            [class.active]="activeFilter === 'cancelled'"
            (click)="setFilter('cancelled')">
            Cancelled
          </button>
        </div>

        <div class="view-options">
          <button 
            class="view-btn"
            [class.active]="viewMode === 'cards'"
            (click)="setViewMode('cards')">
            📋
          </button>
          <button 
            class="view-btn"
            [class.active]="viewMode === 'list'"
            (click)="setViewMode('list')">
            📄
          </button>
        </div>
      </div>

      <div class="escrows-container" *ngIf="filteredEscrows.length > 0; else noEscrows">
        <div class="escrows-grid" [class.list-view]="viewMode === 'list'">
          <div 
            *ngFor="let escrow of filteredEscrows; trackBy: trackByAddress"
            class="escrow-card"
            [class.has-timelock]="hasActiveTimelock(escrow)">
            
            <div class="card-header">
              <div class="property-info">
                <h3>{{ escrow.propertyTitle }}</h3>
                <span class="property-id">ID: {{ escrow.propertyId }}</span>
              </div>
              <div class="roles-badge">
                <span 
                  *ngFor="let role of escrow.userRole" 
                  class="role-tag"
                  [class]="'role-' + role.toLowerCase()">
                  {{ role }}
                </span>
              </div>
            </div>

            <div class="card-body">
              <div class="property-details">
                <div class="detail-item">
                  <span class="label">Purchase Price:</span>
                  <span class="value">\${{ escrow.purchasePrice | number:'1.2-2' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Escrow Amount:</span>
                  <span class="value">\${{ escrow.escrowAmount | number:'1.2-2' }}</span>
                </div>
                <div class="detail-item" *ngIf="escrow.yieldBalance > 0">
                  <span class="label">Yield Earned:</span>
                  <span class="value yield">\${{ escrow.yieldBalance | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="phase-section">
                <app-phase-indicator 
                  [currentPhase]="escrow.phase"
                  [showActions]="false"
                  [compact]="viewMode === 'list'">
                </app-phase-indicator>
              </div>

              <div class="timelock-section" *ngIf="hasActiveTimelock(escrow)">
                <app-timelock-countdown
                  [timelock]="getActiveTimelock(escrow)"
                  [compact]="true"
                  [showExecuteButton]="false">
                </app-timelock-countdown>
              </div>
            </div>

            <div class="card-footer">
              <div class="last-activity">
                <span class="activity-label">Last Activity:</span>
                <span class="activity-time">{{ formatLastActivity(escrow.lastActivity) }}</span>
              </div>
              <div class="card-actions">
                <button 
                  class="action-btn secondary"
                  [routerLink]="['/escrow', escrow.address]">
                  View Details
                </button>
                <button 
                  class="action-btn primary"
                  [routerLink]="['/escrow', escrow.address, 'actions']"
                  *ngIf="escrow.isActive">
                  Manage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ng-template #noEscrows>
        <div class="no-escrows">
          <div class="no-escrows-icon">🏠</div>
          <h3>No Escrows Found</h3>
          <p>{{ getNoEscrowsMessage() }}</p>
          <button 
            class="action-btn primary"
            routerLink="/properties">
            Browse Properties
          </button>
        </div>
      </ng-template>

      <div class="loading-overlay" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <p>Loading escrow data...</p>
      </div>
    </div>
  `,
  styleUrl: './escrow-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EscrowDashboardComponent implements OnInit, OnDestroy {
  escrows: EscrowSummary[] = [];
  filteredEscrows: EscrowSummary[] = [];
  activeFilter: string = 'all';
  viewMode: 'cards' | 'list' = 'cards';
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private blockchainEventsService: BlockchainEventsService,
    private web3Service: Web3Service,
    private contractService: ContractService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEscrows();
    this.subscribeToUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadEscrows(): Promise<void> {
    try {
      this.isLoading = true;
      
      // Get user's escrow addresses from contract service
      const escrowAddresses = await this.contractService.getUserEscrows();
      
      for (const address of escrowAddresses) {
        await this.loadEscrowData(address);
        await this.blockchainEventsService.subscribeToEscrow(address);
      }

      this.applyFilter();
      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading escrows:', error);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadEscrowData(address: string): Promise<void> {
    try {
      const escrowData = await this.contractService.getEscrowDetails(address);
      const userRole = await this.getUserRole(address);
      const yieldBalance = await this.blockchainEventsService.getYieldBalance(address);

      const escrow: EscrowSummary = {
        address,
        propertyId: escrowData.nftID.toString(),
        propertyTitle: `Property ${escrowData.nftID}`,
        purchasePrice: Number(escrowData.purchasePrice) / 1e6, // Convert from USDC decimals
        escrowAmount: Number(escrowData.escrowAmount) / 1e6,
        userRole,
        phase: {
          id: 0,
          name: 'Created',
          timestamp: Date.now(),
          description: 'Initial phase'
        },
        timelockActions: {},
        yieldBalance,
        lastActivity: Date.now(),
        isActive: true
      };

      const existingIndex = this.escrows.findIndex(e => e.address === address);
      if (existingIndex >= 0) {
        this.escrows[existingIndex] = escrow;
      } else {
        this.escrows.push(escrow);
      }

      // Update phase information
      await this.blockchainEventsService.updateEscrowPhase(address);
    } catch (error) {
      console.error(`Error loading escrow ${address}:`, error);
    }
  }

  private async getUserRole(escrowAddress: string): Promise<string[]> {
    try {
      const userAddress = await this.web3Service.getAccount();
      if (!userAddress) return [];

      const escrowData = await this.contractService.getEscrowDetails(escrowAddress);
      const roles: string[] = [];

      if (userAddress.toLowerCase() === escrowData.seller.toLowerCase()) {
        roles.push('Seller');
      }
      if (userAddress.toLowerCase() === escrowData.inspector.toLowerCase()) {
        roles.push('Inspector');
      }
      if (userAddress.toLowerCase() === escrowData.lender.toLowerCase()) {
        roles.push('Lender');
      }
      
      // Check if user is a buyer
      const buyers = await this.contractService.getEscrowBuyers(escrowAddress);
      if (buyers.some(buyer => buyer.toLowerCase() === userAddress.toLowerCase())) {
        roles.push('Buyer');
      }

      return roles.length > 0 ? roles : ['Observer'];
    } catch (error) {
      console.error('Error determining user role:', error);
      return ['Observer'];
    }
  }

  private subscribeToUpdates(): void {
    // Subscribe to phase updates
    this.blockchainEventsService.phaseUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ escrowAddress, phase }) => {
        const escrow = this.escrows.find(e => e.address === escrowAddress);
        if (escrow) {
          escrow.phase = phase;
          escrow.lastActivity = Date.now();
          escrow.isActive = phase.id < 4;
          this.applyFilter();
          this.cdr.detectChanges();
        }
      });

    // Subscribe to timelock updates
    this.blockchainEventsService.timelockUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ escrowAddress, timelock }) => {
        const escrow = this.escrows.find(e => e.address === escrowAddress);
        if (escrow) {
          escrow.timelockActions[timelock.actionType] = timelock;
          escrow.lastActivity = Date.now();
          this.cdr.detectChanges();
        }
      });

    // Subscribe to general events for activity updates
    this.blockchainEventsService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const escrow = this.escrows.find(e => e.address === event.escrowAddress);
        if (escrow) {
          escrow.lastActivity = event.timestamp;
          this.cdr.detectChanges();
        }
      });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  private applyFilter(): void {
    switch (this.activeFilter) {
      case 'active':
        this.filteredEscrows = this.escrows.filter(e => e.isActive);
        break;
      case 'completed':
        this.filteredEscrows = this.escrows.filter(e => e.phase.id === 4);
        break;
      case 'cancelled':
        this.filteredEscrows = this.escrows.filter(e => e.phase.id === 5);
        break;
      default:
        this.filteredEscrows = [...this.escrows];
    }

    // Sort by last activity (most recent first)
    this.filteredEscrows.sort((a, b) => b.lastActivity - a.lastActivity);
    this.cdr.detectChanges();
  }

  setViewMode(mode: 'cards' | 'list'): void {
    this.viewMode = mode;
  }

  trackByAddress(index: number, escrow: EscrowSummary): string {
    return escrow.address;
  }

  getActiveEscrowsCount(): number {
    return this.escrows.filter(e => e.isActive).length;
  }

  getTotalValue(): number {
    return this.escrows.reduce((sum, e) => sum + e.purchasePrice, 0);
  }

  hasActiveTimelock(escrow: EscrowSummary): boolean {
    return Object.values(escrow.timelockActions).some(t => t.isPending);
  }

  getActiveTimelock(escrow: EscrowSummary): TimelockAction | null {
    return Object.values(escrow.timelockActions).find(t => t.isPending) || null;
  }

  formatLastActivity(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  getNoEscrowsMessage(): string {
    switch (this.activeFilter) {
      case 'active':
        return 'No active escrows found. Start a new investment to see it here.';
      case 'completed':
        return 'No completed transactions yet.';
      case 'cancelled':
        return 'No cancelled transactions found.';
      default:
        return 'You haven\'t participated in any escrow transactions yet.';
    }
  }
}