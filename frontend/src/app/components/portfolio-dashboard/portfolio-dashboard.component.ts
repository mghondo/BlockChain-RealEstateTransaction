import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  AnalyticsService, 
  PortfolioMetrics, 
  InvestmentData, 
  TimeSeriesData,
  DiversificationAnalysis,
  YieldProjection 
} from '../../services/analytics.service';

@Component({
  selector: 'app-portfolio-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatProgressBarModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <div class="portfolio-dashboard">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1>Portfolio Dashboard</h1>
          <div class="header-actions">
            <button mat-raised-button color="primary" routerLink="/properties/create">
              <mat-icon>add</mat-icon>
              Create Property
            </button>
            <button mat-stroked-button [matMenuTriggerFor]="exportMenu">
              <mat-icon>download</mat-icon>
              Export
            </button>
            <mat-menu #exportMenu="matMenu">
              <button mat-menu-item (click)="exportReport('pdf')">
                <mat-icon>picture_as_pdf</mat-icon>
                PDF Report
              </button>
              <button mat-menu-item (click)="exportReport('csv')">
                <mat-icon>table_chart</mat-icon>
                CSV Data
              </button>
            </mat-menu>
          </div>
        </div>
        
        <!-- Key Metrics Overview -->
        <div class="metrics-overview" *ngIf="metrics">
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(metrics.totalInvestment) }}</div>
            <div class="metric-label">Total Investment</div>
            <div class="metric-change positive">+{{ metrics.averageROI.toFixed(1) }}% ROI</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(metrics.currentValue) }}</div>
            <div class="metric-label">Current Value</div>
            <div class="metric-change" [class]="getValueChangeClass()">
              {{ getValueChange() }}
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(metrics.totalYield) }}</div>
            <div class="metric-label">Total Yield</div>
            <div class="metric-change positive">+{{ ((metrics.totalYield / metrics.totalInvestment) * 100).toFixed(1) }}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ metrics.projectedAnnualReturn.toFixed(1) }}%</div>
            <div class="metric-label">Projected Annual Return</div>
            <div class="metric-change" [class]="getProjectionClass()">
              {{ getProjectionText() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Main Dashboard Content -->
      <div class="dashboard-content">
        <mat-tab-group class="dashboard-tabs" (selectedTabChange)="onTabChange($event)">
          
          <!-- Overview Tab -->
          <mat-tab label="Overview">
            <div class="tab-content">
              <div class="overview-grid">
                
                <!-- Portfolio Performance Chart -->
                <mat-card class="performance-chart-card">
                  <mat-card-header>
                    <mat-card-title>Portfolio Performance</mat-card-title>
                    <div class="chart-controls">
                      <button mat-button [class.active]="timeframe === '1M'" (click)="setTimeframe('1M')">1M</button>
                      <button mat-button [class.active]="timeframe === '3M'" (click)="setTimeframe('3M')">3M</button>
                      <button mat-button [class.active]="timeframe === '6M'" (click)="setTimeframe('6M')">6M</button>
                      <button mat-button [class.active]="timeframe === '1Y'" (click)="setTimeframe('1Y')">1Y</button>
                    </div>
                  </mat-card-header>
                  <mat-card-content>
                    <div id="performanceChart" class="chart-container"></div>
                  </mat-card-content>
                </mat-card>

                <!-- Diversification Analysis -->
                <mat-card class="diversification-card">
                  <mat-card-header>
                    <mat-card-title>Diversification Analysis</mat-card-title>
                    <div class="diversification-score">
                      <span class="score-value">{{ metrics?.diversificationScore?.toFixed(0) }}/100</span>
                      <mat-progress-bar 
                        mode="determinate" 
                        [value]="metrics?.diversificationScore"
                        [color]="getDiversificationColor()">
                      </mat-progress-bar>
                    </div>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="diversification-charts" *ngIf="diversificationData">
                      <div class="chart-section">
                        <h4>By Property Type</h4>
                        <div id="propertyTypeChart" class="mini-chart"></div>
                        <div class="chart-legend">
                          <span *ngFor="let item of getChartData(diversificationData.byPropertyType)" 
                                class="legend-item">
                            <span class="legend-color" [style.background-color]="getColorForItem(item.label)"></span>
                            {{ item.label }}: {{ item.value }}
                          </span>
                        </div>
                      </div>
                      <div class="chart-section">
                        <h4>By Location</h4>
                        <div id="locationChart" class="mini-chart"></div>
                        <div class="chart-legend">
                          <span *ngFor="let item of getChartData(diversificationData.byLocation)" 
                                class="legend-item">
                            <span class="legend-color" [style.background-color]="getColorForItem(item.label)"></span>
                            {{ item.label }}: {{ item.value }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <!-- Yield Projections -->
                <mat-card class="projections-card">
                  <mat-card-header>
                    <mat-card-title>Yield Projections</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="projections-list" *ngIf="yieldProjections">
                      <div *ngFor="let projection of yieldProjections" class="projection-item">
                        <div class="projection-period">{{ projection.period }}</div>
                        <div class="projection-amount">{{ formatCurrency(projection.estimatedYield) }}</div>
                        <div class="projection-confidence">
                          <mat-progress-bar 
                            mode="determinate" 
                            [value]="projection.confidenceLevel"
                            matTooltip="Confidence Level: {{ projection.confidenceLevel }}%">
                          </mat-progress-bar>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <!-- Recent Activity -->
                <mat-card class="activity-card">
                  <mat-card-header>
                    <mat-card-title>Recent Activity</mat-card-title>
                    <button mat-icon-button routerLink="/transactions">
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="activity-list">
                      <div class="activity-item" *ngFor="let activity of recentActivity">
                        <mat-icon [class]="activity.type">{{ getActivityIcon(activity.type) }}</mat-icon>
                        <div class="activity-content">
                          <div class="activity-title">{{ activity.title }}</div>
                          <div class="activity-description">{{ activity.description }}</div>
                          <div class="activity-time">{{ activity.timestamp | date:'short' }}</div>
                        </div>
                        <div class="activity-amount" *ngIf="activity.amount">
                          {{ formatCurrency(activity.amount) }}
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <!-- Investments Tab -->
          <mat-tab label="Investments">
            <div class="tab-content">
              <mat-card class="investments-table-card">
                <mat-card-header>
                  <mat-card-title>Investment Portfolio</mat-card-title>
                  <div class="table-controls">
                    <button mat-stroked-button (click)="refreshInvestments()">
                      <mat-icon>refresh</mat-icon>
                      Refresh
                    </button>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <table mat-table [dataSource]="investments" class="investments-table">
                    
                    <!-- Property Name Column -->
                    <ng-container matColumnDef="property">
                      <th mat-header-cell *matHeaderCellDef>Property</th>
                      <td mat-cell *matCellDef="let investment">
                        <div class="property-cell">
                          <div class="property-name">{{ investment.propertyName }}</div>
                          <div class="property-location">{{ investment.location }}</div>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Investment Amount Column -->
                    <ng-container matColumnDef="investment">
                      <th mat-header-cell *matHeaderCellDef>Investment</th>
                      <td mat-cell *matCellDef="let investment">
                        <div class="investment-cell">
                          <div class="investment-amount">{{ formatCurrency(investment.investmentAmount) }}</div>
                          <div class="share-count">{{ investment.shares }}% ownership</div>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Current Value Column -->
                    <ng-container matColumnDef="value">
                      <th mat-header-cell *matHeaderCellDef>Current Value</th>
                      <td mat-cell *matCellDef="let investment">
                        <div class="value-cell">
                          <div class="current-value">{{ formatCurrency(investment.currentValue) }}</div>
                          <div class="value-change" [class]="getInvestmentChangeClass(investment)">
                            {{ getInvestmentChange(investment) }}
                          </div>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Yield Column -->
                    <ng-container matColumnDef="yield">
                      <th mat-header-cell *matHeaderCellDef>Yield Earned</th>
                      <td mat-cell *matCellDef="let investment">
                        <div class="yield-cell">
                          <div class="yield-amount">{{ formatCurrency(investment.yieldEarned) }}</div>
                          <div class="yield-rate">{{ investment.roi.toFixed(1) }}% ROI</div>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Property Type Column -->
                    <ng-container matColumnDef="type">
                      <th mat-header-cell *matHeaderCellDef>Type</th>
                      <td mat-cell *matCellDef="let investment">
                        <mat-chip-listbox>
                          <mat-chip-option [disabled]="true" [class]="getPropertyTypeClass(investment.propertyType)">
                            {{ investment.propertyType }}
                          </mat-chip-option>
                        </mat-chip-listbox>
                      </td>
                    </ng-container>

                    <!-- Actions Column -->
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Actions</th>
                      <td mat-cell *matCellDef="let investment">
                        <button mat-icon-button [matMenuTriggerFor]="actionsMenu">
                          <mat-icon>more_vert</mat-icon>
                        </button>
                        <mat-menu #actionsMenu="matMenu">
                          <button mat-menu-item [routerLink]="['/properties', investment.propertyId]">
                            <mat-icon>visibility</mat-icon>
                            View Details
                          </button>
                          <button mat-menu-item (click)="investMore(investment)">
                            <mat-icon>add</mat-icon>
                            Invest More
                          </button>
                          <button mat-menu-item (click)="viewAnalytics(investment)">
                            <mat-icon>analytics</mat-icon>
                            Analytics
                          </button>
                        </mat-menu>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="investment-row"></tr>
                  </table>

                  <div class="no-investments" *ngIf="investments.length === 0">
                    <mat-icon>account_balance</mat-icon>
                    <h3>No Investments Yet</h3>
                    <p>Start building your real estate portfolio today</p>
                    <button mat-raised-button color="primary" routerLink="/properties">
                      Browse Properties
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Analytics Tab -->
          <mat-tab label="Analytics">
            <div class="tab-content">
              <div class="analytics-grid">
                
                <!-- Advanced Metrics -->
                <mat-card class="advanced-metrics-card">
                  <mat-card-header>
                    <mat-card-title>Advanced Analytics</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="advanced-metrics" *ngIf="metrics">
                      <div class="metric-row">
                        <span class="metric-name">Risk Score</span>
                        <div class="metric-value-container">
                          <span class="metric-value">{{ metrics.riskScore.toFixed(1) }}/100</span>
                          <mat-progress-bar 
                            mode="determinate" 
                            [value]="metrics.riskScore"
                            [color]="getRiskColor()">
                          </mat-progress-bar>
                        </div>
                      </div>
                      <div class="metric-row">
                        <span class="metric-name">Diversification Score</span>
                        <div class="metric-value-container">
                          <span class="metric-value">{{ metrics.diversificationScore.toFixed(1) }}/100</span>
                          <mat-progress-bar 
                            mode="determinate" 
                            [value]="metrics.diversificationScore"
                            color="accent">
                          </mat-progress-bar>
                        </div>
                      </div>
                      <div class="metric-row">
                        <span class="metric-name">Portfolio Growth</span>
                        <div class="metric-value-container">
                          <span class="metric-value">{{ getPortfolioGrowth() }}%</span>
                          <mat-progress-bar 
                            mode="determinate" 
                            [value]="Math.abs(getPortfolioGrowthNumber())"
                            [color]="getGrowthColor()">
                          </mat-progress-bar>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <!-- Tax Information -->
                <mat-card class="tax-info-card">
                  <mat-card-header>
                    <mat-card-title>Tax Information</mat-card-title>
                    <button mat-icon-button (click)="generateTaxReport()">
                      <mat-icon>description</mat-icon>
                    </button>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="tax-summary" *ngIf="taxData">
                      <div class="tax-item">
                        <span class="tax-label">Taxable Income ({{ taxData.year }})</span>
                        <span class="tax-value">{{ formatCurrency(taxData.totalIncome) }}</span>
                      </div>
                      <div class="tax-item">
                        <span class="tax-label">Capital Gains</span>
                        <span class="tax-value">{{ formatCurrency(taxData.capitalGains) }}</span>
                      </div>
                      <div class="tax-item">
                        <span class="tax-label">Estimated Deductions</span>
                        <span class="tax-value">{{ formatCurrency(taxData.deductions) }}</span>
                      </div>
                    </div>
                    <button mat-stroked-button (click)="downloadTaxReport()" class="full-width-btn">
                      <mat-icon>download</mat-icon>
                      Download Tax Report
                    </button>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styleUrls: ['./portfolio-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  metrics: PortfolioMetrics | null = null;
  investments: InvestmentData[] = [];
  timeSeries: TimeSeriesData[] = [];
  diversificationData: DiversificationAnalysis | null = null;
  yieldProjections: YieldProjection[] = [];
  taxData: any = null;
  
  timeframe = '6M';
  displayedColumns = ['property', 'investment', 'value', 'yield', 'type', 'actions'];
  
  recentActivity = [
    {
      type: 'investment',
      title: 'Investment Deposit',
      description: 'Luxury Condo Downtown - Earnest Money',
      amount: 25000,
      timestamp: new Date()
    },
    {
      type: 'yield',
      title: 'Yield Payment',
      description: 'Monthly yield from Commercial Office Space',
      amount: 875,
      timestamp: new Date(Date.now() - 86400000)
    },
    {
      type: 'approval',
      title: 'Transaction Approved',
      description: 'Suburban Family Home inspection passed',
      timestamp: new Date(Date.now() - 172800000)
    }
  ];

  constructor(
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // Load portfolio metrics
    this.analyticsService.metrics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(metrics => {
        this.metrics = metrics;
        this.cdr.markForCheck();
      });

    // Load investments
    this.analyticsService.investments$
      .pipe(takeUntil(this.destroy$))
      .subscribe(investments => {
        this.investments = investments;
        this.generateProjections();
        this.generateDiversificationData();
        this.cdr.markForCheck();
      });

    // Load time series data
    this.analyticsService.timeSeries$
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeSeries => {
        this.timeSeries = timeSeries;
        this.renderPerformanceChart();
        this.cdr.markForCheck();
      });

    this.generateTaxData();
  }

  private generateProjections(): void {
    if (this.investments.length > 0) {
      this.yieldProjections = this.analyticsService.generateYieldProjections(this.investments);
    }
  }

  private generateDiversificationData(): void {
    if (this.investments.length > 0) {
      this.diversificationData = this.analyticsService.generateDiversificationAnalysis(this.investments);
      this.renderDiversificationCharts();
    }
  }

  private generateTaxData(): void {
    this.taxData = this.analyticsService.generateTaxReport(new Date().getFullYear());
  }

  private renderPerformanceChart(): void {
    // Chart.js implementation would go here
    // This is a placeholder for the actual chart rendering
    console.log('Rendering performance chart with time series data:', this.timeSeries);
  }

  private renderDiversificationCharts(): void {
    // Chart.js implementation for pie charts would go here
    console.log('Rendering diversification charts:', this.diversificationData);
  }

  // Export functionality
  async exportReport(format: 'pdf' | 'csv'): Promise<void> {
    try {
      await this.analyticsService.exportPortfolioReport(format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  // UI Helper Methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getValueChange(): string {
    if (!this.metrics) return '';
    const change = this.metrics.currentValue - this.metrics.totalInvestment;
    const percentage = (change / this.metrics.totalInvestment) * 100;
    return `${change >= 0 ? '+' : ''}${this.formatCurrency(change)} (${percentage.toFixed(1)}%)`;
  }

  getValueChangeClass(): string {
    if (!this.metrics) return '';
    const change = this.metrics.currentValue - this.metrics.totalInvestment;
    return change >= 0 ? 'positive' : 'negative';
  }

  getProjectionText(): string {
    if (!this.metrics) return '';
    return `${this.metrics.averageROI > this.metrics.projectedAnnualReturn ? 'Above' : 'On'} target`;
  }

  getProjectionClass(): string {
    if (!this.metrics) return '';
    return this.metrics.averageROI > this.metrics.projectedAnnualReturn ? 'positive' : 'neutral';
  }

  getDiversificationColor(): string {
    if (!this.metrics) return 'primary';
    if (this.metrics.diversificationScore >= 70) return 'primary';
    if (this.metrics.diversificationScore >= 40) return 'accent';
    return 'warn';
  }

  getRiskColor(): string {
    if (!this.metrics) return 'primary';
    if (this.metrics.riskScore <= 30) return 'primary';
    if (this.metrics.riskScore <= 60) return 'accent';
    return 'warn';
  }

  getGrowthColor(): string {
    const growth = this.getPortfolioGrowthNumber();
    return growth >= 0 ? 'primary' : 'warn';
  }

  getPortfolioGrowth(): string {
    return this.getPortfolioGrowthNumber().toFixed(1);
  }

  getPortfolioGrowthNumber(): number {
    if (!this.metrics) return 0;
    return ((this.metrics.currentValue - this.metrics.totalInvestment) / this.metrics.totalInvestment) * 100;
  }

  getInvestmentChange(investment: InvestmentData): string {
    const change = investment.currentValue - investment.investmentAmount;
    const percentage = (change / investment.investmentAmount) * 100;
    return `${change >= 0 ? '+' : ''}${this.formatCurrency(change)} (${percentage.toFixed(1)}%)`;
  }

  getInvestmentChangeClass(investment: InvestmentData): string {
    const change = investment.currentValue - investment.investmentAmount;
    return change >= 0 ? 'positive' : 'negative';
  }

  getPropertyTypeClass(type: string): string {
    return `property-type-${type.toLowerCase()}`;
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      'investment': 'account_balance_wallet',
      'yield': 'trending_up',
      'approval': 'check_circle',
      'transfer': 'swap_horiz'
    };
    return icons[type] || 'info';
  }

  getChartData(data: { [key: string]: number }): Array<{label: string, value: number}> {
    return Object.entries(data).map(([label, value]) => ({ label, value }));
  }

  getColorForItem(label: string): string {
    const colors = ['#3f51b5', '#ff4081', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];
    const index = label.length % colors.length;
    return colors[index];
  }

  // Event Handlers
  onTabChange(event: any): void {
    // Handle tab changes if needed
  }

  setTimeframe(period: string): void {
    this.timeframe = period;
    this.renderPerformanceChart();
  }

  refreshInvestments(): void {
    this.loadDashboardData();
  }

  investMore(investment: InvestmentData): void {
    // Navigate to investment flow for this property
  }

  viewAnalytics(investment: InvestmentData): void {
    // Navigate to detailed analytics for this investment
  }

  generateTaxReport(): void {
    this.generateTaxData();
  }

  downloadTaxReport(): void {
    // Generate and download tax report
    console.log('Downloading tax report...');
  }

  // Expose Math for template
  Math = Math;
}