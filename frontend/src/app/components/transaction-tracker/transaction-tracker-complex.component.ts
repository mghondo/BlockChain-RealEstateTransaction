import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, BehaviorSubject, timer, combineLatest } from 'rxjs';
import { takeUntil, map, startWith } from 'rxjs/operators';
import { 
  TransactionService, 
  InvestmentTransaction, 
  TransactionStep,
  TransactionSimulation 
} from '../../services/transaction.service';
import { Web3Service } from '../../services/web3.service';

export interface TransactionDisplay {
  transaction: InvestmentTransaction;
  currentStep?: TransactionStep;
  nextStep?: TransactionStep;
  progress: number;
  timeElapsed: string;
  estimatedTimeRemaining: string;
}

@Component({
  selector: 'app-transaction-tracker',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    MatExpansionModule,
    MatTabsModule
  ],
  template: `
    <mat-card class="tracker-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>timeline</mat-icon>
          Transaction Tracker
        </mat-card-title>
        <mat-card-subtitle>
          Monitor your investment transactions in real-time
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <mat-tab-group class="tracker-tabs" [selectedIndex]="selectedTabIndex">
          <!-- Active Transactions -->
          <mat-tab label="Active">
            <div class="tab-content">
              <div *ngIf="activeTransactions.length === 0" class="empty-state">
                <mat-icon>hourglass_empty</mat-icon>
                <h3>No Active Transactions</h3>
                <p>Your active investment transactions will appear here.</p>
              </div>

              <div *ngFor="let display of activeTransactions" class="transaction-card active">
                <div class="transaction-header">
                  <div class="transaction-info">
                    <h4>{{getTransactionTitle(display.transaction)}}</h4>
                    <div class="transaction-meta">
                      <span class="method">{{getMethodName(display.transaction.method)}}</span>
                      <span class="amount">${{display.transaction.amount}}</span>
                      <span class="shares">{{display.transaction.shares}}% shares</span>
                    </div>
                  </div>
                  <div class="transaction-status">
                    <mat-chip [ngClass]="display.transaction.overallStatus">
                      {{display.transaction.overallStatus | titlecase}}
                    </mat-chip>
                  </div>
                </div>

                <!-- Progress Overview -->
                <div class="progress-overview">
                  <div class="progress-stats">
                    <div class="stat">
                      <span class="label">Progress</span>
                      <span class="value">{{display.progress}}%</span>
                    </div>
                    <div class="stat">
                      <span class="label">Time Elapsed</span>
                      <span class="value">{{display.timeElapsed}}</span>
                    </div>
                    <div class="stat">
                      <span class="label">Est. Remaining</span>
                      <span class="value">{{display.estimatedTimeRemaining}}</span>
                    </div>
                  </div>
                  <mat-progress-bar 
                    [value]="display.progress" 
                    [mode]="display.transaction.overallStatus === 'failed' ? 'indeterminate' : 'determinate'"
                    [ngClass]="display.transaction.overallStatus">
                  </mat-progress-bar>
                </div>

                <!-- Current Step -->
                <div class="current-step" *ngIf="display.currentStep">
                  <div class="step-header">
                    <mat-icon [ngClass]="display.currentStep.status">
                      {{getStepIcon(display.currentStep.status)}}
                    </mat-icon>
                    <div class="step-info">
                      <h5>{{display.currentStep.title}}</h5>
                      <p>{{display.currentStep.description}}</p>
                    </div>
                    <mat-spinner 
                      *ngIf="display.currentStep.status === 'in-progress'" 
                      diameter="24">
                    </mat-spinner>
                  </div>
                  
                  <div class="step-details" *ngIf="display.currentStep.txHash">
                    <div class="detail-item">
                      <mat-icon>link</mat-icon>
                      <a [href]="getExplorerUrl(display.currentStep.txHash, display.currentStep.chainId)" 
                         target="_blank"
                         class="tx-link">
                        View Transaction: {{formatTxHash(display.currentStep.txHash)}}
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="transaction-actions">
                  <button mat-stroked-button 
                          *ngIf="display.transaction.overallStatus === 'failed'"
                          (click)="retryTransaction(display.transaction.id)">
                    <mat-icon>refresh</mat-icon>
                    Retry
                  </button>
                  
                  <button mat-stroked-button 
                          *ngIf="display.transaction.overallStatus === 'in-progress'"
                          (click)="cancelTransaction(display.transaction.id)">
                    <mat-icon>cancel</mat-icon>
                    Cancel
                  </button>
                  
                  <button mat-button (click)="viewDetails(display.transaction)">
                    <mat-icon>visibility</mat-icon>
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Transaction History -->
          <mat-tab label="History">
            <div class="tab-content">
              <div *ngIf="completedTransactions.length === 0" class="empty-state">
                <mat-icon>history</mat-icon>
                <h3>No Transaction History</h3>
                <p>Your completed transactions will appear here.</p>
              </div>

              <div *ngFor="let display of completedTransactions" class="transaction-card completed">
                <div class="transaction-header">
                  <div class="transaction-info">
                    <h4>{{getTransactionTitle(display.transaction)}}</h4>
                    <div class="transaction-meta">
                      <span class="method">{{getMethodName(display.transaction.method)}}</span>
                      <span class="amount">${{display.transaction.amount}}</span>
                      <span class="shares">{{display.transaction.shares}}% shares</span>
                      <span class="date">{{formatDate(display.transaction.completionTime || display.transaction.startTime)}}</span>
                    </div>
                  </div>
                  <div class="transaction-status">
                    <mat-chip [ngClass]="display.transaction.overallStatus">
                      {{display.transaction.overallStatus | titlecase}}
                    </mat-chip>
                  </div>
                </div>

                <!-- Receipt Info for Completed -->
                <div class="receipt-info" *ngIf="display.transaction.receipt">
                  <div class="receipt-item">
                    <span class="label">Confirmation #:</span>
                    <span class="value">{{display.transaction.receipt.confirmationNumber}}</span>
                  </div>
                  <div class="receipt-item">
                    <span class="label">Final TX:</span>
                    <a [href]="getExplorerUrl(display.transaction.receipt.finalTxHash)" 
                       target="_blank" 
                       class="tx-link">
                      {{formatTxHash(display.transaction.receipt.finalTxHash)}}
                    </a>
                  </div>
                  <div class="receipt-item">
                    <span class="label">Ownership:</span>
                    <span class="value">{{display.transaction.receipt.proofOfOwnership}}</span>
                  </div>
                </div>

                <!-- Transaction Summary -->
                <div class="transaction-summary">
                  <div class="summary-stats">
                    <div class="stat">
                      <span class="label">Duration</span>
                      <span class="value">{{getDuration(display.transaction)}}</span>
                    </div>
                    <div class="stat" *ngIf="display.transaction.totalGasCost">
                      <span class="label">Gas Cost</span>
                      <span class="value">${{display.transaction.totalGasCost}}</span>
                    </div>
                    <div class="stat" *ngIf="display.transaction.totalGasUsed">
                      <span class="label">Gas Used</span>
                      <span class="value">{{formatGasUsed(display.transaction.totalGasUsed)}}</span>
                    </div>
                  </div>
                </div>

                <div class="transaction-actions">
                  <button mat-button (click)="viewDetails(display.transaction)">
                    <mat-icon>visibility</mat-icon>
                    View Details
                  </button>
                  
                  <button mat-button 
                          *ngIf="display.transaction.receipt"
                          (click)="downloadReceipt(display.transaction)">
                    <mat-icon>download</mat-icon>
                    Receipt
                  </button>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Transaction Simulation -->
          <mat-tab label="Simulate" *ngIf="showSimulation">
            <div class="tab-content">
              <div class="simulation-card">
                <div class="simulation-header">
                  <mat-icon>play_circle_outline</mat-icon>
                  <h3>Transaction Simulation</h3>
                  <p>Test your transaction before executing to estimate costs and identify potential issues.</p>
                </div>

                <div class="simulation-controls">
                  <button mat-raised-button 
                          color="accent"
                          [disabled]="simulationRunning"
                          (click)="runSimulation()">
                    <mat-spinner *ngIf="simulationRunning" diameter="16"></mat-spinner>
                    <mat-icon *ngIf="!simulationRunning">play_arrow</mat-icon>
                    Run Simulation
                  </button>
                </div>

                <!-- Simulation Results -->
                <div class="simulation-results" *ngIf="simulationResult">
                  <div class="result-card" [ngClass]="simulationResult.success ? 'success' : 'error'">
                    <div class="result-header">
                      <mat-icon>{{simulationResult.success ? 'check_circle' : 'error'}}</mat-icon>
                      <h4>{{simulationResult.success ? 'Simulation Successful' : 'Simulation Failed'}}</h4>
                    </div>

                    <div class="result-details" *ngIf="simulationResult.success">
                      <div class="detail-row">
                        <span class="label">Estimated Gas:</span>
                        <span class="value">{{formatGas(simulationResult.gasEstimate)}}</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Gas Price:</span>
                        <span class="value">{{formatGasPrice(simulationResult.gasPrice)}} gwei</span>
                      </div>
                      <div class="detail-row">
                        <span class="label">Estimated Cost:</span>
                        <span class="value">${{simulationResult.estimatedCost}}</span>
                      </div>
                    </div>

                    <div class="error-details" *ngIf="!simulationResult.success">
                      <p class="error-reason">{{simulationResult.revertReason}}</p>
                      <div class="error-suggestions">
                        <h5>Suggestions:</h5>
                        <ul>
                          <li>Check your USDC balance</li>
                          <li>Ensure you have enough ETH for gas</li>
                          <li>Verify the property is still available</li>
                          <li>Try reducing the investment amount</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card-content>
    </mat-card>

    <!-- Detailed Transaction Modal -->
    <div class="transaction-modal" *ngIf="selectedTransaction" (click)="closeDetails()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Transaction Details</h3>
          <button mat-icon-button (click)="closeDetails()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body">
          <!-- Transaction Overview -->
          <div class="detail-section">
            <h4>Overview</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">ID:</span>
                <span class="value">{{selectedTransaction.id}}</span>
              </div>
              <div class="detail-item">
                <span class="label">Method:</span>
                <span class="value">{{getMethodName(selectedTransaction.method)}}</span>
              </div>
              <div class="detail-item">
                <span class="label">Amount:</span>
                <span class="value">${{selectedTransaction.amount}}</span>
              </div>
              <div class="detail-item">
                <span class="label">Shares:</span>
                <span class="value">{{selectedTransaction.shares}}%</span>
              </div>
              <div class="detail-item">
                <span class="label">Status:</span>
                <mat-chip [ngClass]="selectedTransaction.overallStatus">
                  {{selectedTransaction.overallStatus | titlecase}}
                </mat-chip>
              </div>
            </div>
          </div>

          <!-- Steps Detail -->
          <div class="detail-section">
            <h4>Steps</h4>
            <mat-accordion class="steps-accordion">
              <mat-expansion-panel *ngFor="let step of selectedTransaction.steps; let i = index"
                                   [expanded]="step.status === 'in-progress'">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon [ngClass]="step.status">{{getStepIcon(step.status)}}</mat-icon>
                    {{step.title}}
                  </mat-panel-title>
                  <mat-panel-description>
                    <mat-chip [ngClass]="step.status">{{step.status | titlecase}}</mat-chip>
                  </mat-panel-description>
                </mat-expansion-panel-header>
                
                <div class="step-detail-content">
                  <p>{{step.description}}</p>
                  
                  <div class="step-metadata" *ngIf="step.txHash || step.blockNumber || step.gasUsed">
                    <div class="metadata-item" *ngIf="step.txHash">
                      <span class="label">Transaction:</span>
                      <a [href]="getExplorerUrl(step.txHash, step.chainId)" target="_blank">
                        {{step.txHash}}
                      </a>
                    </div>
                    <div class="metadata-item" *ngIf="step.blockNumber">
                      <span class="label">Block:</span>
                      <span>{{step.blockNumber}}</span>
                    </div>
                    <div class="metadata-item" *ngIf="step.gasUsed">
                      <span class="label">Gas Used:</span>
                      <span>{{formatGasUsed(step.gasUsed)}}</span>
                    </div>
                    <div class="metadata-item" *ngIf="step.timestamp">
                      <span class="label">Timestamp:</span>
                      <span>{{formatDate(step.timestamp)}}</span>
                    </div>
                  </div>

                  <div class="error-info" *ngIf="step.errorMessage">
                    <mat-icon>error</mat-icon>
                    <span>{{step.errorMessage}}</span>
                  </div>
                </div>
              </mat-expansion-panel>
            </mat-accordion>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./transaction-tracker.component.scss']
})
export class TransactionTrackerComponent implements OnInit, OnDestroy {
  @Input() transactionId?: string;
  @Input() showSimulation = false;
  @Output() transactionSelected = new EventEmitter<InvestmentTransaction>();
  @Output() simulationRequested = new EventEmitter<void>();

  selectedTabIndex = 0;
  selectedTransaction: InvestmentTransaction | null = null;
  
  activeTransactions: TransactionDisplay[] = [];
  completedTransactions: TransactionDisplay[] = [];
  
  simulationRunning = false;
  simulationResult: TransactionSimulation | null = null;

  private destroy$ = new Subject<void>();
  private refreshTimer$ = timer(0, 5000); // Refresh every 5 seconds

  constructor(
    private transactionService: TransactionService,
    private web3Service: Web3Service
  ) {}

  ngOnInit(): void {
    this.loadTransactions();
    
    // Auto-refresh transactions
    this.refreshTimer$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadTransactions();
    });

    // If specific transaction ID is provided, focus on it
    if (this.transactionId) {
      const transaction = this.transactionService.getTransaction(this.transactionId);
      if (transaction) {
        this.selectedTransaction = transaction;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTransactions(): void {
    this.transactionService.getUserTransactions().pipe(
      takeUntil(this.destroy$)
    ).subscribe(transactions => {
      const active = transactions.filter(tx => 
        tx.overallStatus === 'pending' || 
        tx.overallStatus === 'in-progress'
      );
      
      const completed = transactions.filter(tx => 
        tx.overallStatus === 'completed' || 
        tx.overallStatus === 'failed' || 
        tx.overallStatus === 'cancelled'
      );

      this.activeTransactions = active.map(tx => this.createTransactionDisplay(tx));
      this.completedTransactions = completed.map(tx => this.createTransactionDisplay(tx));
    });
  }

  private createTransactionDisplay(transaction: InvestmentTransaction): TransactionDisplay {
    const completedSteps = transaction.steps.filter(step => step.status === 'completed').length;
    const totalSteps = transaction.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const currentStep = transaction.steps.find(step => step.status === 'in-progress');
    const nextStepIndex = transaction.steps.findIndex(step => step.status === 'pending');
    const nextStep = nextStepIndex >= 0 ? transaction.steps[nextStepIndex] : undefined;

    const now = Date.now();
    const elapsed = now - transaction.startTime;
    const timeElapsed = this.formatDuration(elapsed);

    // Calculate estimated time remaining
    const totalEstimatedTime = transaction.steps.reduce(
      (total, step) => total + (step.estimatedTime || 0), 0
    ) * 1000;
    
    const remainingTime = Math.max(0, totalEstimatedTime - elapsed);
    const estimatedTimeRemaining = this.formatDuration(remainingTime);

    return {
      transaction,
      currentStep,
      nextStep,
      progress,
      timeElapsed,
      estimatedTimeRemaining
    };
  }

  getTransactionTitle(transaction: InvestmentTransaction): string {
    const propertyId = transaction.propertyAddress.substring(0, 8);
    return `Property Investment ${propertyId}...`;
  }

  getMethodName(method: string): string {
    switch (method) {
      case 'direct-ethereum': return 'Direct Ethereum';
      case 'cross-chain-polygon': return 'Cross-Chain Polygon';
      default: return method;
    }
  }

  getStepIcon(status: string): string {
    switch (status) {
      case 'pending': return 'radio_button_unchecked';
      case 'in-progress': return 'radio_button_checked';
      case 'completed': return 'check_circle';
      case 'failed': return 'error';
      default: return 'help';
    }
  }

  formatTxHash(hash: string): string {
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatGasUsed(gasUsed: bigint): string {
    const gas = Number(gasUsed);
    if (gas > 1000000) {
      return `${(gas / 1000000).toFixed(1)}M`;
    } else if (gas > 1000) {
      return `${(gas / 1000).toFixed(1)}K`;
    }
    return gas.toString();
  }

  formatGas(gas: bigint): string {
    return this.formatGasUsed(gas);
  }

  formatGasPrice(gasPrice: bigint): string {
    // Convert from wei to gwei
    const gwei = Number(gasPrice) / 1e9;
    return gwei.toFixed(1);
  }

  getDuration(transaction: InvestmentTransaction): string {
    const start = transaction.startTime;
    const end = transaction.completionTime || Date.now();
    return this.formatDuration(end - start);
  }

  getExplorerUrl(txHash: string, chainId?: number): string {
    // Default to Ethereum mainnet
    let baseUrl = 'https://etherscan.io';
    
    if (chainId === 137) {
      baseUrl = 'https://polygonscan.com';
    } else if (chainId === 80001) {
      baseUrl = 'https://mumbai.polygonscan.com';
    } else if (chainId === 31337) {
      baseUrl = '#'; // Local network, no explorer
    }
    
    return `${baseUrl}/tx/${txHash}`;
  }

  retryTransaction(transactionId: string): void {
    this.transactionService.retryTransaction(transactionId).subscribe(
      transaction => {
        console.log('Transaction retry initiated:', transaction);
        this.loadTransactions();
      },
      error => {
        console.error('Failed to retry transaction:', error);
      }
    );
  }

  cancelTransaction(transactionId: string): void {
    if (this.transactionService.cancelTransaction(transactionId)) {
      this.loadTransactions();
    }
  }

  viewDetails(transaction: InvestmentTransaction): void {
    this.selectedTransaction = transaction;
    this.transactionSelected.emit(transaction);
  }

  closeDetails(): void {
    this.selectedTransaction = null;
  }

  downloadReceipt(transaction: InvestmentTransaction): void {
    if (!transaction.receipt) return;

    const receiptData = {
      confirmationNumber: transaction.receipt.confirmationNumber,
      transactionId: transaction.id,
      propertyAddress: transaction.propertyAddress,
      investorAddress: transaction.investorAddress,
      amount: transaction.amount,
      shares: transaction.shares,
      method: transaction.method,
      completionTime: transaction.completionTime,
      finalTxHash: transaction.receipt.finalTxHash,
      proofOfOwnership: transaction.receipt.proofOfOwnership
    };

    const dataStr = JSON.stringify(receiptData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `fracEstate-receipt-${transaction.receipt.confirmationNumber}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  async runSimulation(): Promise<void> {
    if (!this.selectedTransaction) return;

    this.simulationRunning = true;
    this.simulationResult = null;

    try {
      // Simulate the main investment transaction
      const simulation = await this.transactionService.simulateTransaction(
        this.selectedTransaction.propertyAddress,
        'depositEarnest',
        [this.selectedTransaction.shares],
        BigInt(parseFloat(this.selectedTransaction.amount) * 1e6) // Convert to USDC wei
      );

      this.simulationResult = simulation;
    } catch (error) {
      console.error('Simulation failed:', error);
      this.simulationResult = {
        success: false,
        gasEstimate: BigInt(0),
        gasPrice: BigInt(0),
        estimatedCost: '0',
        revertReason: 'Simulation failed: ' + (error as Error).message,
        simulatedAt: Date.now()
      };
    } finally {
      this.simulationRunning = false;
    }
  }
}