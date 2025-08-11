import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { PropertyCardComponent } from '../property-card/property-card.component';
import { PropertyDetails, ContractService } from '../../services/contract.service';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';

export interface PropertyFilters {
  searchTerm: string;
  priceRange: { min: number; max: number };
  statusFilter: string;
  sortBy: 'price' | 'funding' | 'shares' | 'newest';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatGridListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatSliderModule,
    MatCardModule,
    PropertyCardComponent
  ],
  template: `
    <div class="property-list-container">
      <!-- Header -->
      <div class="list-header">
        <h2>Available Properties</h2>
        <div class="property-count">
          {{ filteredProperties.length }} of {{ allProperties.length }} properties
        </div>
      </div>

      <!-- Filters Section -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-container">
            <!-- Search -->
            <mat-form-field class="search-field" appearance="outline">
              <mat-label>Search properties</mat-label>
              <input matInput
                     [(ngModel)]="filters.searchTerm"
                     (input)="onFiltersChange()"
                     placeholder="Search by name, location, or description">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <!-- Status Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(value)]="filters.statusFilter" (selectionChange)="onFiltersChange()">
                <mat-option value="">All Status</mat-option>
                <mat-option value="0">Available for Investment</mat-option>
                <mat-option value="1">Under Inspection</mat-option>
                <mat-option value="2">Pending Approval</mat-option>
                <mat-option value="3">Funding Complete</mat-option>
                <mat-option value="4">Completed</mat-option>
                <mat-option value="5">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Sort Options -->
            <mat-form-field appearance="outline">
              <mat-label>Sort by</mat-label>
              <mat-select [(value)]="filters.sortBy" (selectionChange)="onFiltersChange()">
                <mat-option value="newest">Newest First</mat-option>
                <mat-option value="price">Price</mat-option>
                <mat-option value="funding">Funding Progress</mat-option>
                <mat-option value="shares">Available Shares</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Sort Order -->
            <mat-form-field appearance="outline">
              <mat-label>Order</mat-label>
              <mat-select [(value)]="filters.sortOrder" (selectionChange)="onFiltersChange()">
                <mat-option value="asc">Ascending</mat-option>
                <mat-option value="desc">Descending</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Clear Filters -->
            <button mat-button 
                    (click)="clearFilters()" 
                    class="clear-filters-btn">
              <mat-icon>clear</mat-icon>
              Clear Filters
            </button>
          </div>

          <!-- Price Range Slider -->
          <div class="price-range-container">
            <label>Price Range: {{formatCurrency(filters.priceRange.min)}} - {{formatCurrency(filters.priceRange.max)}}</label>
            <mat-slider 
              class="price-slider"
              [min]="priceRange.min"
              [max]="priceRange.max"
              [step]="10000">
              <input matSliderStartThumb 
                     [(ngModel)]="filters.priceRange.min" 
                     (input)="onPriceRangeChange()">
              <input matSliderEndThumb 
                     [(ngModel)]="filters.priceRange.max" 
                     (input)="onPriceRangeChange()">
            </mat-slider>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Active Filters Display -->
      <div class="active-filters" *ngIf="hasActiveFilters()">
        <mat-chip-listbox class="filter-chips">
          <mat-chip-option *ngIf="filters.searchTerm" 
                          (removed)="removeFilter('search')"
                          removable>
            Search: {{ filters.searchTerm }}
            <mat-icon matChipRemove>cancel</mat-icon>
          </mat-chip-option>
          
          <mat-chip-option *ngIf="filters.statusFilter" 
                          (removed)="removeFilter('status')"
                          removable>
            Status: {{ getStatusLabel(filters.statusFilter) }}
            <mat-icon matChipRemove>cancel</mat-icon>
          </mat-chip-option>
          
          <mat-chip-option *ngIf="isPriceRangeFiltered()" 
                          (removed)="removeFilter('price')"
                          removable>
            Price: {{formatCurrency(filters.priceRange.min)}} - {{formatCurrency(filters.priceRange.max)}}
            <mat-icon matChipRemove>cancel</mat-icon>
          </mat-chip-option>
        </mat-chip-listbox>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <mat-progress-spinner diameter="60" mode="indeterminate"></mat-progress-spinner>
        <p>Loading properties...</p>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && filteredProperties.length === 0 && allProperties.length === 0">
        <mat-icon class="empty-icon">home</mat-icon>
        <h3>No Properties Available</h3>
        <p>There are currently no properties available for investment.</p>
        <button mat-raised-button color="primary" (click)="refreshProperties()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <!-- No Results State -->
      <div class="empty-state" *ngIf="!isLoading && filteredProperties.length === 0 && allProperties.length > 0">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <h3>No Properties Found</h3>
        <p>No properties match your current filters. Try adjusting your search criteria.</p>
        <button mat-button color="primary" (click)="clearFilters()">
          <mat-icon>clear</mat-icon>
          Clear All Filters
        </button>
      </div>

      <!-- Properties Grid -->
      <div class="properties-grid" *ngIf="!isLoading && filteredProperties.length > 0">
        <app-property-card
          *ngFor="let property of filteredProperties; trackBy: trackByProperty"
          [property]="property"
          [escrowAddress]="getPropertyAddress(property)">
        </app-property-card>
      </div>

      <!-- Load More Button -->
      <div class="load-more-container" *ngIf="canLoadMore()">
        <button mat-raised-button 
                color="primary" 
                (click)="loadMoreProperties()"
                [disabled]="isLoadingMore">
          <mat-icon *ngIf="!isLoadingMore">expand_more</mat-icon>
          <mat-progress-spinner *ngIf="isLoadingMore" diameter="20"></mat-progress-spinner>
          {{ isLoadingMore ? 'Loading...' : 'Load More Properties' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./property-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private filtersSubject = new BehaviorSubject<PropertyFilters>(this.getDefaultFilters());

  allProperties: PropertyDetails[] = [];
  filteredProperties: PropertyDetails[] = [];
  isLoading = false;
  isLoadingMore = false;
  currentPage = 1;
  pageSize = 12;

  filters: PropertyFilters = this.getDefaultFilters();
  priceRange = { min: 0, max: 2000000 };

  // Mock property addresses for now - in real app, these would come from your contract registry
  private propertyAddresses = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
    '0x3456789012345678901234567890123456789012'
  ];

  constructor(
    private contractService: ContractService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setupFilterSubscription();
    this.loadProperties();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilterSubscription() {
    this.filtersSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      this.applyFilters();
    });
  }

  async loadProperties() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      // Load properties from contract addresses
      const propertyPromises = this.propertyAddresses.map(address => 
        this.contractService.getPropertyDetails(address)
      );

      const properties = await Promise.all(propertyPromises);
      this.allProperties = properties.filter((p): p is PropertyDetails => p !== null);
      
      this.updatePriceRange();
      this.applyFilters();
      
    } catch (error) {
      console.error('Failed to load properties:', error);
      this.allProperties = [];
      this.filteredProperties = [];
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private updatePriceRange() {
    if (this.allProperties.length === 0) return;

    const prices = this.allProperties.map(p => Number(p.config.purchasePrice) / 1e6);
    this.priceRange = {
      min: Math.floor(Math.min(...prices) / 10000) * 10000,
      max: Math.ceil(Math.max(...prices) / 10000) * 10000
    };

    this.filters.priceRange = { ...this.priceRange };
  }

  private applyFilters() {
    let filtered = [...this.allProperties];

    // Apply search filter
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(property => {
        // In a real app, you'd search through metadata
        return property.config.nftID.toString().includes(searchTerm) ||
               property.config.seller.toLowerCase().includes(searchTerm);
      });
    }

    // Apply status filter
    if (this.filters.statusFilter) {
      const statusId = parseInt(this.filters.statusFilter);
      filtered = filtered.filter(property => property.currentPhase.id === statusId);
    }

    // Apply price range filter
    filtered = filtered.filter(property => {
      const price = Number(property.config.purchasePrice) / 1e6;
      return price >= this.filters.priceRange.min && price <= this.filters.priceRange.max;
    });

    // Apply sorting
    filtered = this.sortProperties(filtered);

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredProperties = filtered.slice(0, startIndex + this.pageSize);

    this.cdr.markForCheck();
  }

  private sortProperties(properties: PropertyDetails[]): PropertyDetails[] {
    const { sortBy, sortOrder } = this.filters;

    return properties.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'price':
          comparison = Number(a.config.purchasePrice) - Number(b.config.purchasePrice);
          break;
        case 'funding':
          const aFunding = Number(a.totalEarnestDeposited) / Number(a.config.escrowAmount) || 0;
          const bFunding = Number(b.totalEarnestDeposited) / Number(b.config.escrowAmount) || 0;
          comparison = aFunding - bFunding;
          break;
        case 'shares':
          comparison = a.availableShares - b.availableShares;
          break;
        case 'newest':
        default:
          comparison = Number(b.currentPhase.timestamp) - Number(a.currentPhase.timestamp);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  onFiltersChange() {
    this.filtersSubject.next({ ...this.filters });
  }

  onPriceRangeChange() {
    // Debounce the price range changes
    setTimeout(() => {
      this.filtersSubject.next({ ...this.filters });
    }, 300);
  }

  clearFilters() {
    this.filters = this.getDefaultFilters();
    this.filters.priceRange = { ...this.priceRange };
    this.currentPage = 1;
    this.onFiltersChange();
  }

  removeFilter(filterType: string) {
    switch (filterType) {
      case 'search':
        this.filters.searchTerm = '';
        break;
      case 'status':
        this.filters.statusFilter = '';
        break;
      case 'price':
        this.filters.priceRange = { ...this.priceRange };
        break;
    }
    this.onFiltersChange();
  }

  hasActiveFilters(): boolean {
    return this.filters.searchTerm !== '' || 
           this.filters.statusFilter !== '' || 
           this.isPriceRangeFiltered();
  }

  isPriceRangeFiltered(): boolean {
    return this.filters.priceRange.min !== this.priceRange.min || 
           this.filters.priceRange.max !== this.priceRange.max;
  }

  getStatusLabel(statusId: string): string {
    const labels: Record<string, string> = {
      '0': 'Available for Investment',
      '1': 'Under Inspection',
      '2': 'Pending Approval',
      '3': 'Funding Complete',
      '4': 'Completed',
      '5': 'Cancelled'
    };
    return labels[statusId] || 'Unknown';
  }

  canLoadMore(): boolean {
    const totalFiltered = this.allProperties.filter(p => this.passesFilters(p)).length;
    return this.filteredProperties.length < totalFiltered && !this.isLoading;
  }

  private passesFilters(property: PropertyDetails): boolean {
    // Simplified filter check - implement full logic as needed
    return true;
  }

  loadMoreProperties() {
    this.isLoadingMore = true;
    this.currentPage++;
    
    // Simulate loading delay
    setTimeout(() => {
      this.applyFilters();
      this.isLoadingMore = false;
      this.cdr.markForCheck();
    }, 1000);
  }

  refreshProperties() {
    this.currentPage = 1;
    this.loadProperties();
  }

  trackByProperty(index: number, property: PropertyDetails): string {
    return `${property.config.nftAddress}-${property.config.nftID}`;
  }

  getPropertyAddress(property: PropertyDetails): string {
    // In a real app, you'd have a mapping from property to escrow address
    const index = this.allProperties.indexOf(property);
    return this.propertyAddresses[index] || '';
  }

  private getDefaultFilters(): PropertyFilters {
    return {
      searchTerm: '',
      priceRange: { min: 0, max: 2000000 },
      statusFilter: '',
      sortBy: 'newest',
      sortOrder: 'desc'
    };
  }

  formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-US');
  }
}