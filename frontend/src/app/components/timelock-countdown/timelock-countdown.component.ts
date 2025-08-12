import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelockAction } from '../../services/blockchain-events-simple.service';

interface CountdownDisplay {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formattedTime: string;
}

@Component({
  selector: 'app-timelock-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timelock-countdown" [class.compact]="compact">
      <div class="countdown-header" *ngIf="!compact">
        <div class="action-info">
          <h4>{{ getActionTitle() }}</h4>
          <p class="action-description">{{ getActionDescription() }}</p>
        </div>
        <div class="status-badge" [class]="getStatusClass()">
          {{ getStatusText() }}
        </div>
      </div>

      <div class="countdown-display" *ngIf="timelock?.isPending && !countdown.isExpired">
        <div class="time-units">
          <div class="time-unit" *ngIf="countdown.days > 0">
            <span class="time-value">{{ countdown.days }}</span>
            <span class="time-label">{{ countdown.days === 1 ? 'Day' : 'Days' }}</span>
          </div>
          <div class="time-unit">
            <span class="time-value">{{ countdown.hours.toString().padStart(2, '0') }}</span>
            <span class="time-label">Hours</span>
          </div>
          <div class="time-unit">
            <span class="time-value">{{ countdown.minutes.toString().padStart(2, '0') }}</span>
            <span class="time-label">Minutes</span>
          </div>
          <div class="time-unit">
            <span class="time-value">{{ countdown.seconds.toString().padStart(2, '0') }}</span>
            <span class="time-label">Seconds</span>
          </div>
        </div>

        <div class="progress-bar">
          <div 
            class="progress-fill" 
            [style.width.%]="getProgressPercentage()">
          </div>
        </div>

        <div class="time-info">
          <div class="execute-time">
            <span class="label">Execute After:</span>
            <span class="time">{{ formatExecuteTime() }}</span>
          </div>
          <div class="remaining-time">
            <span class="label">Time Remaining:</span>
            <span class="time" [class.warning]="countdown.totalSeconds < 3600">
              {{ countdown.formattedTime }}
            </span>
          </div>
        </div>
      </div>

      <div class="countdown-ready" *ngIf="timelock?.isPending && countdown.isExpired">
        <div class="ready-icon">⏰</div>
        <div class="ready-content">
          <h4>Action Ready</h4>
          <p>The timelock period has ended. {{ getActionTitle() }} can now be executed.</p>
          <button 
            class="execute-button"
            [class]="getActionButtonClass()"
            (click)="onExecuteAction()">
            Execute {{ getActionTitle() }}
          </button>
        </div>
      </div>

      <div class="countdown-inactive" *ngIf="!timelock?.isPending">
        <div class="inactive-content">
          <div class="inactive-icon">🔒</div>
          <span>No active timelock</span>
        </div>
      </div>

      <div class="compact-display" *ngIf="compact && timelock?.isPending">
        <div class="compact-time" [class.expired]="countdown.isExpired">
          <span class="compact-icon">⏱️</span>
          <span class="compact-text" *ngIf="!countdown.isExpired">
            {{ countdown.formattedTime }} remaining
          </span>
          <span class="compact-text ready" *ngIf="countdown.isExpired">
            Ready to execute
          </span>
        </div>
      </div>
    </div>
  `,
  styleUrl: './timelock-countdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelockCountdownComponent implements OnInit, OnDestroy {
  @Input() timelock: TimelockAction | null = null;
  @Input() compact: boolean = false;
  @Input() showExecuteButton: boolean = true;

  countdown: CountdownDisplay = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
    formattedTime: '00:00:00'
  };

  private intervalId: number | null = null;
  private readonly TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in ms

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.updateCountdown();
    this.intervalId = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateCountdown(): void {
    if (!this.timelock?.isPending) {
      this.countdown = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: false,
        formattedTime: '00:00:00'
      };
      this.cdr.detectChanges();
      return;
    }

    const now = Date.now();
    const timeRemaining = Math.max(0, this.timelock.executeAfter - now);
    const isExpired = timeRemaining === 0;

    if (isExpired) {
      this.countdown = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
        formattedTime: 'Ready'
      };
    } else {
      const totalSeconds = Math.floor(timeRemaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      this.countdown = {
        days,
        hours,
        minutes,
        seconds,
        totalSeconds,
        isExpired: false,
        formattedTime: this.formatTimeRemaining(days, hours, minutes, seconds)
      };
    }

    this.cdr.detectChanges();
  }

  private formatTimeRemaining(days: number, hours: number, minutes: number, seconds: number): string {
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getProgressPercentage(): number {
    if (!this.timelock?.isPending) return 0;
    
    const totalDuration = this.TWENTY_FOUR_HOURS;
    const elapsed = totalDuration - this.countdown.totalSeconds * 1000;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  getActionTitle(): string {
    if (!this.timelock?.actionType) return 'Unknown Action';
    
    switch (this.timelock.actionType) {
      case 'FINALIZE_SALE':
        return 'Finalize Sale';
      case 'CANCEL_SALE':
        return 'Cancel Sale';
      default:
        return this.timelock.actionType.replace('_', ' ');
    }
  }

  getActionDescription(): string {
    if (!this.timelock?.actionType) return '';
    
    switch (this.timelock.actionType) {
      case 'FINALIZE_SALE':
        return 'Complete the property sale and transfer ownership';
      case 'CANCEL_SALE':
        return 'Cancel the transaction and refund all parties';
      default:
        return 'Execute the pending blockchain action';
    }
  }

  getStatusText(): string {
    if (!this.timelock?.isPending) return 'Inactive';
    if (this.countdown.isExpired) return 'Ready';
    return 'Pending';
  }

  getStatusClass(): string {
    if (!this.timelock?.isPending) return 'inactive';
    if (this.countdown.isExpired) return 'ready';
    return 'pending';
  }

  getActionButtonClass(): string {
    if (!this.timelock?.actionType) return 'primary';
    
    switch (this.timelock.actionType) {
      case 'FINALIZE_SALE':
        return 'success';
      case 'CANCEL_SALE':
        return 'danger';
      default:
        return 'primary';
    }
  }

  formatExecuteTime(): string {
    if (!this.timelock?.executeAfter) return '';
    
    const executeDate = new Date(this.timelock.executeAfter);
    return executeDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  onExecuteAction(): void {
    if (!this.timelock?.actionType || !this.countdown.isExpired) return;
    
    // Emit event for parent component to handle
    console.log('Execute action:', this.timelock.actionType);
    // This would typically emit an event or call a service method
  }
}