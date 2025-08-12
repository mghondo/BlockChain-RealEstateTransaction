import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, combineLatest, Subject, timer } from 'rxjs';
import { map, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PropertyDetails } from '../../services/contract.service';
import { CrossChainService, GasEstimation } from '../../services/crosschain.service';

export interface ShareCalculation {
  shares: number;
  investmentAmount: string;
  estimatedReturns: {
    monthly: string;
    yearly: string;
    fiveYear: string;
  };
  fees: {
    platformFee: string;
    gasCost: string;
    totalFees: string;
  };
  ownership: {
    percentage: number;
    votingPower: number;
    rentalRights: boolean;
  };
  minimumInvestment: string;
  maximumInvestment: string;
}

export interface InvestmentMethod {
  id: 'direct-ethereum' | 'cross-chain-polygon';
  name: string;
  description: string;
  estimatedTime: string;
  gasEstimate: string;
  advantages: string[];
  requirements: string[];
}

@Component({
  selector: 'app-share-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSliderModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card class="calculator-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>calculate</mat-icon>
          Investment Calculator
        </mat-card-title>
        <mat-card-subtitle>
          Calculate your fractional property investment
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="calculator-content">
          <!-- Property Overview -->
          <div class="property-overview" *ngIf="property">
            <div class="property-info">
              <h3>{{property.metadata?.name || 'Property'}}</h3>
              <div class="property-details">
                <span class="price">${{formatPrice(property.config.purchasePrice)}} Total Value</span>
                <span class="available">{{property.availableShares}} of {{property.totalShares}} shares available</span>
              </div>
            </div>
          </div>

          <!-- Share Selection -->
          <div class="share-selection">
            <h4>Select Your Investment</h4>
            
            <div class="input-methods">
              <div class="input-method" [class.active]="inputMethod === 'percentage'">
                <label>By Percentage</label>
                <mat-form-field>
                  <mat-label>Ownership Percentage</mat-label>
                  <input matInput 
                         type="number" 
                         min="0.1" 
                         [max]="maxPercentage" 
                         step="0.1"
                         [(ngModel)]="percentageInput"
                         (input)="onPercentageChange()"
                         (focus)="inputMethod = 'percentage'">
                  <span matTextSuffix>%</span>
                </mat-form-field>
              </div>

              <div class="input-method" [class.active]="inputMethod === 'amount'">
                <label>By Amount</label>
                <mat-form-field>
                  <mat-label>Investment Amount</mat-label>
                  <input matInput 
                         type="number" 
                         min="100" 
                         [max]="maxAmount"
                         step="100"
                         [(ngModel)]="amountInput"
                         (input)="onAmountChange()"
                         (focus)="inputMethod = 'amount'">
                  <span matTextPrefix>$</span>
                </mat-form-field>
              </div>
            </div>

            <!-- Visual Slider -->
            <div class="slider-container">
              <mat-slider 
                [min]="0.1" 
                [max]="maxPercentage" 
                [step]="0.1"
                [value]="percentageInput"
                (input)="onSliderChange($event)"
                class="percentage-slider">
              </mat-slider>
              <div class="slider-labels">
                <span>0.1%</span>
                <span>{{maxPercentage}}% (Available)</span>
              </div>
            </div>
          </div>

          <!-- Calculation Results -->
          <div class="calculation-results" *ngIf="calculation$ | async as calc">
            <div class="result-grid">
              <div class="result-card investment">
                <div class="result-header">
                  <mat-icon>account_balance_wallet</mat-icon>
                  <h4>Investment Details</h4>
                </div>
                <div class="result-content">
                  <div class="metric">
                    <span class="label">Total Investment</span>
                    <span class="value">${{calc.investmentAmount}}</span>
                  </div>
                  <div class="metric">
                    <span class="label">Property Shares</span>
                    <span class="value">{{calc.shares}}%</span>
                  </div>
                  <div class="metric">
                    <span class="label">Minimum Investment</span>
                    <span class="value">${{calc.minimumInvestment}}</span>
                  </div>
                </div>
              </div>

              <div class="result-card returns">
                <div class="result-header">
                  <mat-icon>trending_up</mat-icon>
                  <h4>Estimated Returns</h4>
                </div>
                <div class="result-content">
                  <div class="metric">
                    <span class="label">Monthly Rental</span>
                    <span class="value">${{calc.estimatedReturns.monthly}}</span>
                  </div>
                  <div class="metric">
                    <span class="label">Yearly Income</span>
                    <span class="value">${{calc.estimatedReturns.yearly}}</span>
                  </div>
                  <div class="metric">
                    <span class="label">5-Year Projection</span>
                    <span class="value">${{calc.estimatedReturns.fiveYear}}</span>
                  </div>
                </div>
              </div>

              <div class="result-card ownership">
                <div class="result-header">
                  <mat-icon>pie_chart</mat-icon>
                  <h4>Ownership Rights</h4>
                </div>
                <div class="result-content">
                  <div class="metric">
                    <span class="label">Voting Power</span>
                    <span class="value">{{calc.ownership.votingPower}}%</span>
                  </div>
                  <div class="metric">
                    <span class="label">Rental Rights</span>
                    <span class="value">{{calc.ownership.rentalRights ? 'Yes' : 'No'}}</span>
                  </div>
                  <div class="metric">
                    <span class="label">Resale Rights</span>
                    <span class="value">Full Rights</span>
                  </div>
                </div>
              </div>

              <div class="result-card fees">
                <div class="result-header">
                  <mat-icon>receipt</mat-icon>
                  <h4>Fees & Costs</h4>
                </div>
                <div class="result-content">
                  <div class="metric">
                    <span class="label">Platform Fee (2%)</span>
                    <span class="value">${{calc.fees.platformFee}}</span>
                  </div>
                  <div class="metric">
                    <span class="label">Est. Gas Cost</span>
                    <span class="value" [class.loading]="loadingGasEstimate">
                      <mat-spinner *ngIf="loadingGasEstimate" diameter="16"></mat-spinner>
                      <span *ngIf="!loadingGasEstimate">${{calc.fees.gasCost}}</span>
                    </span>
                  </div>
                  <div class="metric total">
                    <span class="label">Total Fees</span>
                    <span class="value">${{calc.fees.totalFees}}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Investment Methods -->
          <div class="investment-methods">
            <h4>Choose Investment Method</h4>
            <div class="method-cards">
              <div *ngFor="let method of investmentMethods" 
                   class="method-card"
                   [class.selected]="selectedMethod?.id === method.id"
                   (click)="selectMethod(method)">
                <div class="method-header">
                  <h5>{{method.name}}</h5>
                  <span class="time-estimate">{{method.estimatedTime}}</span>
                </div>
                <p class="method-description">{{method.description}}</p>
                <div class="method-advantages">
                  <div class="advantage" *ngFor="let advantage of method.advantages">
                    <mat-icon>check</mat-icon>
                    <span>{{advantage}}</span>
                  </div>
                </div>
                <div class="gas-estimate">
                  <mat-icon>local_gas_station</mat-icon>
                  <span>Est. Gas: {{method.gasEstimate}}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button mat-raised-button 
                    color="primary" 
                    [disabled]="!isValidInvestment || !selectedMethod"
                    (click)="proceedToInvestment()">
              <mat-icon>investment</mat-icon>
              Invest ${{(calculation$ | async)?.investmentAmount || '0'}}
            </button>
            
            <button mat-stroked-button (click)="simulateInvestment()" [disabled]="!isValidInvestment">
              <mat-icon>play_circle_outline</mat-icon>
              Simulate Transaction
            </button>
          </div>

          <!-- Investment Summary -->
          <div class="investment-summary" *ngIf="showSummary">
            <div class="summary-content">
              <h4>Investment Summary</h4>
              <div class="summary-details">
                <div class="summary-item">
                  <span>Method:</span>
                  <span>{{selectedMethod?.name}}</span>
                </div>
                <div class="summary-item">
                  <span>Amount:</span>
                  <span>${{(calculation$ | async)?.investmentAmount}}</span>
                </div>
                <div class="summary-item">
                  <span>Shares:</span>
                  <span>{{(calculation$ | async)?.shares}}%</span>
                </div>
                <div class="summary-item">
                  <span>Total Cost (incl. fees):</span>
                  <span class="total-cost">${{getTotalCost()}}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./share-calculator.component.scss']
})
export class ShareCalculatorComponent implements OnInit, OnDestroy {
  @Input() property: PropertyDetails | null = null;
  @Output() investmentSelected = new EventEmitter<{
    calculation: ShareCalculation;
    method: InvestmentMethod;
  }>();
  @Output() simulationRequested = new EventEmitter<ShareCalculation>();

