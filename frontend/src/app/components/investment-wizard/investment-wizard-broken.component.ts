import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';

// Component imports
import { ShareCalculatorComponent, ShareCalculation, InvestmentMethod } from '../share-calculator/share-calculator.component';
import { CrossChainBridgeComponent } from '../crosschain-bridge/crosschain-bridge.component';
import { TransactionTrackerComponent } from '../transaction-tracker/transaction-tracker.component';

// Service imports
import { PropertyDetails } from '../../services/contract.service';
import { CrossChainService, BridgeTransaction } from '../../services/crosschain.service';
import { TransactionService, InvestmentTransaction } from '../../services/transaction.service';
import { Web3Service } from '../../services/web3.service';

export interface WizardState {
  currentStep: number;
  property: PropertyDetails | null;
  calculation: ShareCalculation | null;
  method: InvestmentMethod | null;
  bridgeTransaction: BridgeTransaction | null;
  investmentTransaction: InvestmentTransaction | null;
  isCompleted: boolean;
  canProceed: boolean;
}

export interface InvestmentSummary {
  property: PropertyDetails;
  calculation: ShareCalculation;
  method: InvestmentMethod;
  totalCost: string;
  estimatedTime: string;
  gasCosts: string;
  timeline: {
    step: string;
    duration: string;
    description: string;
  }[];
}

