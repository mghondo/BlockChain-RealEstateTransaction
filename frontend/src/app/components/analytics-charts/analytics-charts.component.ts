import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartEvent,
  ChartType,
  registerables,
  TooltipItem,
  ScriptableContext,
  ActiveElement
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import { TimeSeriesData, InvestmentData, PortfolioMetrics } from '../../services/analytics.service';

Chart.register(...registerables);

export interface ChartOptions {
  title: string;
  type: ChartType;
  responsive: boolean;
  maintainAspectRatio: boolean;
  height?: number;
  colors?: string[];
  animate?: boolean;
}

export interface ChartDataset {
  label: string;
  data: any[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

@Component({
  selector: 'app-analytics-charts',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
    <div class="analytics-charts">
      
      <!-- Portfolio Performance Chart -->
      <mat-card class="chart-card performance-chart" *ngIf="showPortfolioPerformance">
        <mat-card-header>
          <mat-card-title>Portfolio Performance</mat-card-title>
          <mat-card-subtitle>Investment value over time</mat-card-subtitle>
          <div class="chart-controls">
            <mat-form-field appearance="outline" class="period-selector">
              <mat-label>Period</mat-label>
              <mat-select [(value)]="selectedPeriod" (selectionChange)="onPeriodChange()">
                <mat-option value="1M">1 Month</mat-option>
                <mat-option value="3M">3 Months</mat-option>
                <mat-option value="6M">6 Months</mat-option>
                <mat-option value="1Y">1 Year</mat-option>
                <mat-option value="ALL">All Time</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-icon-button [matMenuTriggerFor]="chartMenu" matTooltip="Chart options">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #chartMenu="matMenu">
              <button mat-menu-item (click)="downloadChart('performance')">
                <mat-icon>download</mat-icon>
                Download Chart
              </button>
              <button mat-menu-item (click)="toggleChartType('performance')">
                <mat-icon>show_chart</mat-icon>
                Change Chart Type
              </button>
              <button mat-menu-item (click)="refreshChart('performance')">
                <mat-icon>refresh</mat-icon>
                Refresh Data
              </button>
            </mat-menu>
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas #performanceChart></canvas>
          </div>
          <div class="chart-metrics" *ngIf="performanceMetrics">
            <div class="metric-item">
              <span class="metric-label">Total Return</span>
              <span class="metric-value" [class]="performanceMetrics.totalReturn >= 0 ? 'positive' : 'negative'">
                {{ formatPercentage(performanceMetrics.totalReturn) }}
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Volatility</span>
              <span class="metric-value">{{ formatPercentage(performanceMetrics.volatility) }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Sharpe Ratio</span>
              <span class="metric-value">{{ performanceMetrics.sharpeRatio.toFixed(2) }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Yield Distribution Chart -->
      <mat-card class="chart-card yield-chart" *ngIf="showYieldDistribution">
        <mat-card-header>
          <mat-card-title>Yield Distribution</mat-card-title>
          <mat-card-subtitle>Yield earned by property</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas #yieldChart></canvas>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Diversification Pie Chart -->
      <mat-card class="chart-card diversification-chart" *ngIf="showDiversification">
        <mat-card-header>
          <mat-card-title>Portfolio Diversification</mat-card-title>
          <mat-card-subtitle>Asset allocation breakdown</mat-card-subtitle>
          <div class="chart-controls">
            <mat-form-field appearance="outline" class="category-selector">
              <mat-label>Category</mat-label>
              <mat-select [(value)]="diversificationCategory" (selectionChange)="onCategoryChange()">
                <mat-option value="propertyType">Property Type</mat-option>
                <mat-option value="location">Location</mat-option>
                <mat-option value="valueRange">Value Range</mat-option>
                <mat-option value="riskLevel">Risk Level</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas #diversificationChart></canvas>
          </div>
          <div class="diversification-legend" *ngIf="diversificationData">
            <div *ngFor="let item of getDiversificationItems()" 
                 class="legend-item"
                 [style.border-left-color]="item.color">
              <span class="legend-label">{{ item.label }}</span>
              <span class="legend-value">{{ item.count }} ({{ item.percentage }}%)</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- ROI Comparison Chart -->
      <mat-card class="chart-card roi-chart" *ngIf="showROIComparison">
        <mat-card-header>
          <mat-card-title>ROI Comparison</mat-card-title>
          <mat-card-subtitle>Return on investment by property</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas #roiChart></canvas>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Market Trends Chart -->
      <mat-card class="chart-card trends-chart" *ngIf="showMarketTrends">
        <mat-card-header>
          <mat-card-title>Market Trends</mat-card-title>
          <mat-card-subtitle>Real estate market indicators</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas #trendsChart></canvas>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Risk Analysis Chart -->
      <mat-card class="chart-card risk-chart" *ngIf="showRiskAnalysis">
        <mat-card-header>
          <mat-card-title>Risk Analysis</mat-card-title>
          <mat-card-subtitle>Risk vs Return scatter plot</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-container">
            <canvas #riskChart></canvas>
          </div>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styleUrls: ['./analytics-charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsChartsComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('performanceChart', { static: false }) performanceChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('yieldChart', { static: false }) yieldChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('diversificationChart', { static: false }) diversificationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('roiChart', { static: false }) roiChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trendsChart', { static: false }) trendsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('riskChart', { static: false }) riskChartRef!: ElementRef<HTMLCanvasElement>;

  @Input() timeSeriesData: TimeSeriesData[] = [];
  @Input() investments: InvestmentData[] = [];
  @Input() portfolioMetrics: PortfolioMetrics | null = null;
  @Input() diversificationData: any = null;

  @Input() showPortfolioPerformance = true;
  @Input() showYieldDistribution = true;
  @Input() showDiversification = true;
  @Input() showROIComparison = true;
  @Input() showMarketTrends = false;
  @Input() showRiskAnalysis = false;

  private destroy$ = new Subject<void>();
  private charts: Map<string, Chart> = new Map();

  selectedPeriod = '6M';
  diversificationCategory = 'propertyType';

  performanceMetrics: {
    totalReturn: number;
    volatility: number;
    sharpeRatio: number;
  } | null = null;

  private colorPalette = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
    '#e0c3fc', '#9bb5ff', '#ffd89b', '#19547b'
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initialize charts after view init
    setTimeout(() => {
      this.initializeCharts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['timeSeriesData'] || changes['investments'] || changes['portfolioMetrics']) {
      setTimeout(() => {
        this.updateCharts();
      });
    }
  }

  private initializeCharts(): void {
    if (this.showPortfolioPerformance && this.performanceChartRef) {
      this.createPerformanceChart();
    }
    if (this.showYieldDistribution && this.yieldChartRef) {
      this.createYieldChart();
    }
    if (this.showDiversification && this.diversificationChartRef) {
      this.createDiversificationChart();
    }
    if (this.showROIComparison && this.roiChartRef) {
      this.createROIChart();
    }
    if (this.showMarketTrends && this.trendsChartRef) {
      this.createTrendsChart();
    }
    if (this.showRiskAnalysis && this.riskChartRef) {
      this.createRiskChart();
    }
  }

  private updateCharts(): void {
    this.updatePerformanceChart();
    this.updateYieldChart();
    this.updateDiversificationChart();
    this.updateROIChart();
    this.updateTrendsChart();
    this.updateRiskChart();
  }

  private createPerformanceChart(): void {
    const canvas = this.performanceChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const filteredData = this.getFilteredTimeSeriesData();
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: filteredData.map(d => d.date),
        datasets: [
          {
            label: 'Portfolio Value',
            data: filteredData.map(d => d.value),
            borderColor: this.colorPalette[0],
            backgroundColor: this.colorPalette[0] + '20',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
          },
          {
            label: 'Total Yield',
            data: filteredData.map(d => d.yield),
            borderColor: this.colorPalette[1],
            backgroundColor: this.colorPalette[1] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: this.colorPalette[0],
            borderWidth: 1,
            callbacks: {
              label: (context: TooltipItem<'line'>) => {
                return `${context.dataset.label}: $${this.formatNumber(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy'
              }
            },
            title: {
              display: true,
              text: 'Date'
            },
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Value ($)'
            },
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        elements: {
          point: {
            hoverBackgroundColor: 'white',
            hoverBorderWidth: 2
          }
        }
      }
    };

    this.destroyChart('performance');
    this.charts.set('performance', new Chart(ctx, config));
    
    this.calculatePerformanceMetrics(filteredData);
  }

  private createYieldChart(): void {
    const canvas = this.yieldChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const yieldData = this.investments.map(inv => ({
      label: inv.propertyName,
      value: inv.yieldEarned
    })).sort((a, b) => b.value - a.value);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: yieldData.map(d => d.label),
        datasets: [{
          label: 'Yield Earned',
          data: yieldData.map(d => d.value),
          backgroundColor: yieldData.map((_, index) => this.colorPalette[index % this.colorPalette.length]),
          borderColor: yieldData.map((_, index) => this.colorPalette[index % this.colorPalette.length]),
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              label: (context: TooltipItem<'bar'>) => {
                return `Yield: $${this.formatNumber(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Properties'
            },
            ticks: {
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Yield ($)'
            },
            ticks: {
              callback: (value: any) => '$' + this.formatNumber(value)
            }
          }
        }
      }
    };

    this.destroyChart('yield');
    this.charts.set('yield', new Chart(ctx, config));
  }

  private createDiversificationChart(): void {
    const canvas = this.diversificationChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const diversificationItems = this.getDiversificationItems();

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: diversificationItems.map(item => item.label),
        datasets: [{
          data: diversificationItems.map(item => item.count),
          backgroundColor: diversificationItems.map(item => item.color),
          borderColor: 'white',
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              label: (context: TooltipItem<'doughnut'>) => {
                const total = context.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                const percentage = ((Number(context.parsed) / Number(total)) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    };

    this.destroyChart('diversification');
    this.charts.set('diversification', new Chart(ctx, config));
  }

  private createROIChart(): void {
    const canvas = this.roiChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const roiData = this.investments.map(inv => ({
      label: inv.propertyName,
      roi: inv.roi,
      investment: inv.investmentAmount
    })).sort((a, b) => b.roi - a.roi);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: roiData.map(d => d.label),
        datasets: [{
          label: 'ROI (%)',
          data: roiData.map(d => d.roi),
          backgroundColor: roiData.map(d => 
            d.roi >= 10 ? '#10b981' : d.roi >= 5 ? '#f59e0b' : '#ef4444'
          ),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              label: (context: TooltipItem<'bar'>) => {
                const investment = roiData[context.dataIndex].investment;
                return [
                  `ROI: ${context.parsed.y.toFixed(1)}%`,
                  `Investment: $${this.formatNumber(investment)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Properties'
            },
            ticks: {
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'ROI (%)'
            },
            ticks: {
              callback: (value: any) => value + '%'
            }
          }
        }
      }
    };

    this.destroyChart('roi');
    this.charts.set('roi', new Chart(ctx, config));
  }

  private createTrendsChart(): void {
    const canvas = this.trendsChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mock market trends data
    const trendsData = this.generateMockTrendsData();

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: trendsData.map(d => d.date),
        datasets: [
          {
            label: 'Property Index',
            data: trendsData.map(d => d.propertyIndex),
            borderColor: this.colorPalette[2],
            backgroundColor: this.colorPalette[2] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.4
          },
          {
            label: 'Interest Rates',
            data: trendsData.map(d => d.interestRate),
            borderColor: this.colorPalette[3],
            backgroundColor: this.colorPalette[3] + '20',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                month: 'MMM yyyy'
              }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Property Index'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Interest Rate (%)'
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (value: any) => value + '%'
            }
          }
        }
      }
    };

    this.destroyChart('trends');
    this.charts.set('trends', new Chart(ctx, config));
  }

  private createRiskChart(): void {
    const canvas = this.riskChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const riskData = this.investments.map(inv => ({
      x: this.calculateRiskScore(inv),
      y: inv.roi,
      label: inv.propertyName,
      investment: inv.investmentAmount
    }));

    const config: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Properties',
          data: riskData,
          backgroundColor: riskData.map((_, index) => this.colorPalette[index % this.colorPalette.length]),
          borderColor: riskData.map((_, index) => this.colorPalette[index % this.colorPalette.length]),
          pointRadius: 8,
          pointHoverRadius: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              label: (context: TooltipItem<'scatter'>) => {
                const point = riskData[context.dataIndex];
                return [
                  point.label,
                  `Risk Score: ${point.x.toFixed(1)}`,
                  `ROI: ${point.y.toFixed(1)}%`,
                  `Investment: $${this.formatNumber(point.investment)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Risk Score'
            },
            min: 0,
            max: 100
          },
          y: {
            title: {
              display: true,
              text: 'ROI (%)'
            },
            ticks: {
              callback: (value: any) => value + '%'
            }
          }
        }
      }
    };

    this.destroyChart('risk');
    this.charts.set('risk', new Chart(ctx, config));
  }

  private getFilteredTimeSeriesData(): TimeSeriesData[] {
    if (!this.timeSeriesData.length) return [];

    const now = new Date();
    let startDate = new Date();

    switch (this.selectedPeriod) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
      default:
        return this.timeSeriesData;
    }

    return this.timeSeriesData.filter(d => new Date(d.date) >= startDate);
  }

  private calculatePerformanceMetrics(data: TimeSeriesData[]): void {
    if (data.length < 2) return;

    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const currentValue = data[i].value;
      const previousValue = data[i - 1].value;
      const dailyReturn = (currentValue - previousValue) / previousValue;
      returns.push(dailyReturn);
    }

    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
    const avgReturn = totalReturn / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    const sharpeRatio = avgReturn / (volatility || 1) * Math.sqrt(252);

    this.performanceMetrics = {
      totalReturn: totalReturn * 100,
      volatility: volatility * 100,
      sharpeRatio
    };

    this.cdr.markForCheck();
  }

  private calculateRiskScore(investment: InvestmentData): number {
    // Simple risk score calculation based on property characteristics
    let score = 50; // Base score

    // Adjust based on property type
    const propertyTypeRisk = {
      'Residential': -10,
      'Commercial': 0,
      'Industrial': 15,
      'Mixed-Use': 5,
      'Retail': 10
    };
    score += propertyTypeRisk[investment.propertyType as keyof typeof propertyTypeRisk] || 0;

    // Adjust based on ROI (higher ROI = higher risk)
    if (investment.roi > 15) score += 20;
    else if (investment.roi > 10) score += 10;
    else if (investment.roi < 5) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private generateMockTrendsData() {
    const data = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      data.push({
        date,
        propertyIndex: 100 + Math.sin(i * 0.5) * 10 + Math.random() * 5,
        interestRate: 3.5 + Math.sin(i * 0.3) * 1.5 + Math.random() * 0.5
      });
    }

    return data;
  }

  private updatePerformanceChart(): void {
    const chart = this.charts.get('performance');
    if (chart && this.timeSeriesData.length > 0) {
      const filteredData = this.getFilteredTimeSeriesData();
      chart.data.labels = filteredData.map(d => d.date);
      chart.data.datasets[0].data = filteredData.map(d => d.value);
      chart.data.datasets[1].data = filteredData.map(d => d.yield);
      chart.update();
      this.calculatePerformanceMetrics(filteredData);
    }
  }

  private updateYieldChart(): void {
    const chart = this.charts.get('yield');
    if (chart && this.investments.length > 0) {
      const yieldData = this.investments.map(inv => ({
        label: inv.propertyName,
        value: inv.yieldEarned
      })).sort((a, b) => b.value - a.value);

      chart.data.labels = yieldData.map(d => d.label);
      chart.data.datasets[0].data = yieldData.map(d => d.value);
      chart.update();
    }
  }

  private updateDiversificationChart(): void {
    const chart = this.charts.get('diversification');
    if (chart) {
      const diversificationItems = this.getDiversificationItems();
      chart.data.labels = diversificationItems.map(item => item.label);
      chart.data.datasets[0].data = diversificationItems.map(item => item.count);
      chart.update();
    }
  }

  private updateROIChart(): void {
    const chart = this.charts.get('roi');
    if (chart && this.investments.length > 0) {
      const roiData = this.investments.map(inv => ({
        label: inv.propertyName,
        roi: inv.roi
      })).sort((a, b) => b.roi - a.roi);

      chart.data.labels = roiData.map(d => d.label);
      chart.data.datasets[0].data = roiData.map(d => d.roi);
      chart.update();
    }
  }

  private updateTrendsChart(): void {
    // Trends chart uses mock data, so no updates needed for now
  }

  private updateRiskChart(): void {
    const chart = this.charts.get('risk');
    if (chart && this.investments.length > 0) {
      const riskData = this.investments.map(inv => ({
        x: this.calculateRiskScore(inv),
        y: inv.roi,
        label: inv.propertyName,
        investment: inv.investmentAmount
      }));

      chart.data.datasets[0].data = riskData;
      chart.update();
    }
  }

  getDiversificationItems(): Array<{label: string, count: number, percentage: string, color: string}> {
    if (!this.investments.length) return [];

    let data: {[key: string]: number} = {};

    switch (this.diversificationCategory) {
      case 'propertyType':
        data = this.investments.reduce((acc, inv) => {
          acc[inv.propertyType] = (acc[inv.propertyType] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});
        break;
      case 'location':
        data = this.investments.reduce((acc, inv) => {
          const location = inv.location.split(',')[1]?.trim() || inv.location;
          acc[location] = (acc[location] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});
        break;
      case 'valueRange':
        data = this.investments.reduce((acc, inv) => {
          const range = this.getValueRange(inv.investmentAmount);
          acc[range] = (acc[range] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});
        break;
      case 'riskLevel':
        data = this.investments.reduce((acc, inv) => {
          const risk = this.getRiskLevel(this.calculateRiskScore(inv));
          acc[risk] = (acc[risk] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});
        break;
    }

    const total = Object.values(data).reduce((sum, count) => sum + count, 0);

    return Object.entries(data).map(([label, count], index) => ({
      label,
      count,
      percentage: ((count / total) * 100).toFixed(1),
      color: this.colorPalette[index % this.colorPalette.length]
    }));
  }

  private getValueRange(amount: number): string {
    if (amount < 10000) return 'Under $10K';
    if (amount < 25000) return '$10K - $25K';
    if (amount < 50000) return '$25K - $50K';
    if (amount < 100000) return '$50K - $100K';
    return 'Over $100K';
  }

  private getRiskLevel(score: number): string {
    if (score < 25) return 'Low Risk';
    if (score < 50) return 'Medium Risk';
    if (score < 75) return 'High Risk';
    return 'Very High Risk';
  }

  private destroyChart(key: string): void {
    const chart = this.charts.get(key);
    if (chart) {
      chart.destroy();
      this.charts.delete(key);
    }
  }

  private destroyAllCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }

  // Event Handlers
  onPeriodChange(): void {
    this.updatePerformanceChart();
  }

  onCategoryChange(): void {
    this.updateDiversificationChart();
  }

  downloadChart(chartType: string): void {
    const chart = this.charts.get(chartType);
    if (chart) {
      const url = chart.toBase64Image();
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chartType}-chart.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  toggleChartType(chartType: string): void {
    // Implementation for changing chart types
    console.log(`Toggle chart type for: ${chartType}`);
  }

  refreshChart(chartType: string): void {
    // Implementation for refreshing chart data
    console.log(`Refresh chart: ${chartType}`);
    this.updateCharts();
  }

  // Utility Methods
  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(num);
  }

  formatPercentage(num: number): string {
    return (num >= 0 ? '+' : '') + num.toFixed(2) + '%';
  }
}