  percentageInput = 1.0;
  amountInput = 1000;
  inputMethod: 'percentage' | 'amount' = 'percentage';
  selectedMethod: InvestmentMethod | null = null;
  showSummary = false;
  loadingGasEstimate = false;

  private destroy$ = new Subject<void>();
  private percentageSubject = new BehaviorSubject<number>(1.0);
  private amountSubject = new BehaviorSubject<number>(1000);

  calculation$ = combineLatest([
    this.percentageSubject,
    this.amountSubject
  ]).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    map(([percentage, amount]) => this.calculateShares(percentage, amount)),
    takeUntil(this.destroy$)
  );

  investmentMethods: InvestmentMethod[] = [
    {
      id: 'direct-ethereum',
      name: 'Direct Ethereum',
      description: 'Invest directly using USDC on Ethereum mainnet',
      estimatedTime: '2-3 minutes',
      gasEstimate: '~$15-30',
      advantages: [
        'Faster completion',
        'Lower complexity',
        'Single transaction'
      ],
      requirements: [
        'USDC on Ethereum',
        'ETH for gas fees'
      ]
    },
    {
      id: 'cross-chain-polygon',
      name: 'Cross-Chain from Polygon',
      description: 'Bridge USDC from Polygon to Ethereum for lower costs',
      estimatedTime: '8-12 minutes',
      gasEstimate: '~$5-8',
      advantages: [
        'Lower gas costs',
        'Use Polygon USDC',
        'Automated bridging'
      ],
      requirements: [
        'USDC on Polygon',
        'MATIC for bridge fees'
      ]
    }
  ];

  constructor(private crossChainService: CrossChainService) {}

  ngOnInit(): void {
    this.updateGasEstimates();
    
    // Update gas estimates every 30 seconds
    timer(0, 30000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateGasEstimates();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get maxPercentage(): number {
    return this.property ? this.property.availableShares : 100;
  }

  get maxAmount(): number {
    if (!this.property) return 1000000;
    const totalValue = Number(this.property.config.purchasePrice) / 1e18; // Convert from wei
    return (totalValue * this.maxPercentage) / 100;
  }

  get isValidInvestment(): boolean {
    return this.percentageInput >= 0.1 && 
           this.percentageInput <= this.maxPercentage &&
           this.amountInput >= 100;
  }

  onPercentageChange(): void {
    this.inputMethod = 'percentage';
    if (this.property) {
      const totalValue = Number(this.property.config.purchasePrice) / 1e18;
      this.amountInput = (totalValue * this.percentageInput) / 100;
      this.amountSubject.next(this.amountInput);
    }
    this.percentageSubject.next(this.percentageInput);
    this.updateGasEstimates();
  }

  onAmountChange(): void {
    this.inputMethod = 'amount';
    if (this.property) {
      const totalValue = Number(this.property.config.purchasePrice) / 1e18;
      this.percentageInput = (this.amountInput * 100) / totalValue;
      this.percentageSubject.next(this.percentageInput);
    }
    this.amountSubject.next(this.amountInput);
    this.updateGasEstimates();
  }

  onSliderChange(event: any): void {
    this.percentageInput = event.value;
    this.onPercentageChange();
  }

  selectMethod(method: InvestmentMethod): void {
    this.selectedMethod = method;
    this.showSummary = true;
  }

  private calculateShares(percentage: number, amount: number): ShareCalculation {
    if (!this.property) {
      return this.getDefaultCalculation();
    }

    const totalValue = Number(this.property.config.purchasePrice) / 1e18;
    const investmentAmount = this.inputMethod === 'percentage' 
      ? (totalValue * percentage) / 100
      : amount;
    
    const actualPercentage = this.inputMethod === 'amount'
      ? (amount * 100) / totalValue
      : percentage;

    // Calculate estimated returns (example percentages)
    const monthlyRentYield = 0.008; // 0.8% monthly
    const yearlyAppreciation = 0.05; // 5% yearly
    
    const monthlyReturn = investmentAmount * monthlyRentYield;
    const yearlyReturn = investmentAmount * (monthlyRentYield * 12);
    const fiveYearReturn = investmentAmount * Math.pow(1 + yearlyAppreciation, 5);

    // Calculate fees
    const platformFee = investmentAmount * 0.02; // 2%
    const gasCost = 25; // Will be updated by gas estimation
    const totalFees = platformFee + gasCost;

    return {
      shares: Math.round(actualPercentage * 10) / 10,
      investmentAmount: investmentAmount.toFixed(2),
      estimatedReturns: {
        monthly: monthlyReturn.toFixed(2),
        yearly: yearlyReturn.toFixed(2),
        fiveYear: (fiveYearReturn - investmentAmount).toFixed(2)
      },
      fees: {
        platformFee: platformFee.toFixed(2),
        gasCost: gasCost.toFixed(2),
        totalFees: totalFees.toFixed(2)
      },
      ownership: {
        percentage: Math.round(actualPercentage * 10) / 10,
        votingPower: Math.round(actualPercentage * 10) / 10,
        rentalRights: actualPercentage >= 5 // 5% minimum for rental rights
      },
      minimumInvestment: (totalValue * 0.001).toFixed(2), // 0.1%
      maximumInvestment: (totalValue * this.maxPercentage / 100).toFixed(2)
    };
  }

  private getDefaultCalculation(): ShareCalculation {
    return {
      shares: 1.0,
      investmentAmount: '1000.00',
      estimatedReturns: {
        monthly: '8.00',
        yearly: '96.00',
        fiveYear: '276.28'
      },
      fees: {
        platformFee: '20.00',
        gasCost: '25.00',
        totalFees: '45.00'
      },
      ownership: {
        percentage: 1.0,
        votingPower: 1.0,
        rentalRights: false
      },
      minimumInvestment: '100.00',
      maximumInvestment: '100000.00'
    };
  }

  private async updateGasEstimates(): Promise<void> {
    if (!this.property || !this.isValidInvestment) return;

    this.loadingGasEstimate = true;

    try {
      const gasEstimation = await this.crossChainService.estimateGas(
        this.property.config.nftAddress,
        Math.round(this.percentageInput * 10) / 10,
        this.amountInput.toString()
      );

      // Update method gas estimates
      this.investmentMethods[0].gasEstimate = `~$${(gasEstimation.totalGasUSD * 0.7).toFixed(0)}-${(gasEstimation.totalGasUSD * 1.3).toFixed(0)}`;
      this.investmentMethods[1].gasEstimate = `~$${(gasEstimation.totalGasUSD * 0.3).toFixed(0)}-${(gasEstimation.totalGasUSD * 0.5).toFixed(0)}`;

    } catch (error) {
      console.error('Gas estimation failed:', error);
    } finally {
      this.loadingGasEstimate = false;
    }
  }

  formatPrice(wei: bigint): string {
    const eth = Number(wei) / 1e18;
    return eth.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  }

  getTotalCost(): string {
    const calc$ = this.calculation$;
    // This is a simplified version - in a real implementation you'd subscribe to the observable
    const baseAmount = parseFloat(this.amountInput.toString());
    const fees = 45; // Simplified
    return (baseAmount + fees).toFixed(2);
  }

  proceedToInvestment(): void {
    if (!this.isValidInvestment || !this.selectedMethod) return;

    this.calculation$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(calculation => {
      this.investmentSelected.emit({
        calculation,
        method: this.selectedMethod!
      });
    });
  }

  simulateInvestment(): void {
    if (!this.isValidInvestment) return;

    this.calculation$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(calculation => {
      this.simulationRequested.emit(calculation);
    });
  }
}