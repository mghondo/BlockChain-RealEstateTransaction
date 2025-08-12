import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Service imports
import { PropertyDetails } from '../../services/contract.service';
import { TransactionService, InvestmentTransaction } from '../../services/transaction.service';

@Component({
  selector: 'app-investment-wizard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <mat-card class="wizard-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>trending_up</mat-icon>
          Investment Wizard
        </mat-card-title>
        <mat-card-subtitle>
          Complete your fractional property investment
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- Property Overview -->
        <div class="property-overview" *ngIf="property">
          <h3>{{property.metadata?.name || 'Property Investment'}}</h3>
          <p>{{property.metadata?.description || 'Prime real estate investment opportunity'}}</p>
          
          <div class="property-metrics">
            <div class="metric">
              <span class="label">Total Value</span>
              <span class="value">{{formatPrice(property.config.purchasePrice)}}</span>
            </div>
            <div class="metric">
              <span class="label">Available Shares</span>
              <span class="value">{{property.availableShares}}%</span>
            </div>
            <div class="metric">
              <span class="label">Current Phase</span>
              <span class="value">{{property.currentPhase.name}}</span>
            </div>
          </div>
        </div>

        <!-- Simple Investment Interface -->
        <div class="investment-interface">
          <h4>Investment Options</h4>
          <p>Choose your investment method:</p>
          
          <div class="investment-buttons">
            <button mat-raised-button color="primary" (click)="startDirectInvestment()">
              <mat-icon>account_balance_wallet</mat-icon>
              Direct Ethereum Investment
            </button>
            
            <button mat-raised-button color="accent" (click)="startCrossChainInvestment()">
              <mat-icon>swap_horiz</mat-icon>
              Cross-Chain from Polygon
            </button>
          </div>
          
          <div class="investment-info">
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Direct investment uses USDC on Ethereum (higher gas fees)</span>
            </div>
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Cross-chain investment bridges USDC from Polygon (lower fees)</span>
            </div>
          </div>
        </div>

        <!-- Transaction Status -->
        <div class="transaction-status" *ngIf="currentTransaction">
          <h4>Investment Progress</h4>
          <div class="status-card">
            <div class="status-header">
              <mat-icon>{{getStatusIcon(currentTransaction.overallStatus)}}</mat-icon>
              <span>{{getStatusText(currentTransaction.overallStatus)}}</span>
            </div>
            <p>Transaction ID: {{currentTransaction.id}}</p>
            
            <div class="progress-steps">
              <div *ngFor="let step of currentTransaction.steps" 
                   class="step-item"
                   [class.completed]="step.status === 'completed'"
                   [class.active]="step.status === 'in-progress'"
                   [class.failed]="step.status === 'failed'">
                <mat-icon>{{getStepIcon(step.status)}}</mat-icon>
                <span>{{step.title}}</span>
                <mat-spinner *ngIf="step.status === 'in-progress'" diameter="20"></mat-spinner>
              </div>
            </div>
          </div>
        </div>

        <!-- Back to Property Button -->
        <div class="wizard-actions">
          <button mat-stroked-button (click)="goBackToProperty()">
            <mat-icon>arrow_back</mat-icon>
            Back to Property
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .wizard-card {
      max-width: 800px;
      margin: 20px auto;
    }

    .property-overview {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .property-overview h3 {
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .property-overview p {
      margin: 0 0 16px 0;
      color: #7f8c8d;
    }

    .property-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .metric {
      text-align: center;
      padding: 12px;
      background: white;
      border-radius: 6px;
    }

    .metric .label {
      display: block;
      font-size: 0.8rem;
      color: #7f8c8d;
      margin-bottom: 4px;
    }

    .metric .value {
      display: block;
      font-weight: 600;
      color: #2c3e50;
    }

    .investment-interface {
      margin-bottom: 24px;
    }

    .investment-interface h4 {
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .investment-interface p {
      margin: 0 0 20px 0;
      color: #7f8c8d;
    }

    .investment-buttons {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .investment-buttons button {
      flex: 1;
      padding: 16px;
    }

    .investment-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: #7f8c8d;
    }

    .info-item mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .transaction-status {
      margin-bottom: 24px;
    }

    .transaction-status h4 {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .status-card {
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-weight: 600;
    }

    .progress-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .step-item.completed {
      background: #d4edda;
      color: #155724;
    }

    .step-item.active {
      background: #e3f2fd;
      color: #0c5460;
    }

    .step-item.failed {
      background: #f8d7da;
      color: #721c24;
    }

    .wizard-actions {
      text-align: center;
    }

    @media (max-width: 768px) {
      .wizard-card {
        margin: 10px;
      }
      
      .property-metrics {
        grid-template-columns: 1fr;
      }
      
      .investment-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class InvestmentWizardComponent implements OnInit, OnDestroy {
  @Input() property: PropertyDetails | null = null;
  @Output() wizardCompleted = new EventEmitter<InvestmentTransaction>();
  @Output() wizardCancelled = new EventEmitter<void>();

  currentTransaction: InvestmentTransaction | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private transactionService: TransactionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Monitor user transactions
    this.transactionService.getUserTransactions().pipe(
      takeUntil(this.destroy$)
    ).subscribe(transactions => {
      // Find the most recent active transaction
      const activeTransaction = transactions.find(tx => 
        tx.overallStatus === 'pending' || tx.overallStatus === 'in-progress'
      );
      
      if (activeTransaction) {
        this.currentTransaction = activeTransaction;
        
        // Check if transaction completed
        if (activeTransaction.overallStatus === 'completed') {
          this.wizardCompleted.emit(activeTransaction);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startDirectInvestment(): void {
    if (!this.property) return;

    this.snackBar.open('Starting direct Ethereum investment...', 'Close', { duration: 3000 });
    
    // Create transaction for direct investment
    this.currentTransaction = this.transactionService.createInvestmentTransaction(
      this.property.config.nftAddress,
      '1000', // Default amount
      5, // Default 5% shares
      'direct-ethereum'
    );

    // Start executing the transaction
    this.executeTransaction();
  }

  startCrossChainInvestment(): void {
    if (!this.property) return;

    this.snackBar.open('Starting cross-chain investment from Polygon...', 'Close', { duration: 3000 });
    
    // Create transaction for cross-chain investment
    this.currentTransaction = this.transactionService.createInvestmentTransaction(
      this.property.config.nftAddress,
      '1000', // Default amount
      5, // Default 5% shares
      'cross-chain-polygon'
    );

    // Start executing the transaction
    this.executeTransaction();
  }

  private async executeTransaction(): Promise<void> {
    if (!this.currentTransaction) return;

    try {
      // Execute each step of the transaction
      for (const step of this.currentTransaction.steps) {
        if (step.status === 'pending') {
          const result$ = this.transactionService.executeStep(
            this.currentTransaction.id, 
            step.id
          );
          
          await result$;
        }
      }
      
      this.snackBar.open('Investment completed successfully!', 'Close', { duration: 5000 });
      
    } catch (error) {
      console.error('Transaction execution failed:', error);
      this.snackBar.open('Investment failed: ' + (error as Error).message, 'Close', { 
        duration: 8000 
      });
    }
  }

  goBackToProperty(): void {
    this.wizardCancelled.emit();
  }

  formatPrice(wei: bigint): string {
    const eth = Number(wei) / 1e18;
    return `$${eth.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    })}`;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'hourglass_empty';
      case 'in-progress': return 'sync';
      case 'completed': return 'check_circle';
      case 'failed': return 'error';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Investment Pending';
      case 'in-progress': return 'Investment In Progress';
      case 'completed': return 'Investment Completed';
      case 'failed': return 'Investment Failed';
      case 'cancelled': return 'Investment Cancelled';
      default: return 'Unknown Status';
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
}