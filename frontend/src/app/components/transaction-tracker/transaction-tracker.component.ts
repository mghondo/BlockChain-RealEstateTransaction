import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-transaction-tracker',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card class="tracker-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>timeline</mat-icon>
          Transaction Tracker (Coming Soon)
        </mat-card-title>
        <mat-card-subtitle>
          Real-time transaction monitoring and analytics
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="tracker-placeholder">
          <mat-icon class="placeholder-icon">analytics</mat-icon>
          <h3>Transaction Tracking System</h3>
          <p>Advanced transaction monitoring with real-time updates and comprehensive analytics is under development.</p>
          
          <div class="tracker-info">
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Real-time transaction status updates</span>
            </div>
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Cross-chain transaction monitoring</span>
            </div>
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Gas cost optimization suggestions</span>
            </div>
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Transaction simulation and testing</span>
            </div>
          </div>

          <div class="tracker-actions">
            <button mat-raised-button color="primary" (click)="mockTracking()" [disabled]="tracking">
              <mat-spinner *ngIf="tracking" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!tracking">play_arrow</mat-icon>
              Simulate Tracking (Demo)
            </button>
            
            <button mat-stroked-button (click)="cancel()">
              <mat-icon>cancel</mat-icon>
              Cancel
            </button>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .tracker-card {
      max-width: 600px;
      margin: 20px auto;
    }

    .tracker-placeholder {
      text-align: center;
      padding: 40px 20px;
    }

    .placeholder-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #3f51b5;
      margin-bottom: 20px;
    }

    .tracker-placeholder h3 {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .tracker-placeholder p {
      margin: 0 0 32px 0;
      color: #7f8c8d;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .tracker-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 32px;
      text-align: left;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.9rem;
      color: #2c3e50;
    }

    .info-item mat-icon {
      color: #667eea;
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    .tracker-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .tracker-actions button {
      padding: 12px 24px;
      mat-icon, mat-spinner {
        margin-right: 8px;
      }
    }
  `]
})
export class TransactionTrackerComponent {
  @Input() transactionId?: string;
  @Output() transactionSelected = new EventEmitter<any>();
  @Output() simulationRequested = new EventEmitter<void>();

  tracking = false;

  mockTracking(): void {
    this.tracking = true;
    
    // Simulate tracking operation
    setTimeout(() => {
      this.tracking = false;
      this.transactionSelected.emit({
        id: 'demo-transaction-' + Date.now(),
        status: 'completed',
        amount: '1000',
        method: 'direct-ethereum'
      });
    }, 3000);
  }

  cancel(): void {
    // Handle cancel logic
  }
}