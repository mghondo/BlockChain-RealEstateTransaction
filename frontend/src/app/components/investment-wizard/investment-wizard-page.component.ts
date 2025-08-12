import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InvestmentWizardComponent } from './investment-wizard.component';
import { PropertyDetails, ContractService } from '../../services/contract.service';
import { InvestmentTransaction } from '../../services/transaction.service';

@Component({
  selector: 'app-investment-wizard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    InvestmentWizardComponent
  ],
  template: `
    <div class="wizard-page-container">
      <!-- Loading State -->
      <div class="loading-container" *ngIf="loading">
        <mat-progress-spinner diameter="60" mode="indeterminate"></mat-progress-spinner>
        <h3>Loading Property Details...</h3>
        <p>Please wait while we prepare your investment wizard.</p>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="error && !loading">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h3>Failed to Load Property</h3>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button mat-raised-button color="primary" (click)="retry()">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
          <button mat-stroked-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to Properties
          </button>
        </div>
      </div>

      <!-- Investment Wizard -->
      <app-investment-wizard
        *ngIf="property && !loading && !error"
        [property]="property"
        (wizardCompleted)="onWizardCompleted($event)"
        (wizardCancelled)="onWizardCancelled()">
      </app-investment-wizard>
    </div>
  `,
  styles: [`
    .wizard-page-container {
      min-height: calc(100vh - 64px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .loading-container,
    .error-container {
      text-align: center;
      max-width: 400px;
      
      h3 {
        margin: 20px 0 12px 0;
        color: #2c3e50;
        font-weight: 600;
      }
      
      p {
        margin: 0 0 24px 0;
        color: #7f8c8d;
        line-height: 1.5;
      }
    }

    .error-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #e74c3c;
      margin-bottom: 20px;
    }

    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      
      button {
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    @media (max-width: 480px) {
      .wizard-page-container {
        padding: 10px;
      }
      
      .error-actions {
        flex-direction: column;
        
        button {
          width: 100%;
        }
      }
    }
  `]
})
export class InvestmentWizardPageComponent implements OnInit, OnDestroy {
  property: PropertyDetails | null = null;
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private propertyAddress = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contractService: ContractService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.propertyAddress = params['address'];
      if (this.propertyAddress) {
        this.loadProperty();
      } else {
        this.error = 'Property address is required';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadProperty(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.property = await this.contractService.getPropertyDetails(this.propertyAddress);
      
      if (!this.property) {
        this.error = 'Property not found or failed to load property details';
      }
    } catch (error) {
      console.error('Failed to load property for investment:', error);
      this.error = 'Failed to load property details. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  retry(): void {
    this.loadProperty();
  }

  goBack(): void {
    this.router.navigate(['/properties']);
  }

  onWizardCompleted(transaction: InvestmentTransaction): void {
    // Navigate to transaction success page or back to property with success message
    this.router.navigate(['/property', this.propertyAddress], {
      queryParams: { 
        investmentComplete: 'true',
        transactionId: transaction.id 
      }
    });
  }

  onWizardCancelled(): void {
    // Navigate back to property detail
    this.router.navigate(['/property', this.propertyAddress]);
  }
}