import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EscrowPhase } from '../../services/blockchain-events-simple.service';

@Component({
  selector: 'app-phase-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phase-indicator">
      <div class="phase-header">
        <h3>Transaction Phase</h3>
        <div class="current-phase">
          <span class="phase-name">{{ currentPhase?.name || 'Loading...' }}</span>
          <span class="phase-id">Phase {{ currentPhase?.id ?? '-' }}</span>
        </div>
      </div>

      <div class="progress-bar">
        <div 
          class="progress-fill" 
          [style.width.%]="getProgressPercentage()">
        </div>
      </div>

      <div class="phase-steps">
        <div 
          *ngFor="let phase of phases; trackBy: trackByPhaseId"
          class="phase-step"
          [class.completed]="isPhaseCompleted(phase.id)"
          [class.current]="isCurrentPhase(phase.id)"
          [class.upcoming]="isPhaseUpcoming(phase.id)"
          [class.cancelled]="currentPhase?.id === 5 && phase.id !== 5">
          
          <div class="step-indicator">
            <div class="step-circle">
              <ng-container [ngSwitch]="getPhaseStatus(phase.id)">
                <span *ngSwitchCase="'completed'" class="icon">✓</span>
                <span *ngSwitchCase="'current'" class="icon">{{ phase.id }}</span>
                <span *ngSwitchCase="'cancelled'" class="icon">✗</span>
                <span *ngSwitchDefault class="icon">{{ phase.id }}</span>
              </ng-container>
            </div>
            <div class="step-connector" *ngIf="phase.id < 5"></div>
          </div>

          <div class="step-content">
            <div class="step-title">{{ phase.name }}</div>
            <div class="step-description">{{ phase.description }}</div>
            <div class="step-timestamp" *ngIf="isPhaseCompleted(phase.id) || isCurrentPhase(phase.id)">
              {{ formatTimestamp(getPhaseTimestamp(phase.id)) }}
            </div>
          </div>
        </div>
      </div>

      <div class="phase-details" *ngIf="currentPhase">
        <div class="detail-card">
          <h4>Current Status</h4>
          <p>{{ currentPhase.description }}</p>
          <div class="status-meta">
            <span class="status-time">
              Updated: {{ formatTimestamp(currentPhase.timestamp) }}
            </span>
          </div>
        </div>
      </div>

      <div class="phase-actions" *ngIf="showActions && currentPhase">
        <ng-container [ngSwitch]="currentPhase.id">
          <div *ngSwitchCase="0" class="action-hint">
            <span class="hint-icon">💡</span>
            Waiting for seller to initialize buyers and shares
          </div>
          <div *ngSwitchCase="1" class="action-hint">
            <span class="hint-icon">🔍</span>
            Property inspection in progress
          </div>
          <div *ngSwitchCase="2" class="action-hint">
            <span class="hint-icon">💰</span>
            Ready for lender to deposit remaining funds
          </div>
          <div *ngSwitchCase="3" class="action-hint">
            <span class="hint-icon">⏰</span>
            Transaction can be finalized after timelock period
          </div>
          <div *ngSwitchCase="4" class="action-hint success">
            <span class="hint-icon">✅</span>
            Transaction completed successfully!
          </div>
          <div *ngSwitchCase="5" class="action-hint cancelled">
            <span class="hint-icon">❌</span>
            Transaction was cancelled - funds refunded
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styleUrl: './phase-indicator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhaseIndicatorComponent {
  @Input() currentPhase: EscrowPhase | null = null;
  @Input() showActions: boolean = true;
  @Input() compact: boolean = false;

  readonly phases = [
    { id: 0, name: 'Created', description: 'Escrow contract deployed' },
    { id: 1, name: 'Earnest Deposited', description: 'Buyers deposited earnest money' },
    { id: 2, name: 'Approved', description: 'All parties approved transaction' },
    { id: 3, name: 'Fully Funded', description: 'Property fully funded by lender' },
    { id: 4, name: 'Completed', description: 'Transaction finalized successfully' },
    { id: 5, name: 'Cancelled', description: 'Transaction cancelled and refunded' }
  ];

  trackByPhaseId(index: number, phase: any): number {
    return phase.id;
  }

  getProgressPercentage(): number {
    if (!this.currentPhase) return 0;
    
    if (this.currentPhase.id === 5) return 100; // Cancelled
    if (this.currentPhase.id === 4) return 100; // Completed
    
    return Math.min(100, (this.currentPhase.id / 4) * 100);
  }

  isPhaseCompleted(phaseId: number): boolean {
    if (!this.currentPhase) return false;
    
    if (this.currentPhase.id === 5) {
      return phaseId === 5;
    }
    
    return phaseId < this.currentPhase.id;
  }

  isCurrentPhase(phaseId: number): boolean {
    return this.currentPhase?.id === phaseId;
  }

  isPhaseUpcoming(phaseId: number): boolean {
    if (!this.currentPhase) return false;
    
    if (this.currentPhase.id === 5) {
      return false;
    }
    
    return phaseId > this.currentPhase.id && phaseId !== 5;
  }

  getPhaseStatus(phaseId: number): string {
    if (!this.currentPhase) return 'upcoming';
    
    if (this.currentPhase.id === 5) {
      return phaseId === 5 ? 'current' : 'cancelled';
    }
    
    if (phaseId < this.currentPhase.id) return 'completed';
    if (phaseId === this.currentPhase.id) return 'current';
    
    return 'upcoming';
  }

  getPhaseTimestamp(phaseId: number): number {
    if (!this.currentPhase) return 0;
    
    if (phaseId === this.currentPhase.id) {
      return this.currentPhase.timestamp;
    }
    
    return 0;
  }

  formatTimestamp(timestamp: number): string {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}