@Component({
  selector: 'app-investment-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCheckboxModule,
    ShareCalculatorComponent,
    CrossChainBridgeComponent,
    TransactionTrackerComponent
  ],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false, showError: true }
    }
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
        <mat-stepper 
          [selectedIndex]="wizardState.currentStep" 
          orientation="horizontal"
          class="investment-stepper"
          #stepper>
          
          <!-- Step 1: Property & Share Selection -->
          <mat-step [stepControl]="calculationForm" [editable]="true">
            <form [formGroup]="calculationForm">
              <ng-template matStepLabel>Calculate Investment</ng-template>
              
              <div class="step-content">
                <div class="step-header">
                  <h3>Select Your Investment</h3>
                  <p>Choose your investment amount and method for this property.</p>
                </div>

                <!-- Property Overview -->
                <div class="property-overview" *ngIf="wizardState.property">
                  <div class="property-card">
                    <div class="property-image">
                      <img [src]="wizardState.property.metadata?.image || '/assets/default-property.jpg'" 
                           [alt]="wizardState.property.metadata?.name || 'Property'">
                    </div>
                    <div class="property-details">
                      <h4>{{wizardState.property.metadata?.name || 'Property Investment'}}</h4>
                      <p>{{wizardState.property.metadata?.description || 'Prime real estate investment opportunity'}}</p>
                      <div class="property-metrics">
                        <div class="metric">
                          <span class="label">Total Value</span>
                          <span class="value">${{formatPrice(wizardState.property.config.purchasePrice)}}</span>
                        </div>
                        <div class="metric">
                          <span class="label">Available Shares</span>
                          <span class="value">{{wizardState.property.availableShares}}%</span>
                        </div>
                        <div class="metric">
                          <span class="label">Current Phase</span>
                          <span class="value">{{wizardState.property.currentPhase.name}}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Share Calculator -->
                <app-share-calculator
                  [property]="wizardState.property"
                  (investmentSelected)="onInvestmentSelected($event)"
                  (simulationRequested)="onSimulationRequested($event)">
                </app-share-calculator>

                <div class="step-actions">
                  <button mat-raised-button 
                          color="primary"
                          [disabled]="!wizardState.canProceed"
                          (click)="nextStep()">
                    Next: Review Investment
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Investment Review & Confirmation -->
          <mat-step [stepControl]="reviewForm" [editable]="true">
            <form [formGroup]="reviewForm">
              <ng-template matStepLabel>Review Investment</ng-template>
              
              <div class="step-content">
                <div class="step-header">
                  <h3>Review Your Investment</h3>
                  <p>Please review all details before proceeding with your investment.</p>
                </div>

                <!-- Investment Summary -->
                <div class="investment-summary" *ngIf="investmentSummary">
                  <div class="summary-section">
                    <h4>Investment Details</h4>
                    <div class="summary-grid">
                      <div class="summary-item">
                        <span class="label">Property</span>
                        <span class="value">{{investmentSummary.property.metadata?.name}}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Investment Amount</span>
                        <span class="value highlight">${{investmentSummary.calculation.investmentAmount}}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Ownership Shares</span>
                        <span class="value">{{investmentSummary.calculation.shares}}%</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Investment Method</span>
                        <span class="value">{{investmentSummary.method.name}}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Platform Fee</span>
                        <span class="value">${{investmentSummary.calculation.fees.platformFee}}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">Est. Gas Costs</span>
                        <span class="value">${{investmentSummary.calculation.fees.gasCost}}</span>
                      </div>
                      <div class="summary-item total">
                        <span class="label">Total Cost</span>
                        <span class="value">${{investmentSummary.totalCost}}</span>
                      </div>
                    </div>
                  </div>

                  <div class="summary-section">
                    <h4>Expected Returns</h4>
                    <div class="returns-grid">
                      <div class="return-item">
                        <span class="period">Monthly</span>
                        <span class="amount">${{investmentSummary.calculation.estimatedReturns.monthly}}</span>
                        <span class="yield">~{{getMonthlyYield(investmentSummary)}}%</span>
                      </div>
                      <div class="return-item">
                        <span class="period">Yearly</span>
                        <span class="amount">${{investmentSummary.calculation.estimatedReturns.yearly}}</span>
                        <span class="yield">~{{getYearlyYield(investmentSummary)}}%</span>
                      </div>
                      <div class="return-item">
                        <span class="period">5-Year Projection</span>
                        <span class="amount">${{investmentSummary.calculation.estimatedReturns.fiveYear}}</span>
                        <span class="yield">Total ROI</span>
                      </div>
                    </div>
                  </div>

                  <div class="summary-section">
                    <h4>Investment Timeline</h4>
                    <div class="timeline">
                      <div *ngFor="let item of investmentSummary.timeline" class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                          <div class="timeline-step">{{item.step}}</div>
                          <div class="timeline-duration">{{item.duration}}</div>
                          <div class="timeline-description">{{item.description}}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Risk Disclosure -->
                <div class="risk-disclosure">
                  <h4>
                    <mat-icon>warning</mat-icon>
                    Important Disclosures
                  </h4>
                  <ul>
                    <li>Real estate investments involve risks including potential loss of principal</li>
                    <li>Property values can fluctuate and past performance does not guarantee future results</li>
                    <li>Cross-chain transactions involve smart contract and bridge risks</li>
                    <li>Gas fees are estimates and actual costs may vary</li>
                    <li>Investment returns are projections and not guaranteed</li>
                  </ul>
                  <div class="acknowledgment">
                    <mat-checkbox 
                      formControlName="riskAcknowledged"
                      [required]="true">
                      I acknowledge that I have read and understand the risks involved
                    </mat-checkbox>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-stroked-button (click)="previousStep()">
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button mat-raised-button 
                          color="primary"
                          [disabled]="!reviewForm.valid"
                          (click)="startInvestment()">
                    {{wizardState.method?.id === 'cross-chain-polygon' ? 'Start Bridge' : 'Start Investment'}}
                    <mat-icon>play_arrow</mat-icon>
                  </button>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Bridge (Cross-chain only) -->
          <mat-step [completed]="!needsBridge || bridgeCompleted" *ngIf="needsBridge">
            <ng-template matStepLabel>Bridge USDC</ng-template>
            
            <div class="step-content">
              <div class="step-header">
                <h3>Cross-Chain Bridge</h3>
                <p>Bridge your USDC from Polygon to Ethereum for the investment.</p>
              </div>

              <app-crosschain-bridge
                [bridgeRequest]="bridgeRequest"
                (bridgeCompleted)="onBridgeCompleted($event)"
                (bridgeCancelled)="onBridgeCancelled()">
              </app-crosschain-bridge>

              <div class="step-actions" *ngIf="bridgeCompleted">
                <button mat-stroked-button (click)="previousStep()">
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-raised-button 
                        color="primary"
                        (click)="nextStep()">
                  Continue to Investment
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 4: Execute Investment -->
          <mat-step [completed]="investmentCompleted">
            <ng-template matStepLabel>Execute Investment</ng-template>
            
            <div class="step-content">
              <div class="step-header">
                <h3>Execute Investment</h3>
                <p>Complete your property investment transaction.</p>
              </div>

              <!-- Pre-execution Checklist -->
              <div class="pre-execution-checklist" *ngIf="!investmentStarted">
                <h4>Ready to Invest</h4>
                <div class="checklist-items">
                  <div class="checklist-item">
                    <mat-icon class="check">check_circle</mat-icon>
                    <span>Investment amount: ${{wizardState.calculation?.investmentAmount}}</span>
                  </div>
                  <div class="checklist-item">
                    <mat-icon class="check">check_circle</mat-icon>
                    <span>Property shares: {{wizardState.calculation?.shares}}%</span>
                  </div>
                  <div class="checklist-item" *ngIf="needsBridge">
                    <mat-icon class="check">check_circle</mat-icon>
                    <span>USDC bridged from Polygon</span>
                  </div>
                  <div class="checklist-item">
                    <mat-icon class="check">check_circle</mat-icon>
                    <span>Method: {{wizardState.method?.name}}</span>
                  </div>
                </div>

                <div class="final-confirmation">
                  <button mat-raised-button 
                          color="primary"
                          size="large"
                          (click)="executeInvestment()"
                          [disabled]="executingInvestment">
                    <mat-spinner *ngIf="executingInvestment" diameter="20"></mat-spinner>
                    <mat-icon *ngIf="!executingInvestment">account_balance_wallet</mat-icon>
                    {{executingInvestment ? 'Processing...' : 'Confirm Investment'}}
                  </button>
                </div>
              </div>

              <!-- Transaction Tracker -->
              <app-transaction-tracker
                *ngIf="wizardState.investmentTransaction"
                [transactionId]="wizardState.investmentTransaction.id"
                [showSimulation]="false"
                (transactionSelected)="onTransactionSelected($event)">
              </app-transaction-tracker>

              <div class="step-actions" *ngIf="investmentCompleted">
                <button mat-raised-button 
                        color="primary"
                        (click)="viewReceipt()">
                  <mat-icon>receipt</mat-icon>
                  View Receipt
                </button>
                <button mat-stroked-button (click)="startNewInvestment()">
                  <mat-icon>add</mat-icon>
                  New Investment
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 5: Completion -->
          <mat-step [completed]="wizardState.isCompleted">
            <ng-template matStepLabel>Complete</ng-template>
            
            <div class="step-content completion-content">
              <div class="completion-animation">
                <mat-icon class="success-icon">check_circle</mat-icon>
                <h2>Investment Complete!</h2>
                <p>Congratulations! Your property investment has been successfully processed.</p>
              </div>

              <!-- Investment Receipt -->
              <div class="investment-receipt" *ngIf="wizardState.investmentTransaction?.receipt">
                <h3>Investment Receipt</h3>
                <div class="receipt-details">
                  <div class="receipt-header">
                    <div class="confirmation-number">
                      Confirmation #{{wizardState.investmentTransaction.receipt.confirmationNumber}}
                    </div>
                    <div class="completion-date">
                      {{formatDate(wizardState.investmentTransaction.completionTime || Date.now())}}
                    </div>
                  </div>

                  <div class="receipt-body">
                    <div class="receipt-item">
                      <span class="label">Property:</span>
                      <span class="value">{{wizardState.property?.metadata?.name}}</span>
                    </div>
                    <div class="receipt-item">
                      <span class="label">Investment Amount:</span>
                      <span class="value">${{wizardState.calculation?.investmentAmount}}</span>
                    </div>
                    <div class="receipt-item">
                      <span class="label">Ownership Acquired:</span>
                      <span class="value">{{wizardState.calculation?.shares}}% shares</span>
                    </div>
                    <div class="receipt-item">
                      <span class="label">Transaction Hash:</span>
                      <a [href]="getExplorerUrl(wizardState.investmentTransaction.receipt.finalTxHash)" 
                         target="_blank" 
                         class="tx-link">
                        {{wizardState.investmentTransaction.receipt.finalTxHash}}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Next Steps -->
              <div class="next-steps">
                <h3>What's Next?</h3>
                <div class="steps-grid">
                  <div class="next-step-card">
                    <mat-icon>account_balance_wallet</mat-icon>
                    <h4>Manage Your Investment</h4>
                    <p>View your property shares in your wallet and track performance.</p>
                    <button mat-stroked-button (click)="goToPortfolio()">
                      View Portfolio
                    </button>
                  </div>
                  <div class="next-step-card">
                    <mat-icon>people</mat-icon>
                    <h4>Join Community</h4>
                    <p>Connect with other investors and stay updated on property developments.</p>
                    <button mat-stroked-button (click)="joinCommunity()">
                      Join Discord
                    </button>
                  </div>
                  <div class="next-step-card">
                    <mat-icon>trending_up</mat-icon>
                    <h4>Explore More Properties</h4>
                    <p>Discover other investment opportunities in our marketplace.</p>
                    <button mat-stroked-button (click)="exploreProp
