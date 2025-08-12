import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { BlockchainEventsService, EscrowEvent, EscrowPhase, TimelockAction } from '../../services/blockchain-events-simple.service';
import { ContractService } from '../../services/contract.service';
import { Web3Service } from '../../services/web3.service';

import { PhaseIndicatorComponent } from '../phase-indicator/phase-indicator.component';
import { TimelockCountdownComponent } from '../timelock-countdown/timelock-countdown.component';
import { YieldTrackerComponent } from '../yield-tracker/yield-tracker.component';
import { ParticipantActionsComponent } from '../participant-actions/participant-actions.component';

export interface EscrowDetails {
  address: string;
  nftAddress: string;
  nftID: string;
  propertyTitle: string;
  purchasePrice: number;
  escrowAmount: number;
  seller: string;
  inspector: string;
  lender: string;
  buyers: { address: string; shares: number; deposited: number }[];
  currentPhase: EscrowPhase;
  timelocks: { [actionType: string]: TimelockAction };
  approvals: { [address: string]: boolean };
  inspectionPassed: boolean;
  userRoles: string[];
  totalEarnestDeposited: number;
  lenderDeposited: number;
  yieldBalance: number;
  isActive: boolean;
}

@Component({
  selector: 'app-escrow-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PhaseIndicatorComponent,
    TimelockCountdownComponent,
    YieldTrackerComponent,
    ParticipantActionsComponent
  ],
  template: `
    <div class="escrow-detail" *ngIf="escrowDetails; else loading">
      <div class="detail-header">
        <div class="header-nav">
          <button class="back-btn" routerLink="/dashboard">
            ← Back to Dashboard
          </button>
        </div>
        
        <div class="property-summary">
          <div class="property-info">
            <h1>{{ escrowDetails.propertyTitle }}</h1>
            <div class="property-meta">
              <span class="property-id">Property ID: {{ escrowDetails.nftID }}</span>
              <span class="contract-address">Contract: {{ formatAddress(escrowDetails.address) }}</span>
            </div>
          </div>
          
          <div class="financial-summary">
            <div class="summary-item">
              <span class="label">Purchase Price</span>
              <span class="value primary">\${{ escrowDetails.purchasePrice | number:'1.2-2' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Escrow Amount</span>
              <span class="value">\${{ escrowDetails.escrowAmount | number:'1.2-2' }}</span>
            </div>
            <div class="summary-item" *ngIf="escrowDetails.yieldBalance > 0">
              <span class="label">Yield Earned</span>
              <span class="value yield">\${{ escrowDetails.yieldBalance | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="user-roles">
            <span class="roles-label">Your Role:</span>
            <div class="roles-list">
              <span 
                *ngFor="let role of escrowDetails.userRoles" 
                class="role-badge"
                [class]="'role-' + role.toLowerCase()">
                {{ role }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-content">
        <div class="main-column">
          <div class="phase-section">
            <h2>Transaction Progress</h2>
            <app-phase-indicator [currentPhase]="escrowDetails.currentPhase">
            </app-phase-indicator>
          </div>

          <div class="timelock-section" *ngIf="hasActiveTimelocks()">
            <h2>Active Timelock Actions</h2>
            <div class="timelocks-list">
              <app-timelock-countdown
                *ngFor="let timelock of getActiveTimelocks()"
                [timelock]="timelock"
                [showExecuteButton]="true">
              </app-timelock-countdown>
            </div>
          </div>

          <div class="events-section">
            <h2>Transaction History</h2>
            <div class="events-timeline">
              <div 
                *ngFor="let event of eventHistory; trackBy: trackByEventId"
                class="timeline-event"
                [class]="'event-' + event.type.toLowerCase()">
                
                <div class="event-icon">
                  {{ getEventIcon(event.type) }}
                </div>
                
                <div class="event-content">
                  <div class="event-header">
                    <h4>{{ getEventTitle(event.type) }}</h4>
                    <span class="event-time">{{ formatEventTime(event.timestamp) }}</span>
                  </div>
                  <p class="event-description">{{ getEventDescription(event) }}</p>
                  <div class="event-meta">
                    <span class="tx-hash">
                      Tx: {{ formatAddress(event.transactionHash) }}
                    </span>
                    <span class="block-number">
                      Block: {{ event.blockNumber }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="side-column">
          <div class="yield-section">
            <app-yield-tracker 
              [escrowAddress]="escrowDetails.address"
              [currentYield]="escrowDetails.yieldBalance">
            </app-yield-tracker>
          </div>

          <div class="actions-section">
            <app-participant-actions
              [escrowAddress]="escrowDetails.address"
              [userRoles]="escrowDetails.userRoles"
              [currentPhase]="escrowDetails.currentPhase"
              [escrowDetails]="escrowDetails"
              (actionExecuted)="onActionExecuted($event)">
            </app-participant-actions>
          </div>

          <div class="participants-section">
            <h3>Participants</h3>
            <div class="participants-list">
              <div class="participant" *ngIf="escrowDetails.seller">
                <div class="participant-info">
                  <span class="participant-role">Seller</span>
                  <span class="participant-address">{{ formatAddress(escrowDetails.seller) }}</span>
                </div>
                <div class="participant-status">
                  <span 
                    class="approval-status"
                    [class.approved]="isApproved(escrowDetails.seller)">
                    {{ isApproved(escrowDetails.seller) ? '✓' : '○' }}
                  </span>
                </div>
              </div>

              <div class="participant" *ngIf="escrowDetails.inspector">
                <div class="participant-info">
                  <span class="participant-role">Inspector</span>
                  <span class="participant-address">{{ formatAddress(escrowDetails.inspector) }}</span>
                </div>
                <div class="participant-status">
                  <span 
                    class="inspection-status"
                    [class.passed]="escrowDetails.inspectionPassed">
                    {{ escrowDetails.inspectionPassed ? '✓' : '○' }}
                  </span>
                </div>
              </div>

              <div class="participant" *ngIf="escrowDetails.lender">
                <div class="participant-info">
                  <span class="participant-role">Lender</span>
                  <span class="participant-address">{{ formatAddress(escrowDetails.lender) }}</span>
                </div>
                <div class="participant-status">
                  <span 
                    class="approval-status"
                    [class.approved]="isApproved(escrowDetails.lender)">
                    {{ isApproved(escrowDetails.lender) ? '✓' : '○' }}
                  </span>
                </div>
              </div>

              <div class="buyers-section" *ngIf="escrowDetails.buyers.length > 0">
                <h4>Buyers</h4>
                <div 
                  *ngFor="let buyer of escrowDetails.buyers"
                  class="participant buyer">
                  <div class="participant-info">
                    <span class="participant-address">{{ formatAddress(buyer.address) }}</span>
                    <span class="buyer-shares">{{ buyer.shares }}% ({{ buyer.deposited | number:'1.2-2' }} USDC)</span>
                  </div>
                  <div class="participant-status">
                    <span 
                      class="approval-status"
                      [class.approved]="isApproved(buyer.address)">
                      {{ isApproved(buyer.address) ? '✓' : '○' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="contract-info">
            <h3>Contract Information</h3>
            <div class="contract-details">
              <div class="detail-row">
                <span class="label">NFT Contract:</span>
                <span class="value">{{ formatAddress(escrowDetails.nftAddress) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">NFT Token ID:</span>
                <span class="value">{{ escrowDetails.nftID }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value" [class]="getStatusClass()">
                  {{ getStatusText() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading escrow details...</p>
      </div>
    </ng-template>
  `,
  styleUrl: './escrow-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EscrowDetailComponent implements OnInit, OnDestroy {
  escrowDetails: EscrowDetails | null = null;
  eventHistory: EscrowEvent[] = [];
  
  private escrowAddress = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private blockchainEventsService: BlockchainEventsService,
    private contractService: ContractService,
    private web3Service: Web3Service,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.escrowAddress = params['address'];
        this.loadEscrowDetails();
        this.subscribeToUpdates();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadEscrowDetails(): Promise<void> {
    try {
      await this.blockchainEventsService.subscribeToEscrow(this.escrowAddress);
      
      const contractData = await this.contractService.getEscrowDetails(this.escrowAddress);
      const userRoles = await this.getUserRoles();
      const buyers = await this.getBuyersInfo();
      const approvals = await this.getApprovals();
      const yieldBalance = await this.blockchainEventsService.getYieldBalance(this.escrowAddress);

      this.escrowDetails = {
        address: this.escrowAddress,
        nftAddress: contractData.nftAddress,
        nftID: contractData.nftID.toString(),
        propertyTitle: `Property ${contractData.nftID}`,
        purchasePrice: Number(contractData.purchasePrice) / 1e6,
        escrowAmount: Number(contractData.escrowAmount) / 1e6,
        seller: contractData.seller,
        inspector: contractData.inspector,
        lender: contractData.lender,
        buyers,
        currentPhase: {
          id: 0,
          name: 'Created',
          timestamp: Date.now(),
          description: 'Initial phase'
        },
        timelocks: {},
        approvals,
        inspectionPassed: false,
        userRoles,
        totalEarnestDeposited: 0,
        lenderDeposited: 0,
        yieldBalance,
        isActive: true
      };

      await this.blockchainEventsService.updateEscrowPhase(this.escrowAddress);
      await this.loadEventHistory();
      
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading escrow details:', error);
    }
  }

  private async getUserRoles(): Promise<string[]> {
    try {
      const userAddress = await this.web3Service.getAccount();
      if (!userAddress) return [];

      const contractData = await this.contractService.getEscrowDetails(this.escrowAddress);
      const roles: string[] = [];

      if (userAddress.toLowerCase() === contractData.seller.toLowerCase()) {
        roles.push('Seller');
      }
      if (userAddress.toLowerCase() === contractData.inspector.toLowerCase()) {
        roles.push('Inspector');
      }
      if (userAddress.toLowerCase() === contractData.lender.toLowerCase()) {
        roles.push('Lender');
      }
      
      const buyers = await this.contractService.getEscrowBuyers(this.escrowAddress);
      if (buyers.some(buyer => buyer.toLowerCase() === userAddress.toLowerCase())) {
        roles.push('Buyer');
      }

      return roles.length > 0 ? roles : ['Observer'];
    } catch (error) {
      console.error('Error determining user roles:', error);
      return ['Observer'];
    }
  }

  private async getBuyersInfo(): Promise<{ address: string; shares: number; deposited: number }[]> {
    try {
      const buyers = await this.contractService.getEscrowBuyers(this.escrowAddress);
      const buyersInfo = [];

      for (const buyer of buyers) {
        const shares = await this.contractService.getBuyerShares(this.escrowAddress, buyer);
        const deposited = await this.contractService.getBuyerDeposited(this.escrowAddress, buyer);
        
        buyersInfo.push({
          address: buyer,
          shares: Number(shares),
          deposited: Number(deposited) / 1e6
        });
      }

      return buyersInfo;
    } catch (error) {
      console.error('Error getting buyers info:', error);
      return [];
    }
  }

  private async getApprovals(): Promise<{ [address: string]: boolean }> {
    try {
      const approvals: { [address: string]: boolean } = {};
      const contractData = await this.contractService.getEscrowDetails(this.escrowAddress);
      const buyers = await this.contractService.getEscrowBuyers(this.escrowAddress);

      approvals[contractData.seller] = await this.contractService.getApprovalStatus(this.escrowAddress, contractData.seller);
      approvals[contractData.lender] = await this.contractService.getApprovalStatus(this.escrowAddress, contractData.lender);
      
      for (const buyer of buyers) {
        approvals[buyer] = await this.contractService.getApprovalStatus(this.escrowAddress, buyer);
      }

      return approvals;
    } catch (error) {
      console.error('Error getting approvals:', error);
      return {};
    }
  }

  private async loadEventHistory(): Promise<void> {
    try {
      this.eventHistory = await this.blockchainEventsService.getHistoricalEvents(this.escrowAddress);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading event history:', error);
    }
  }

  private subscribeToUpdates(): void {
    this.blockchainEventsService.phaseUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ escrowAddress, phase }) => {
        if (escrowAddress === this.escrowAddress && this.escrowDetails) {
          this.escrowDetails.currentPhase = phase;
          this.escrowDetails.isActive = phase.id < 4;
          this.cdr.detectChanges();
        }
      });

    this.blockchainEventsService.timelockUpdates$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ escrowAddress, timelock }) => {
        if (escrowAddress === this.escrowAddress && this.escrowDetails) {
          this.escrowDetails.timelocks[timelock.actionType] = timelock;
          this.cdr.detectChanges();
        }
      });

    this.blockchainEventsService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.escrowAddress === this.escrowAddress) {
          this.eventHistory.unshift(event);
          this.cdr.detectChanges();
        }
      });
  }

  onActionExecuted(action: string): void {
    console.log('Action executed:', action);
    this.loadEscrowDetails();
  }

  hasActiveTimelocks(): boolean {
    return this.escrowDetails ? 
      Object.values(this.escrowDetails.timelocks).some(t => t.isPending) : false;
  }

  getActiveTimelocks(): TimelockAction[] {
    return this.escrowDetails ? 
      Object.values(this.escrowDetails.timelocks).filter(t => t.isPending) : [];
  }

  isApproved(address: string): boolean {
    return this.escrowDetails?.approvals[address] || false;
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  trackByEventId(index: number, event: EscrowEvent): string {
    return event.transactionHash;
  }

  getEventIcon(eventType: string): string {
    const icons: { [key: string]: string } = {
      'EarnestMoneyDeposited': '💰',
      'CrossChainDepositReceived': '🔗',
      'InspectionStatusUpdated': '🔍',
      'ApprovalGranted': '✅',
      'FullPriceFunded': '💸',
      'TransactionFinalized': '🎉',
      'TransactionCancelled': '❌',
      'YieldEarned': '📈',
      'BuyersInitialized': '👥',
      'TimelockInitiated': '⏰',
      'TimelockExecuted': '✨'
    };
    return icons[eventType] || '📄';
  }

  getEventTitle(eventType: string): string {
    const titles: { [key: string]: string } = {
      'EarnestMoneyDeposited': 'Earnest Money Deposited',
      'CrossChainDepositReceived': 'Cross-Chain Deposit Received',
      'InspectionStatusUpdated': 'Inspection Status Updated',
      'ApprovalGranted': 'Approval Granted',
      'FullPriceFunded': 'Full Price Funded',
      'TransactionFinalized': 'Transaction Finalized',
      'TransactionCancelled': 'Transaction Cancelled',
      'YieldEarned': 'Yield Earned',
      'BuyersInitialized': 'Buyers Initialized',
      'TimelockInitiated': 'Timelock Initiated',
      'TimelockExecuted': 'Timelock Executed'
    };
    return titles[eventType] || eventType;
  }

  getEventDescription(event: EscrowEvent): string {
    // This would be implemented based on the specific event data
    return `Event: ${event.type}`;
  }

  formatEventTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  getStatusClass(): string {
    if (!this.escrowDetails) return '';
    
    if (this.escrowDetails.currentPhase.id === 4) return 'completed';
    if (this.escrowDetails.currentPhase.id === 5) return 'cancelled';
    if (this.escrowDetails.isActive) return 'active';
    
    return 'inactive';
  }

  getStatusText(): string {
    if (!this.escrowDetails) return 'Unknown';
    
    if (this.escrowDetails.currentPhase.id === 4) return 'Completed';
    if (this.escrowDetails.currentPhase.id === 5) return 'Cancelled';
    if (this.escrowDetails.isActive) return 'Active';
    
    return 'Inactive';
  }
}