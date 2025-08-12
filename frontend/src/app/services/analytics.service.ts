import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
// import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvestmentData {
  propertyId: string;
  propertyName: string;
  investmentAmount: number;
  currentValue: number;
  shares: number;
  acquisitionDate: Date;
  yieldEarned: number;
  roi: number;
  propertyType: string;
  location: string;
}

export interface PortfolioMetrics {
  totalInvestment: number;
  currentValue: number;
  totalYield: number;
  averageROI: number;
  diversificationScore: number;
  riskScore: number;
  projectedAnnualReturn: number;
}

export interface TimeSeriesData {
  date: Date;
  value: number;
  yield: number;
  properties: number;
}

export interface YieldProjection {
  period: string;
  estimatedYield: number;
  confidenceLevel: number;
  factors: string[];
}

export interface DiversificationAnalysis {
  byPropertyType: { [key: string]: number };
  byLocation: { [key: string]: number };
  byValueRange: { [key: string]: number };
  riskDistribution: { [key: string]: number };
}

export interface TaxReportData {
  year: number;
  totalIncome: number;
  capitalGains: number;
  deductions: number;
  transactions: Array<{
    date: Date;
    type: 'purchase' | 'sale' | 'yield';
    amount: number;
    property: string;
    taxable: boolean;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private investmentsSubject = new BehaviorSubject<InvestmentData[]>([]);
  public investments$ = this.investmentsSubject.asObservable();

  private metricsSubject = new BehaviorSubject<PortfolioMetrics | null>(null);
  public metrics$ = this.metricsSubject.asObservable();

  private timeSeriesSubject = new BehaviorSubject<TimeSeriesData[]>([]);
  public timeSeries$ = this.timeSeriesSubject.asObservable();

  constructor() {
    this.loadMockData();
  }

  private loadMockData(): void {
    const mockInvestments: InvestmentData[] = [
      {
        propertyId: '1',
        propertyName: 'Luxury Condo Downtown',
        investmentAmount: 25000,
        currentValue: 27500,
        shares: 25,
        acquisitionDate: new Date('2024-01-15'),
        yieldEarned: 1250,
        roi: 11.0,
        propertyType: 'Residential',
        location: 'New York, NY'
      },
      {
        propertyId: '2',
        propertyName: 'Commercial Office Space',
        investmentAmount: 50000,
        currentValue: 54000,
        shares: 20,
        acquisitionDate: new Date('2024-03-20'),
        yieldEarned: 2100,
        roi: 12.2,
        propertyType: 'Commercial',
        location: 'San Francisco, CA'
      },
      {
        propertyId: '3',
        propertyName: 'Suburban Family Home',
        investmentAmount: 15000,
        currentValue: 16200,
        shares: 30,
        acquisitionDate: new Date('2024-06-10'),
        yieldEarned: 450,
        roi: 11.0,
        propertyType: 'Residential',
        location: 'Austin, TX'
      }
    ];

    this.investmentsSubject.next(mockInvestments);
    this.calculateMetrics(mockInvestments);
    this.generateTimeSeriesData(mockInvestments);
  }

  private calculateMetrics(investments: InvestmentData[]): void {
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalYield = investments.reduce((sum, inv) => sum + inv.yieldEarned, 0);
    const averageROI = investments.reduce((sum, inv) => sum + inv.roi, 0) / investments.length;

    const diversificationScore = this.calculateDiversificationScore(investments);
    const riskScore = this.calculateRiskScore(investments);
    const projectedAnnualReturn = this.calculateProjectedReturn(investments);

    const metrics: PortfolioMetrics = {
      totalInvestment,
      currentValue,
      totalYield,
      averageROI,
      diversificationScore,
      riskScore,
      projectedAnnualReturn
    };

    this.metricsSubject.next(metrics);
  }

  private calculateDiversificationScore(investments: InvestmentData[]): number {
    const typeDistribution = this.groupBy(investments, 'propertyType');
    const locationDistribution = this.groupBy(investments, 'location');
    
    const typeEntropy = this.calculateEntropy(Object.values(typeDistribution));
    const locationEntropy = this.calculateEntropy(Object.values(locationDistribution));
    
    return Math.min(100, (typeEntropy + locationEntropy) * 50);
  }

  private calculateRiskScore(investments: InvestmentData[]): number {
    const roiVariance = this.calculateVariance(investments.map(inv => inv.roi));
    const maxVariance = 100; // Assume max variance for normalization
    return Math.min(100, (roiVariance / maxVariance) * 100);
  }

  private calculateProjectedReturn(investments: InvestmentData[]): number {
    const recentROIs = investments.map(inv => inv.roi);
    const averageROI = recentROIs.reduce((sum, roi) => sum + roi, 0) / recentROIs.length;
    
    // Apply some growth factors and market conditions
    const marketFactor = 1.02; // 2% market growth assumption
    const platformFactor = 1.01; // 1% platform efficiency
    
    return averageROI * marketFactor * platformFactor;
  }

  private generateTimeSeriesData(investments: InvestmentData[]): void {
    const timeSeriesData: TimeSeriesData[] = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      const relevantInvestments = investments.filter(inv => inv.acquisitionDate <= d);
      
      const totalValue = relevantInvestments.reduce((sum, inv) => {
        const daysSinceAcquisition = Math.floor((d.getTime() - inv.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
        const growthFactor = 1 + (inv.roi / 100) * (daysSinceAcquisition / 365);
        return sum + (inv.investmentAmount * growthFactor);
      }, 0);

      const totalYield = relevantInvestments.reduce((sum, inv) => {
        const daysSinceAcquisition = Math.floor((d.getTime() - inv.acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
        const yieldEarned = inv.investmentAmount * (inv.roi / 100) * (daysSinceAcquisition / 365);
        return sum + Math.max(0, yieldEarned);
      }, 0);

      timeSeriesData.push({
        date: new Date(d),
        value: totalValue,
        yield: totalYield,
        properties: relevantInvestments.length
      });
    }

    this.timeSeriesSubject.next(timeSeriesData);
  }

  calculateCompoundYield(principal: number, rate: number, compound: number, time: number): number {
    return principal * Math.pow((1 + rate / compound), compound * time) - principal;
  }

  generateYieldProjections(investments: InvestmentData[]): YieldProjection[] {
    const baseYield = investments.reduce((sum, inv) => sum + inv.yieldEarned, 0);
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.investmentAmount, 0);
    const currentAPY = (baseYield / totalInvestment) * 100;

    return [
      {
        period: '1 Month',
        estimatedYield: this.calculateCompoundYield(totalInvestment, currentAPY / 100, 12, 1/12),
        confidenceLevel: 95,
        factors: ['Historical yield data', 'Market conditions', 'Aave rates']
      },
      {
        period: '3 Months',
        estimatedYield: this.calculateCompoundYield(totalInvestment, currentAPY / 100, 4, 0.25),
        confidenceLevel: 88,
        factors: ['Historical yield data', 'Seasonal trends', 'Economic indicators']
      },
      {
        period: '6 Months',
        estimatedYield: this.calculateCompoundYield(totalInvestment, currentAPY / 100, 2, 0.5),
        confidenceLevel: 75,
        factors: ['Market volatility', 'Interest rate changes', 'Property market trends']
      },
      {
        period: '1 Year',
        estimatedYield: this.calculateCompoundYield(totalInvestment, currentAPY / 100, 1, 1),
        confidenceLevel: 65,
        factors: ['Economic cycles', 'Real estate market', 'DeFi protocol changes']
      }
    ];
  }

  generateDiversificationAnalysis(investments: InvestmentData[]): DiversificationAnalysis {
    const byPropertyType = this.groupBy(investments, 'propertyType');
    const byLocation = this.groupBy(investments, 'location');
    
    const byValueRange = investments.reduce((acc, inv) => {
      const range = this.getValueRange(inv.investmentAmount);
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const riskDistribution = investments.reduce((acc, inv) => {
      const riskLevel = this.getRiskLevel(inv.roi);
      acc[riskLevel] = (acc[riskLevel] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      byPropertyType,
      byLocation,
      byValueRange,
      riskDistribution
    };
  }

  generateTaxReport(year: number): TaxReportData {
    const investments = this.investmentsSubject.value;
    const transactions = investments.flatMap(inv => [
      {
        date: inv.acquisitionDate,
        type: 'purchase' as const,
        amount: inv.investmentAmount,
        property: inv.propertyName,
        taxable: false
      },
      {
        date: new Date(inv.acquisitionDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        type: 'yield' as const,
        amount: inv.yieldEarned,
        property: inv.propertyName,
        taxable: true
      }
    ]).filter(t => t.date.getFullYear() === year);

    const totalIncome = transactions
      .filter(t => t.type === 'yield' && t.taxable)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      year,
      totalIncome,
      capitalGains: 0, // No sales in mock data
      deductions: totalIncome * 0.1, // Assume 10% deductions
      transactions
    };
  }

  async exportPortfolioReport(format: 'pdf' | 'csv'): Promise<void> {
    const investments = this.investmentsSubject.value;
    const metrics = this.metricsSubject.value;

    if (format === 'csv') {
      this.exportCSV(investments);
    } else {
      await this.exportPDF(investments, metrics);
    }
  }

  private exportCSV(investments: InvestmentData[]): void {
    const headers = [
      'Property ID', 'Property Name', 'Investment Amount', 'Current Value',
      'Shares (%)', 'Acquisition Date', 'Yield Earned', 'ROI (%)',
      'Property Type', 'Location'
    ];

    const csvContent = [
      headers.join(','),
      ...investments.map(inv => [
        inv.propertyId,
        `"${inv.propertyName}"`,
        inv.investmentAmount,
        inv.currentValue,
        inv.shares,
        inv.acquisitionDate.toISOString().split('T')[0],
        inv.yieldEarned,
        inv.roi,
        inv.propertyType,
        `"${inv.location}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    // saveAs(blob, `portfolio-report-${new Date().toISOString().split('T')[0]}.csv`);
    console.log('Export to CSV temporarily disabled - need to install file-saver types');
  }

  private async exportPDF(investments: InvestmentData[], metrics: PortfolioMetrics | null): Promise<void> {
    const pdf = new jsPDF();
    
    // Title
    pdf.setFontSize(20);
    pdf.text('Portfolio Report', 20, 20);
    
    // Date
    pdf.setFontSize(12);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35);

    // Metrics summary
    if (metrics) {
      pdf.setFontSize(16);
      pdf.text('Portfolio Summary', 20, 55);
      
      pdf.setFontSize(12);
      pdf.text(`Total Investment: $${metrics.totalInvestment.toLocaleString()}`, 20, 70);
      pdf.text(`Current Value: $${metrics.currentValue.toLocaleString()}`, 20, 80);
      pdf.text(`Total Yield: $${metrics.totalYield.toLocaleString()}`, 20, 90);
      pdf.text(`Average ROI: ${metrics.averageROI.toFixed(2)}%`, 20, 100);
      pdf.text(`Diversification Score: ${metrics.diversificationScore.toFixed(1)}/100`, 20, 110);
    }

    // Investments table
    pdf.setFontSize(16);
    pdf.text('Investments', 20, 130);
    
    pdf.setFontSize(10);
    let yPos = 145;
    
    investments.forEach((inv, index) => {
      if (yPos > 270) { // Check if we need a new page
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.text(`${index + 1}. ${inv.propertyName}`, 20, yPos);
      pdf.text(`$${inv.investmentAmount.toLocaleString()}`, 120, yPos);
      pdf.text(`${inv.roi.toFixed(1)}%`, 160, yPos);
      yPos += 15;
    });

    pdf.save(`portfolio-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Utility methods
  private groupBy<T>(array: T[], key: keyof T): { [key: string]: number } {
    return array.reduce((acc, item) => {
      const groupKey = String(item[key]);
      acc[groupKey] = (acc[groupKey] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private calculateEntropy(values: number[]): number {
    const total = values.reduce((sum, val) => sum + val, 0);
    if (total === 0) return 0;
    
    return -values.reduce((entropy, val) => {
      if (val === 0) return entropy;
      const probability = val / total;
      return entropy + probability * Math.log2(probability);
    }, 0);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((variance, val) => variance + Math.pow(val - mean, 2), 0) / values.length;
  }

  private getValueRange(amount: number): string {
    if (amount < 10000) return 'Under $10K';
    if (amount < 25000) return '$10K - $25K';
    if (amount < 50000) return '$25K - $50K';
    if (amount < 100000) return '$50K - $100K';
    return 'Over $100K';
  }

  private getRiskLevel(roi: number): string {
    if (roi < 5) return 'Low Risk';
    if (roi < 10) return 'Medium Risk';
    if (roi < 15) return 'High Risk';
    return 'Very High Risk';
  }

  // Real-time updates
  updateInvestment(propertyId: string, newData: Partial<InvestmentData>): void {
    const investments = this.investmentsSubject.value;
    const index = investments.findIndex(inv => inv.propertyId === propertyId);
    
    if (index >= 0) {
      investments[index] = { ...investments[index], ...newData };
      this.investmentsSubject.next([...investments]);
      this.calculateMetrics(investments);
      this.generateTimeSeriesData(investments);
    }
  }

  addInvestment(investment: InvestmentData): void {
    const investments = [...this.investmentsSubject.value, investment];
    this.investmentsSubject.next(investments);
    this.calculateMetrics(investments);
    this.generateTimeSeriesData(investments);
  }

  getInvestments(): InvestmentData[] {
    return this.investmentsSubject.value;
  }

  getMetrics(): PortfolioMetrics | null {
    return this.metricsSubject.value;
  }

  getTimeSeries(): TimeSeriesData[] {
    return this.timeSeriesSubject.value;
  }
}