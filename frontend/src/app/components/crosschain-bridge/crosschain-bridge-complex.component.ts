import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, BehaviorSubject, timer, combineLatest } from 'rxjs';
import { takeUntil, switchMap, map, startWith } from 'rxjs/operators';
import { CrossChainService, BridgeTransaction, ChainConfig } from '../../services/crosschain.service';
import { Web3Service } from '../../services/web3.service';

export interface BridgeStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress?: number;
  txHash?: string;
  estimatedTime?: number;
  chainId?: number;
}

export interface BridgeRequest {
  amount: string;
  shares: number;
  escrowAddress: string;
  fromChain: number;
  toChain: number;
}

@Component({
  selector: 'app-crosschain-bridge',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <mat-card class="bridge-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>swap_horiz</mat-icon>
          Cross-Chain Bridge
        </mat-card-title>
        <mat-card-subtitle>
          Bridge USDC from Polygon to Ethereum for property investment
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="bridge-content">
          <!-- Chain Information -->
          <div class="chain-info">
            <div class="chain-card from-chain">
              <div class="chain-header">
                <mat-icon class="chain-icon polygon">account_balance</mat-icon>
                <div class="chain-details">
                  <h3>{{fromChainConfig?.name || 'Polygon'}}</h3>
                  <span class="chain-id">Chain ID: {{bridgeRequest?.fromChain}}</span>
                </div>
              </div>
              <div class="chain-stats">
                <div class="stat">
                  <span class="label">USDC Balance</span>
                  <span class="value">
                    <mat-spinner *ngIf="loadingBalance" diameter="16"></mat-spinner>
                    ${{polygonBalance}}
                  </span>
                </div>
                <div class="stat">
                  <span class="label">Est. Gas</span>
                  <span class="value">~$2-5</span>
                </div>
              </div>
            </div>

            <div class="bridge-arrow">
              <mat-icon [class.animated]="bridgeInProgress">trending_flat</mat-icon>
              <div class="bridge-amount" *ngIf="bridgeRequest">
                ${{bridgeRequest.amount}}
                <br>
                <small>{{bridgeRequest.shares}}% shares</small>
              </div>
            </div>

            <div class="chain-card to-chain">
              <div class="chain-header">
                <mat-icon class="chain-icon ethereum">account_balance_wallet</mat-icon>
                <div class="chain-details">
                  <h3>{{toChainConfig?.name || 'Ethereum'}}</h3>
                  <span class="chain-id">Chain ID: {{bridgeRequest?.toChain}}</span>
                </div>
              </div>
              <div class="chain-stats">
                <div class="stat">
                  <span class="label">Escrow Address</span>
                  <span class="value address">{{formatAddress(bridgeRequest?.escrowAddress || '')}}</span>
                </div>
                <div class="stat">
                  <span class="label">Est. Time</span>
                  <span class="value">5-10 min</span>
                </div>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Bridge Steps -->
          <div class="bridge-steps" *ngIf="bridgeSteps.length > 0">
            <h4>Bridge Progress</h4>
            <div class="steps-container">
              <div *ngFor="let step of bridgeSteps; let i = index" 
                   class="step"
                   [class.active]="step.status === 'in-progress'"
                   [class.completed]="step.status === 'completed'"
                   [class.failed]="step.status === 'failed'">
                
                <div class="step-indicator">
                  <mat-icon *ngIf="step.status === 'completed'">check_circle</mat-icon>
                  <mat-icon *ngIf="step.status === 'failed'">error</mat-icon>
                  <mat-spinner *ngIf="step.status === 'in-progress'" diameter="24"></mat-spinner>
                  <span *ngIf="step.status === 'pending'" class="step-number">{{i + 1}}</span>
                </div>

                <div class="step-content">
                  <div class="step-header">
                    <h5>{{step.title}}</h5>
                    <span class="step-time" *ngIf="step.estimatedTime">
                      ~{{step.estimatedTime}}s
                    </span>
                  </div>
                  <p class="step-description">{{step.description}}</p>
                  
                  <!-- Progress bar for active step -->
                  <mat-progress-bar 
                    *ngIf="step.status === 'in-progress' && step.progress !== undefined"
                    [value]="step.progress"
                    mode="determinate">
                  </mat-progress-bar>
                  
                  <!-- Transaction hash -->
                  <div class="step-tx" *ngIf="step.txHash">
                    <mat-icon>link</mat-icon>
                    <a [href]="getExplorerUrl(step.txHash, step.chainId)" target="_blank">
                      {{formatTxHash(step.txHash)}}
                    </a>
                  </div>
                </div>

                <!-- Connector line -->
                <div class="step-connector" *ngIf="i < bridgeSteps.length - 1"></div>
              </div>
            </div>
          </div>

          <!-- Bridge Status -->
          <div class="bridge-status" *ngIf="currentBridgeTransaction$ | async as tx">
            <div class="status-card" [ngClass]="tx.status">
              <div class="status-header">
                <mat-icon>{{getStatusIcon(tx.status)}}</mat-icon>
                <h4>{{getStatusTitle(tx.status)}}</h4>
              </div>
              <p class="status-description">{{getStatusDescription(tx.status)}}</p>
              
              <!-- Status details -->
              <div class="status-details">
                <div class="detail-item">
                  <span class="label">Transaction ID:</span>
                  <span class="value">{{tx.id}}</span>
                </div>
                <div class="detail-item" *ngIf="tx.txHash">
                  <span class="label">Bridge TX:</span>
                  <a [href]="getExplorerUrl(tx.txHash, tx.fromChain)" target="_blank" class="tx-link">
                    {{formatTxHash(tx.txHash)}}
                  </a>
                </div>
                <div class="detail-item" *ngIf="tx.estimatedCompletionTime">
                  <span class="label">Est. Completion:</span>
                  <span class="value">{{getTimeRemaining(tx.estimatedCompletionTime)}}</span>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="status-actions">
                <button mat-stroked-button 
                        *ngIf="tx.status === 'failed'"
                        (click)="retryBridge()">
                  <mat-icon>refresh</mat-icon>
                  Retry Bridge
                </button>
                
                <button mat-raised-button 
                        color="primary"
                        *ngIf="tx.status === 'completed'"
                        (click)="proceedToInvestment()">
                  <mat-icon>arrow_forward</mat-icon>
                  Continue Investment
                </button>
              </div>
            </div>
          </div>

          <!-- Bridge Controls -->
          <div class="bridge-controls" *ngIf="!bridgeInProgress">
            <button mat-raised-button 
                    color="primary"
                    [disabled]="!canStartBridge"
                    (click)="startBridge()">
              <mat-icon>launch</mat-icon>
              Start Cross-Chain Bridge
            </button>
            
            <button mat-stroked-button (click)="cancelBridge()">
              <mat-icon>cancel</mat-icon>
              Cancel
            </button>
          </div>

          <!-- Warning Messages -->
          <div class="warning-messages">
            <div class="warning-card" *ngIf="!hasPolygonUSDC">
              <mat-icon>warning</mat-icon>
              <div>
                <h5>Insufficient USDC Balance</h5>
                <p>You need ${{bridgeRequest?.amount}} USDC on Polygon to proceed with this bridge.</p>
                <button mat-button color="accent" (click)="getPolygonUSDC()">
                  Get Polygon USDC
                </button>
              </div>
            </div>

            <div class="info-card">
              <mat-icon>info</mat-icon>
              <div>
                <h5>Bridge Safety Notice</h5>
                <p>
                  Cross-chain bridges involve smart contract risks. Only bridge funds you can afford to lose.
                  Always verify transaction details before confirming.
                </p>
              </div>
            </div>
          </div>

          <!-- Recent Bridge History -->
          <div class="bridge-history" *ngIf="recentBridges.length > 0">
            <h4>Recent Bridge Transactions</h4>
            <div class="history-list">
              <div *ngFor="let bridge of recentBridges" 
                   class="history-item"
                   [class.clickable]="bridge.status !== 'completed'"
                   (click)="selectBridgeTransaction(bridge)">
                <div class="history-content">
                  <div class="history-main">
                    <span class="amount">${{bridge.amount}}</span>
                    <span class="chains">
                      {{getChainName(bridge.fromChain)}} → {{getChainName(bridge.toChain)}}
                    </span>
                  </div>
                  <div class="history-meta">
                    <span class="timestamp">{{formatTimestamp(bridge.timestamp)}}</span>
                    <mat-chip [ngClass]="bridge.status">{{bridge.status}}</mat-chip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./crosschain-bridge.component.scss']
})
export class CrossChainBridgeComponent implements OnInit, OnDestroy {
  @Input() bridgeRequest: BridgeRequest | null = null;
  @Output() bridgeCompleted = new EventEmitter<BridgeTransaction>();
  @Output() bridgeCancelled = new EventEmitter<void>();