erties()">
                      Browse Properties
                    </button>
                  </div>
                </div>
              </div>

              <div class="completion-actions">
                <button mat-raised-button 
                        color="primary"
                        (click)="downloadReceipt()"
                        *ngIf="wizardState.investmentTransaction?.receipt">
                  <mat-icon>download</mat-icon>
                  Download Receipt
                </button>
                <button mat-stroked-button (click)="resetWizard()">
                  <mat-icon>refresh</mat-icon>
                  Start New Investment
                </button>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./investment-wizard.component.scss']
})
export class InvestmentWizardComponent implements OnInit, OnDestroy {
  @Input() property: PropertyDetails | null = null;
  @Output() wizardCompleted = new EventEmitter<InvestmentTransaction>();
  @Output() wizardCancelled = new EventEmitter<void>();

  // Forms
  calculationForm: FormGroup;
  reviewForm: FormGroup;

  // State
  wizardState: WizardState = {
    currentStep: 0,
    property: null,
    calculation: null,
    method: null,
    bridgeTransaction: null,
    investmentTransaction: null,
    isCompleted: false,
    canProceed: false
  };

  investmentSummary: InvestmentSummary | null = null;
  bridgeRequest: any = null;
  
  // Flags
  needsBridge = false;
  bridgeCompleted = false;
  investmentStarted = false;
  investmentCompleted = false;
  executingInvestment = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private crossChainService: CrossChainService,
    private transactionService: TransactionService,
    private web3Service: Web3Service
  ) {
    this.calculationForm = this.fb.group({
      calculationComplete: [false, Validators.requiredTrue]
    });

    this.reviewForm = this.fb.group({
      riskAcknowledged: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.wizardState.property = this.property;
    this.initializeWizard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeWizard(): void {
    // Reset wizard state
    this.wizardState.currentStep = 0;
    this.wizardState.isCompleted = false;
    this.wizardState.canProceed = false;
  }

  onInvestmentSelected(event: { calculation: ShareCalculation; method: InvestmentMethod }): void {
    this.wizardState.calculation = event.calculation;
    this.wizardState.method = event.method;
    this.wizardState.canProceed = true;
    
    this.calculationForm.patchValue({ calculationComplete: true });
    
    // Generate investment summary
    this.generateInvestmentSummary();
    
    this.needsBridge = event.method.id === 'cross-chain-polygon';
  }

  onSimulationRequested(calculation: ShareCalculation): void {
    // Handle simulation request
    this.snackBar.open('Running transaction simulation...', 'Close', { duration: 3000 });
  }

  private generateInvestmentSummary(): void {
    if (!this.wizardState.property || !this.wizardState.calculation || !this.wizardState.method) {
      return;
    }

    const totalCost = (
      parseFloat(this.wizardState.calculation.investmentAmount) +
      parseFloat(this.wizardState.calculation.fees.totalFees)
    ).toFixed(2);

    const timeline = this.wizardState.method.id === 'cross-chain-polygon' 
      ? [
          { step: 'Bridge Setup', duration: '1-2 min', description: 'Switch to Polygon and approve USDC' },
          { step: 'Cross-Chain Bridge', duration: '5-8 min', description: 'Bridge USDC from Polygon to Ethereum' },
          { step: 'Investment Execution', duration: '2-3 min', description: 'Complete property investment on Ethereum' },
          { step: 'Confirmation', duration: '1 min', description: 'Receive shares and confirmation' }
        ]
      : [
          { step: 'Setup', duration: '1 min', description: 'Approve USDC spending' },
          { step: 'Investment', duration: '2-3 min', description: 'Execute property investment' },
          { step: 'Confirmation', duration: '1 min', description: 'Receive shares and confirmation' }
        ];

    this.investmentSummary = {
      property: this.wizardState.property,
      calculation: this.wizardState.calculation,
      method: this.wizardState.method,
      totalCost,
      estimatedTime: this.wizardState.method.estimatedTime,
      gasCosts: this.wizardState.calculation.fees.gasCost,
      timeline
    };
  }

  startInvestment(): void {
    if (this.needsBridge) {
      this.setupBridge();
    } else {
      this.executeDirectInvestment();
    }
    this.nextStep();
  }

  private setupBridge(): void {
    if (!this.wizardState.property || !this.wizardState.calculation) return;

    this.bridgeRequest = {
      amount: this.wizardState.calculation.investmentAmount,
      shares: this.wizardState.calculation.shares,
      escrowAddress: this.wizardState.property.config.nftAddress, // Using nftAddress as escrow
      fromChain: 137, // Polygon
      toChain: 1 // Ethereum
    };
  }

  onBridgeCompleted(bridgeTransaction: BridgeTransaction): void {
    this.wizardState.bridgeTransaction = bridgeTransaction;
    this.bridgeCompleted = true;
    this.snackBar.open('Bridge completed successfully!', 'Close', { duration: 5000 });
  }

  onBridgeCancelled(): void {
    this.bridgeCompleted = false;
    this.wizardState.bridgeTransaction = null;
    this.snackBar.open('Bridge cancelled', 'Close', { duration: 3000 });
  }

  executeInvestment(): void {
    if (!this.wizardState.property || !this.wizardState.calculation || !this.wizardState.method) {
      return;
    }

    this.executingInvestment = true;
    this.investmentStarted = true;

    // Create investment transaction
    const transaction = this.transactionService.createInvestmentTransaction(
      this.wizardState.property.config.nftAddress,
      this.wizardState.calculation.investmentAmount,
      this.wizardState.calculation.shares,
      this.wizardState.method.id
    );

    this.wizardState.investmentTransaction = transaction;

    // Start executing steps
    this.executeInvestmentSteps(transaction);
  }

  private executeDirectInvestment(): void {
    // Skip to investment execution step
    this.wizardState.currentStep = this.needsBridge ? 3 : 2;
  }

  private async executeInvestmentSteps(transaction: InvestmentTransaction): Promise<void> {
    try {
      // Execute each step
      for (const step of transaction.steps) {
        if (step.status === 'pending') {
          const result$ = this.transactionService.executeStep(transaction.id, step.id);
          await result$.toPromise();
        }
      }

      this.investmentCompleted = true;
      this.executingInvestment = false;
      this.wizardState.isCompleted = true;
      
      this.snackBar.open('Investment completed successfully!', 'Close', { duration: 5000 });
      this.nextStep(); // Move to completion step

    } catch (error) {
      console.error('Investment execution failed:', error);
      this.executingInvestment = false;
      this.snackBar.open('Investment failed: ' + (error as Error).message, 'Close', { duration: 8000 });
    }
  }

  onTransactionSelected(transaction: InvestmentTransaction): void {
    // Handle transaction selection from tracker
    console.log('Transaction selected:', transaction);
  }

  nextStep(): void {
    this.wizardState.currentStep++;
  }

  previousStep(): void {
    this.wizardState.currentStep--;
  }

  viewReceipt(): void {
    if (this.wizardState.investmentTransaction?.receipt) {
      // Open receipt dialog or navigate to receipt view
      this.snackBar.open('Opening investment receipt...', 'Close', { duration: 2000 });
    }
  }

  downloadReceipt(): void {
    if (this.wizardState.investmentTransaction?.receipt) {
      const receiptData = {
        confirmationNumber: this.wizardState.investmentTransaction.receipt.confirmationNumber,
        property: this.wizardState.property?.metadata?.name,
        amount: this.wizardState.calculation?.investmentAmount,
        shares: this.wizardState.calculation?.shares,
        completionTime: this.wizardState.investmentTransaction.completionTime,
        txHash: this.wizardState.investmentTransaction.receipt.finalTxHash
      };

      const dataStr = JSON.stringify(receiptData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `investment-receipt-${receiptData.confirmationNumber}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    }
  }

  startNewInvestment(): void {
    this.resetWizard();
  }

  resetWizard(): void {
    this.wizardState = {
      currentStep: 0,
      property: this.property,
      calculation: null,
      method: null,
      bridgeTransaction: null,
      investmentTransaction: null,
      isCompleted: false,
      canProceed: false
    };

    this.investmentSummary = null;
    this.bridgeRequest = null;
    this.needsBridge = false;
    this.bridgeCompleted = false;
    this.investmentStarted = false;
    this.investmentCompleted = false;
    this.executingInvestment = false;

    this.calculationForm.reset();
    this.reviewForm.reset();
  }

  goToPortfolio(): void {
    // Navigate to portfolio
    this.snackBar.open('Redirecting to portfolio...', 'Close', { duration: 2000 });
  }

  joinCommunity(): void {
    window.open('https://discord.gg/fracestate', '_blank');
  }

  exploreProperties(): void {
    // Navigate to properties list
    this.snackBar.open('Loading properties...', 'Close', { duration: 2000 });
  }

  // Helper methods
  formatPrice(wei: bigint): string {
    const eth = Number(wei) / 1e18;
    return eth.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMonthlyYield(summary: InvestmentSummary): string {
    const monthlyReturn = parseFloat(summary.calculation.estimatedReturns.monthly);
    const investment = parseFloat(summary.calculation.investmentAmount);
    return ((monthlyReturn / investment) * 100).toFixed(1);
  }

  getYearlyYield(summary: InvestmentSummary): string {
    const yearlyReturn = parseFloat(summary.calculation.estimatedReturns.yearly);
    const investment = parseFloat(summary.calculation.investmentAmount);
    return ((yearlyReturn / investment) * 100).toFixed(1);
  }

  getExplorerUrl(txHash: string): string {
    return `https://etherscan.io/tx/${txHash}`;
  }
}