import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-crosschain-bridge',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card class="bridge-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>swap_horiz</mat-icon>
          Cross-Chain Bridge (Coming Soon)
        </mat-card-title>
        <mat-card-subtitle>
          Bridge USDC from Polygon to Ethereum
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="bridge-placeholder">
          <mat-icon class="placeholder-icon">construction</mat-icon>
          <h3>Cross-Chain Bridge Feature</h3>
          <p>The cross-chain bridge functionality is under development. For now, please use direct Ethereum investment.</p>
          
          <div class="bridge-info">
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Bridge USDC from Polygon to Ethereum (lower fees)</span>
            </div>
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>Real-time transaction tracking</span>
            </div>
            <div class="info-item">
              <mat-icon>info</mat-icon>
              <span>LayerZero integration for secure messaging</span>
            </div>
          </div>

          <div class="bridge-actions">
            <button mat-raised-button color="primary" (click)="mockBridge()" [disabled]="bridging">
              <mat-spinner *ngIf="bridging" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!bridging">play_arrow</mat-icon>
              Simulate Bridge (Demo)
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
    .bridge-card {
      max-width: 600px;
      margin: 20px auto;
    }

    .bridge-placeholder {
      text-align: center;
      padding: 40px 20px;
    }

    .placeholder-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #ff9800;
      margin-bottom: 20px;
    }

    .bridge-placeholder h3 {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .bridge-placeholder p {
      margin: 0 0 32px 0;
      color: #7f8c8d;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .bridge-info {
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

    .bridge-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .bridge-actions button {
      padding: 12px 24px;
      mat-icon, mat-spinner {
        margin-right: 8px;
      }
    }
  `]
})
export class CrossChainBridgeComponent {
  @Input() bridgeRequest: any = null;
  @Output() bridgeCompleted = new EventEmitter<any>();
  @Output() bridgeCancelled = new EventEmitter<void>();

  bridging = false;

  mockBridge(): void {
    this.bridging = true;
    
    // Simulate a bridge operation
    setTimeout(() => {
      this.bridging = false;
      this.bridgeCompleted.emit({
        id: 'demo-bridge-' + Date.now(),
        status: 'completed',
        amount: '1000',
        fromChain: 137,
        toChain: 1
      });
    }, 3000);
  }

  cancel(): void {
    this.bridgeCancelled.emit();
  }
}