  bridgeSteps: BridgeStep[] = [];
  bridgeInProgress = false;
  loadingBalance = false;
  polygonBalance = '0';
  
  currentBridgeTransaction$ = new BehaviorSubject<BridgeTransaction | null>(null);
  recentBridges: BridgeTransaction[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private crossChainService: CrossChainService,
    private web3Service: Web3Service
  ) {}

  ngOnInit(): void {
    this.initializeBridgeSteps();
    this.loadPolygonBalance();
    this.loadRecentBridges();
    
    // Subscribe to bridge transactions
    this.crossChainService.bridgeTransactions$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(transactions => {
      this.recentBridges = transactions.slice(0, 5); // Show last 5 transactions
      
      // Find current transaction if in progress
      const currentTx = transactions.find(tx => 
        tx.status === 'pending' || tx.status === 'confirmed' || tx.status === 'bridging'
      );
      
      if (currentTx) {
        this.currentBridgeTransaction$.next(currentTx);
        this.updateBridgeStepsFromTransaction(currentTx);
      }
    });

    // Monitor current transaction
    this.currentBridgeTransaction$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(tx => {
      if (tx) {
        this.bridgeInProgress = tx.status !== 'completed' && tx.status !== 'failed';
        
        if (tx.status === 'completed') {
          this.bridgeCompleted.emit(tx);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get fromChainConfig(): ChainConfig | undefined {
    return this.bridgeRequest ? this.crossChainService.getChainConfig(this.bridgeRequest.fromChain) : undefined;
  }

  get toChainConfig(): ChainConfig | undefined {
    return this.bridgeRequest ? this.crossChainService.getChainConfig(this.bridgeRequest.toChain) : undefined;
  }

  get canStartBridge(): boolean {
    return !!(this.bridgeRequest && this.hasPolygonUSDC && !this.bridgeInProgress);
  }

  get hasPolygonUSDC(): boolean {
    if (!this.bridgeRequest) return false;
    return parseFloat(this.polygonBalance) >= parseFloat(this.bridgeRequest.amount);
  }

  private initializeBridgeSteps(): void {
    this.bridgeSteps = [
      {
        id: 'switch-polygon',
        title: 'Switch to Polygon',
        description: 'Switch your wallet to Polygon network',
        status: 'pending',
        estimatedTime: 10
      },
      {
        id: 'approve-usdc',
        title: 'Approve USDC',
        description: 'Approve bridge contract to spend your USDC',
        status: 'pending',
        estimatedTime: 30
      },
      {
        id: 'initiate-bridge',
        title: 'Initiate Bridge',
        description: 'Start the cross-chain bridge transaction',
        status: 'pending',
        estimatedTime: 60
      },
      {
        id: 'layerzero-relay',
        title: 'LayerZero Relay',
        description: 'Wait for cross-chain message confirmation',
        status: 'pending',
        estimatedTime: 300
      },
      {
        id: 'ethereum-deposit',
        title: 'Ethereum Deposit',
        description: 'Complete deposit to escrow contract',
        status: 'pending',
        estimatedTime: 120
      }
    ];
  }

  private async loadPolygonBalance(): Promise<void> {
    if (!this.bridgeRequest) return;

    this.loadingBalance = true;
    try {
      const balance = await this.crossChainService.getUSDCBalance(this.bridgeRequest.fromChain);
      this.polygonBalance = balance;
    } catch (error) {
      console.error('Failed to load Polygon USDC balance:', error);
      this.polygonBalance = '0';
    } finally {
      this.loadingBalance = false;
    }
  }

  private async loadRecentBridges(): Promise<void> {
    try {
      const history = await this.crossChainService.getBridgeHistory();
      this.recentBridges = history.slice(0, 5);
    } catch (error) {
      console.error('Failed to load bridge history:', error);
    }
  }

  private updateBridgeStepsFromTransaction(tx: BridgeTransaction): void {
    // Update step statuses based on transaction status
    switch (tx.status) {
      case 'pending':
        this.updateStepStatus('switch-polygon', 'in-progress');
        break;
      case 'confirmed':
        this.updateStepStatus('switch-polygon', 'completed');
        this.updateStepStatus('approve-usdc', 'completed');
        this.updateStepStatus('initiate-bridge', 'completed');
        this.updateStepStatus('layerzero-relay', 'in-progress');
        break;
      case 'bridging':
        this.updateStepStatus('layerzero-relay', 'completed');
        this.updateStepStatus('ethereum-deposit', 'in-progress');
        break;
      case 'completed':
        this.bridgeSteps.forEach(step => {
          if (step.status !== 'failed') {
            step.status = 'completed';
          }
        });
        break;
      case 'failed':
        // Find the last completed step and mark the next one as failed
        const lastCompleted = this.bridgeSteps.findLastIndex(step => step.status === 'completed');
        if (lastCompleted < this.bridgeSteps.length - 1) {
          this.bridgeSteps[lastCompleted + 1].status = 'failed';
        }
        break;
    }
  }

  private updateStepStatus(stepId: string, status: BridgeStep['status']): void {
    const step = this.bridgeSteps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
    }
  }

  async startBridge(): Promise<void> {
    if (!this.bridgeRequest) return;

    try {
      this.bridgeInProgress = true;
      
      // Update first step
      this.updateStepStatus('switch-polygon', 'in-progress');

      // Switch to Polygon if needed
      const currentChain = await this.getCurrentChain();
      if (currentChain !== this.bridgeRequest.fromChain) {
        const switched = await this.crossChainService.switchToChain(this.bridgeRequest.fromChain);
        if (!switched) {
          throw new Error('Failed to switch to Polygon network');
        }
      }

      this.updateStepStatus('switch-polygon', 'completed');
      this.updateStepStatus('approve-usdc', 'in-progress');

      // Approve USDC spending
      const bridgeAddress = this.fromChainConfig?.contracts.bridge;
      if (!bridgeAddress) {
        throw new Error('Bridge contract not configured');
      }

      const approval$ = this.crossChainService.approveUSDC(
        this.bridgeRequest.amount,
        bridgeAddress
      );

      await approval$.toPromise();
      
      this.updateStepStatus('approve-usdc', 'completed');
      this.updateStepStatus('initiate-bridge', 'in-progress');

      // Initiate cross-chain deposit
      const bridgeTransaction$ = this.crossChainService.initiateCrossChainDeposit(
        this.bridgeRequest.escrowAddress,
        this.bridgeRequest.amount,
        this.bridgeRequest.shares
      );

      const tx = await bridgeTransaction$.toPromise();
      this.currentBridgeTransaction$.next(tx);

    } catch (error) {
      console.error('Bridge failed:', error);
      this.bridgeInProgress = false;
      // Handle error - mark appropriate step as failed
    }
  }

  private async getCurrentChain(): Promise<number> {
    try {
      const provider = await this.web3Service.getProvider();
      if (provider) {
        const network = await provider.getNetwork();
        return Number(network.chainId);
      }
    } catch (error) {
      console.error('Failed to get current chain:', error);
    }
    return 1; // Default to mainnet
  }

  retryBridge(): void {
    // Reset failed steps and restart
    this.bridgeSteps.forEach(step => {
      if (step.status === 'failed') {
        step.status = 'pending';
      }
    });
    
    this.bridgeInProgress = false;
    this.startBridge();
  }

  cancelBridge(): void {
    this.bridgeInProgress = false;
    this.currentBridgeTransaction$.next(null);
    this.initializeBridgeSteps();
    this.bridgeCancelled.emit();
  }

  proceedToInvestment(): void {
    const currentTx = this.currentBridgeTransaction$.value;
    if (currentTx && currentTx.status === 'completed') {
      this.bridgeCompleted.emit(currentTx);
    }
  }

  getPolygonUSDC(): void {
    // Open link to get USDC on Polygon (could be Uniswap, QuickSwap, etc.)
    window.open('https://app.uniswap.org/#/swap?chain=polygon', '_blank');
  }

  selectBridgeTransaction(bridge: BridgeTransaction): void {
    if (bridge.status !== 'completed') {
      this.currentBridgeTransaction$.next(bridge);
      this.updateBridgeStepsFromTransaction(bridge);
    }
  }

  // Helper methods
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  formatTxHash(hash: string): string {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  getChainName(chainId: number): string {
    return this.crossChainService.getChainConfig(chainId)?.name || `Chain ${chainId}`;
  }

  getExplorerUrl(txHash: string, chainId?: number): string {
    const config = chainId ? this.crossChainService.getChainConfig(chainId) : undefined;
    const baseUrl = config?.blockExplorer || 'https://etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'hourglass_empty';
      case 'confirmed': return 'check_circle_outline';
      case 'bridging': return 'sync';
      case 'completed': return 'check_circle';
      case 'failed': return 'error_outline';
      default: return 'help_outline';
    }
  }

  getStatusTitle(status: string): string {
    switch (status) {
      case 'pending': return 'Bridge Pending';
      case 'confirmed': return 'Transaction Confirmed';
      case 'bridging': return 'Cross-Chain Transfer In Progress';
      case 'completed': return 'Bridge Completed Successfully';
      case 'failed': return 'Bridge Failed';
      default: return 'Unknown Status';
    }
  }

  getStatusDescription(status: string): string {
    switch (status) {
      case 'pending': return 'Your bridge transaction is being processed...';
      case 'confirmed': return 'Transaction confirmed on Polygon. Waiting for LayerZero relay.';
      case 'bridging': return 'Cross-chain message is being processed. This may take several minutes.';
      case 'completed': return 'Your USDC has been successfully bridged to Ethereum and deposited in escrow.';
      case 'failed': return 'The bridge transaction failed. You can retry or contact support.';
      default: return 'Status unknown. Please check transaction details.';
    }
  }

  getTimeRemaining(estimatedCompletionTime: number): string {
    const now = Date.now();
    const remaining = Math.max(0, estimatedCompletionTime - now);
    const minutes = Math.ceil(remaining / (1000 * 60));
    
    if (minutes <= 0) return 'Completing...';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  }
}