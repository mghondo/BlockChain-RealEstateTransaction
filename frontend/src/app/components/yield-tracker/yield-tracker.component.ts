import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';

import { BlockchainEventsService, EscrowEvent } from '../../services/blockchain-events-simple.service';
import { ContractService } from '../../services/contract.service';

export interface YieldData {
  currentBalance: number;
  principalAmount: number;
  totalYield: number;
  dailyYield: number;
  apy: number;
  yieldHistory: YieldSnapshot[];
  projectedYield: number;
}

export interface YieldSnapshot {
  timestamp: number;
  balance: number;
  yield: number;
  apy: number;
}

@Component({
  selector: 'app-yield-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="yield-tracker">
      <div class="tracker-header">
        <h3>Aave Yield Tracker</h3>
        <div class="last-update">
          Last updated: {{ formatTime(lastUpdate) }}
        </div>
      </div>

      <div class="yield-summary" *ngIf="yieldData">
        <div class="summary-cards">
          <div class="yield-card primary">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <span class="card-label">Total Balance</span>
              <span class="card-value">\${{ yieldData.currentBalance | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="yield-card success">
            <div class="card-icon">📈</div>
            <div class="card-content">
              <span class="card-label">Total Yield</span>
              <span class="card-value">\${{ yieldData.totalYield | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="yield-card info">
            <div class="card-icon">🔄</div>
            <div class="card-content">
              <span class="card-label">Current APY</span>
              <span class="card-value">{{ yieldData.apy | number:'1.2-2' }}%</span>
            </div>
          </div>

          <div class="yield-card warning">
            <div class="card-icon">⚡</div>
            <div class="card-content">
              <span class="card-label">Daily Yield</span>
              <span class="card-value">\${{ yieldData.dailyYield | number:'1.4-4' }}</span>
            </div>
          </div>
        </div>

        <div class="yield-breakdown">
          <h4>Yield Breakdown</h4>
          <div class="breakdown-chart">
            <div class="chart-bar">
              <div class="bar-segment principal" [style.width.%]="getPrincipalPercentage()">
                <span class="segment-label" *ngIf="getPrincipalPercentage() > 15">
                  Principal
                </span>
              </div>
              <div class="bar-segment yield" [style.width.%]="getYieldPercentage()">
                <span class="segment-label" *ngIf="getYieldPercentage() > 15">
                  Yield
                </span>
              </div>
            </div>
            <div class="chart-legend">
              <div class="legend-item">
                <div class="legend-color principal"></div>
                <span>Principal: \${{ yieldData.principalAmount | number:'1.2-2' }}</span>
              </div>
              <div class="legend-item">
                <div class="legend-color yield"></div>
                <span>Yield: \${{ yieldData.totalYield | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="yield-projections">
          <h4>Yield Projections</h4>
          <div class="projections-grid">
            <div class="projection-item">
              <span class="projection-period">1 Week</span>
              <span class="projection-amount">+\${{ getProjectedYield(7) | number:'1.4-4' }}</span>
            </div>
            <div class="projection-item">
              <span class="projection-period">1 Month</span>
              <span class="projection-amount">+\${{ getProjectedYield(30) | number:'1.2-2' }}</span>
            </div>
            <div class="projection-item">
              <span class="projection-period">3 Months</span>
              <span class="projection-amount">+\${{ getProjectedYield(90) | number:'1.2-2' }}</span>
            </div>
            <div class="projection-item">
              <span class="projection-period">1 Year</span>
              <span class="projection-amount">+\${{ getProjectedYield(365) | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="yield-history" *ngIf="yieldData && yieldData.yieldHistory && yieldData.yieldHistory.length > 0">
        <h4>Yield History</h4>
        <div class="history-chart">
          <div class="chart-container">
            <div 
              *ngFor="let snapshot of getRecentHistory(); let i = index"
              class="history-point"
              [style.left.%]="(i / (getRecentHistory().length - 1)) * 100"
              [style.bottom.%]="getHistoryPointHeight(snapshot)"
              [title]="formatHistoryTooltip(snapshot)">
              <div class="point-marker"></div>
            </div>
            <svg class="history-line" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline 
                [attr.points]="getHistoryLinePoints()"
                fill="none" 
                stroke="#3b82f6" 
                stroke-width="1"
                vector-effect="non-scaling-stroke">
              </polyline>
            </svg>
          </div>
          <div class="chart-labels">
            <span class="label-start">{{ formatChartDate(getEarliestSnapshot()?.timestamp) }}</span>
            <span class="label-end">{{ formatChartDate(getLatestSnapshot()?.timestamp) }}</span>
          </div>
        </div>
      </div>

      <div class="yield-events" *ngIf="yieldEvents.length > 0">
        <h4>Recent Yield Events</h4>
        <div class="events-list">
          <div 
            *ngFor="let event of yieldEvents.slice(0, 5)"
            class="event-item">
            <div class="event-icon">{{ getEventIcon(event.type) }}</div>
            <div class="event-content">
              <div class="event-title">{{ getEventTitle(event.type) }}</div>
              <div class="event-time">{{ formatTime(event.timestamp) }}</div>
            </div>
            <div class="event-amount" *ngIf="getEventAmount(event)">
              +\${{ getEventAmount(event) | number:'1.4-4' }}
            </div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <span>Loading yield data...</span>
      </div>

      <div class="error-state" *ngIf="hasError">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-title">Unable to load yield data</div>
          <div class="error-message">{{ errorMessage }}</div>
          <button class="retry-btn" (click)="loadYieldData()">Retry</button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './yield-tracker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YieldTrackerComponent implements OnInit, OnDestroy {
  @Input() escrowAddress = '';
  @Input() currentYield = 0;

  yieldData: YieldData | null = null;
  yieldEvents: EscrowEvent[] = [];
  lastUpdate = Date.now();
  isLoading = false;
  hasError = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private readonly AAVE_USDC_APY = 3.85; // Current Aave USDC APY (placeholder)

  constructor(
    private blockchainEventsService: BlockchainEventsService,
    private contractService: ContractService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadYieldData();
    this.subscribeToYieldEvents();
    this.startPeriodicUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadYieldData(): Promise<void> {
    if (!this.escrowAddress) return;

    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges();

    try {
      const currentBalance = await this.blockchainEventsService.getYieldBalance(this.escrowAddress);
      const escrowDetails = await this.contractService.getEscrowDetails(this.escrowAddress);
      
      const principalAmount = Number(escrowDetails.escrowAmount) / 1e6; // Convert from USDC decimals
      const totalYield = Math.max(0, currentBalance - principalAmount);
      const dailyYield = (principalAmount * this.AAVE_USDC_APY / 100) / 365;

      // Generate some sample history data (in a real app, this would come from historical events)
      const yieldHistory = this.generateSampleHistory(principalAmount);

      this.yieldData = {
        currentBalance,
        principalAmount,
        totalYield,
        dailyYield,
        apy: this.AAVE_USDC_APY,
        yieldHistory,
        projectedYield: dailyYield * 30 // 30 days projection
      };

      this.lastUpdate = Date.now();
      this.isLoading = false;
      this.cdr.detectChanges();

    } catch (error: any) {
      console.error('Error loading yield data:', error);
      this.hasError = true;
      this.errorMessage = error?.message || 'Failed to load yield data';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private generateSampleHistory(principalAmount: number): YieldSnapshot[] {
    const history: YieldSnapshot[] = [];
    const now = Date.now();
    const daysBack = 30;
    
    for (let i = daysBack; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const daysElapsed = daysBack - i;
      const accruedYield = (principalAmount * this.AAVE_USDC_APY / 100 / 365) * daysElapsed;
      
      history.push({
        timestamp,
        balance: principalAmount + accruedYield,
        yield: accruedYield,
        apy: this.AAVE_USDC_APY
      });
    }
    
    return history;
  }

  private subscribeToYieldEvents(): void {
    this.blockchainEventsService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event.escrowAddress === this.escrowAddress && this.isYieldRelatedEvent(event.type)) {
          this.yieldEvents.unshift(event);
          this.yieldEvents = this.yieldEvents.slice(0, 10); // Keep only recent events
          this.cdr.detectChanges();
        }
      });
  }

  private startPeriodicUpdates(): void {
    // Update yield data every 5 minutes
    interval(5 * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadYieldData();
      });
  }

  private isYieldRelatedEvent(eventType: string): boolean {
    const yieldEvents = ['YieldEarned', 'EarnestMoneyDeposited', 'FullPriceFunded'];
    return yieldEvents.includes(eventType);
  }

  getPrincipalPercentage(): number {
    if (!this.yieldData) return 0;
    return (this.yieldData.principalAmount / this.yieldData.currentBalance) * 100;
  }

  getYieldPercentage(): number {
    if (!this.yieldData) return 0;
    return (this.yieldData.totalYield / this.yieldData.currentBalance) * 100;
  }

  getProjectedYield(days: number): number {
    if (!this.yieldData) return 0;
    return this.yieldData.dailyYield * days;
  }

  getRecentHistory(): YieldSnapshot[] {
    if (!this.yieldData?.yieldHistory) return [];
    return this.yieldData.yieldHistory.slice(-20); // Show last 20 data points
  }

  getHistoryPointHeight(snapshot: YieldSnapshot): number {
    const history = this.getRecentHistory();
    if (history.length === 0) return 0;
    
    const min = Math.min(...history.map(h => h.balance));
    const max = Math.max(...history.map(h => h.balance));
    const range = max - min;
    
    if (range === 0) return 50;
    
    return ((snapshot.balance - min) / range) * 80 + 10; // 10% margin
  }

  getHistoryLinePoints(): string {
    const history = this.getRecentHistory();
    if (history.length === 0) return '';
    
    return history
      .map((snapshot, index) => {
        const x = (index / (history.length - 1)) * 100;
        const y = 100 - this.getHistoryPointHeight(snapshot);
        return `${x},${y}`;
      })
      .join(' ');
  }

  getEarliestSnapshot(): YieldSnapshot | undefined {
    const history = this.getRecentHistory();
    return history[0];
  }

  getLatestSnapshot(): YieldSnapshot | undefined {
    const history = this.getRecentHistory();
    return history[history.length - 1];
  }

  formatChartDate(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatHistoryTooltip(snapshot: YieldSnapshot): string {
    const date = new Date(snapshot.timestamp).toLocaleDateString();
    return `${date}: $${snapshot.balance.toFixed(4)} (Yield: $${snapshot.yield.toFixed(4)})`;
  }

  getEventIcon(eventType: string): string {
    const icons: { [key: string]: string } = {
      'YieldEarned': '💰',
      'EarnestMoneyDeposited': '📈',
      'FullPriceFunded': '🚀'
    };
    return icons[eventType] || '📊';
  }

  getEventTitle(eventType: string): string {
    const titles: { [key: string]: string } = {
      'YieldEarned': 'Yield Earned',
      'EarnestMoneyDeposited': 'Funds Deposited',
      'FullPriceFunded': 'Fully Funded'
    };
    return titles[eventType] || eventType;
  }

  getEventAmount(event: EscrowEvent): number {
    // Extract amount from event data (this would depend on actual event structure)
    return 0; // Placeholder
  }

  formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }
}