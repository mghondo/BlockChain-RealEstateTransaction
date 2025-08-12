import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IPFSService, ERC1155Metadata, IPFSUploadProgress } from '../../services/ipfs.service';
import { ContractService } from '../../services/contract.service';
import { Web3Service } from '../../services/web3.service';

export interface PropertyFormData {
  name: string;
  description: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  lotSize?: number;
  amenities: string[];
  legalDescription: string;
  pricePerShare: number;
  totalShares: number;
  minimumInvestment: number;
  expectedYield: number;
  leaseTerm: number;
  images: File[];
}

@Component({
  selector: 'app-property-creation-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatStepperModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="property-wizard-container">
      <div class="wizard-header">
        <button mat-icon-button routerLink="/properties" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <h1>Create Property Listing</h1>
          <p>Tokenize your real estate and start accepting investments</p>
        </div>
      </div>

      <mat-card class="wizard-card">
        <mat-stepper #stepper linear="true" class="property-stepper">
          
          <!-- Step 1: Basic Information -->
          <mat-step [stepControl]="basicInfoForm" label="Basic Information" icon="info">
            <form [formGroup]="basicInfoForm" class="step-form">
              <div class="form-section">
                <h3>Property Details</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Property Name</mat-label>
                    <input matInput formControlName="name" placeholder="e.g., Luxury Downtown Condo">
                    <mat-error *ngIf="basicInfoForm.get('name')?.hasError('required')">
                      Property name is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea matInput formControlName="description" rows="4" 
                              placeholder="Describe your property's key features and investment potential..."></textarea>
                    <mat-error *ngIf="basicInfoForm.get('description')?.hasError('required')">
                      Description is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Property Type</mat-label>
                    <mat-select formControlName="propertyType">
                      <mat-option value="Residential">Residential</mat-option>
                      <mat-option value="Commercial">Commercial</mat-option>
                      <mat-option value="Industrial">Industrial</mat-option>
                      <mat-option value="Mixed-Use">Mixed-Use</mat-option>
                      <mat-option value="Retail">Retail</mat-option>
                    </mat-select>
                    <mat-error *ngIf="basicInfoForm.get('propertyType')?.hasError('required')">
                      Property type is required
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>

              <div class="step-navigation">
                <button mat-raised-button color="primary" matStepperNext 
                        [disabled]="!basicInfoForm.valid">
                  Next
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Location & Property Features -->
          <mat-step [stepControl]="locationForm" label="Location & Features" icon="location_on">
            <form [formGroup]="locationForm" class="step-form">
              <div class="form-section">
                <h3>Property Location</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Street Address</mat-label>
                    <input matInput formControlName="address">
                    <mat-error *ngIf="locationForm.get('address')?.hasError('required')">
                      Address is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>City</mat-label>
                    <input matInput formControlName="city">
                    <mat-error *ngIf="locationForm.get('city')?.hasError('required')">
                      City is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>State</mat-label>
                    <mat-select formControlName="state">
                      <mat-option *ngFor="let state of usStates" [value]="state.code">
                        {{ state.name }}
                      </mat-option>
                    </mat-select>
                    <mat-error *ngIf="locationForm.get('state')?.hasError('required')">
                      State is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>ZIP Code</mat-label>
                    <input matInput formControlName="zipCode">
                    <mat-error *ngIf="locationForm.get('zipCode')?.hasError('required')">
                      ZIP code is required
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3>Property Specifications</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Bedrooms</mat-label>
                    <input matInput type="number" formControlName="bedrooms" min="0">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Bathrooms</mat-label>
                    <input matInput type="number" formControlName="bathrooms" min="0" step="0.5">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Square Feet</mat-label>
                    <input matInput type="number" formControlName="squareFeet" min="0">
                    <mat-error *ngIf="locationForm.get('squareFeet')?.hasError('required')">
                      Square feet is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Year Built</mat-label>
                    <input matInput type="number" formControlName="yearBuilt" 
                           [min]="1800" [max]="currentYear">
                    <mat-error *ngIf="locationForm.get('yearBuilt')?.hasError('required')">
                      Year built is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Lot Size (sq ft)</mat-label>
                    <input matInput type="number" formControlName="lotSize" min="0">
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Legal Description</mat-label>
                    <textarea matInput formControlName="legalDescription" rows="3"
                              placeholder="Parcel ID, subdivision name, lot number, etc."></textarea>
                    <mat-error *ngIf="locationForm.get('legalDescription')?.hasError('required')">
                      Legal description is required
                    </mat-error>
                  </mat-form-field>
                </div>
              </div>

              <div class="form-section">
                <h3>Amenities</h3>
                <div class="amenities-grid">
                  <mat-checkbox 
                    *ngFor="let amenity of availableAmenities" 
                    [checked]="selectedAmenities.includes(amenity)"
                    (change)="toggleAmenity(amenity, $event.checked)">
                    {{ amenity }}
                  </mat-checkbox>
                </div>
              </div>

              <div class="step-navigation">
                <button mat-stroked-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Previous
                </button>
                <button mat-raised-button color="primary" matStepperNext 
                        [disabled]="!locationForm.valid">
                  Next
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Images & Media -->
          <mat-step label="Images & Media" icon="photo_library">
            <div class="step-form">
              <div class="form-section">
                <h3>Property Images</h3>
                <p class="section-description">
                  Upload high-quality images of your property. The first image will be used as the primary image.
                </p>
                
                <app-ipfs-upload 
                  [multiple]="true"
                  [accept]="'image/*'"
                  [maxFiles]="10"
                  [maxFileSize]="10485760"
                  (filesUploaded)="onImagesUploaded($event)">
                </app-ipfs-upload>

                <div class="upload-progress" *ngIf="uploadProgress.length > 0">
                  <h4>Upload Progress</h4>
                  <div class="progress-list">
                    <div *ngFor="let progress of uploadProgress" class="progress-item">
                      <div class="progress-info">
                        <span class="file-name">{{ progress.file.name }}</span>
                        <span class="progress-status" [class]="progress.status">
                          {{ progress.status | titlecase }}
                        </span>
                      </div>
                      <mat-progress-bar 
                        mode="determinate" 
                        [value]="progress.progress"
                        [color]="getProgressColor(progress.status)">
                      </mat-progress-bar>
                    </div>
                  </div>
                </div>

                <div class="uploaded-images" *ngIf="uploadedImageHashes.length > 0">
                  <h4>Uploaded Images ({{ uploadedImageHashes.length }})</h4>
                  <div class="image-grid">
                    <div *ngFor="let hash of uploadedImageHashes; let i = index" class="image-preview">
                      <img [src]="getImageUrl(hash)" [alt]="'Property image ' + (i + 1)">
                      <div class="image-overlay">
                        <button mat-icon-button (click)="removeImage(i)" class="remove-btn">
                          <mat-icon>delete</mat-icon>
                        </button>
                        <span class="primary-badge" *ngIf="i === 0">Primary</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-navigation">
                <button mat-stroked-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Previous
                </button>
                <button mat-raised-button color="primary" matStepperNext 
                        [disabled]="uploadedImageHashes.length === 0">
                  Next
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

          <!-- Step 4: Investment Terms -->
          <mat-step [stepControl]="investmentForm" label="Investment Terms" icon="attach_money">
            <form [formGroup]="investmentForm" class="step-form">
              <div class="form-section">
                <h3>Token Economics</h3>
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Price per Share (USDC)</mat-label>
                    <input matInput type="number" formControlName="pricePerShare" 
                           min="1" step="0.01">
                    <mat-error *ngIf="investmentForm.get('pricePerShare')?.hasError('required')">
                      Price per share is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Total Shares</mat-label>
                    <input matInput type="number" formControlName="totalShares" 
                           min="1" max="100" readonly value="100">
                    <mat-hint>Fixed at 100 shares (1% per share)</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Minimum Investment (USDC)</mat-label>
                    <input matInput type="number" formControlName="minimumInvestment" 
                           min="1" step="0.01">
                    <mat-error *ngIf="investmentForm.get('minimumInvestment')?.hasError('required')">
                      Minimum investment is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Expected Annual Yield (%)</mat-label>
                    <input matInput type="number" formControlName="expectedYield" 
                           min="0" max="50" step="0.1">
                    <mat-error *ngIf="investmentForm.get('expectedYield')?.hasError('required')">
                      Expected yield is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Lease Term (months)</mat-label>
                    <input matInput type="number" formControlName="leaseTerm" 
                           min="1" max="360">
                    <mat-error *ngIf="investmentForm.get('leaseTerm')?.hasError('required')">
                      Lease term is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <div class="investment-summary">
                  <h4>Investment Summary</h4>
                  <div class="summary-grid">
                    <div class="summary-item">
                      <span class="label">Total Property Value:</span>
                      <span class="value">{{ formatCurrency(getTotalPropertyValue()) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="label">Minimum Shares:</span>
                      <span class="value">{{ getMinimumShares() }} ({{ getMinimumShares() }}%)</span>
                    </div>
                    <div class="summary-item">
                      <span class="label">Monthly Yield per Share:</span>
                      <span class="value">{{ formatCurrency(getMonthlyYieldPerShare()) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-navigation">
                <button mat-stroked-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Previous
                </button>
                <button mat-raised-button color="primary" matStepperNext 
                        [disabled]="!investmentForm.valid">
                  Next
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 5: Review & Deploy -->
          <mat-step label="Review & Deploy" icon="publish">
            <div class="step-form">
              <div class="form-section">
                <h3>Review Your Property Listing</h3>
                
                <div class="review-grid">
                  <mat-card class="review-card">
                    <mat-card-header>
                      <mat-card-title>Basic Information</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="review-item">
                        <strong>Name:</strong> {{ basicInfoForm.get('name')?.value }}
                      </div>
                      <div class="review-item">
                        <strong>Type:</strong> {{ basicInfoForm.get('propertyType')?.value }}
                      </div>
                      <div class="review-item">
                        <strong>Description:</strong> {{ basicInfoForm.get('description')?.value }}
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="review-card">
                    <mat-card-header>
                      <mat-card-title>Location & Features</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="review-item">
                        <strong>Address:</strong> {{ getFullAddress() }}
                      </div>
                      <div class="review-item">
                        <strong>Specs:</strong> 
                        {{ locationForm.get('bedrooms')?.value || 0 }} bed, 
                        {{ locationForm.get('bathrooms')?.value || 0 }} bath, 
                        {{ locationForm.get('squareFeet')?.value | number }} sq ft
                      </div>
                      <div class="review-item">
                        <strong>Year Built:</strong> {{ locationForm.get('yearBuilt')?.value }}
                      </div>
                      <div class="review-item" *ngIf="selectedAmenities.length > 0">
                        <strong>Amenities:</strong> {{ selectedAmenities.join(', ') }}
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="review-card">
                    <mat-card-header>
                      <mat-card-title>Investment Terms</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="review-item">
                        <strong>Price per Share:</strong> {{ formatCurrency(investmentForm.get('pricePerShare')?.value) }}
                      </div>
                      <div class="review-item">
                        <strong>Total Value:</strong> {{ formatCurrency(getTotalPropertyValue()) }}
                      </div>
                      <div class="review-item">
                        <strong>Minimum Investment:</strong> {{ formatCurrency(investmentForm.get('minimumInvestment')?.value) }}
                      </div>
                      <div class="review-item">
                        <strong>Expected Yield:</strong> {{ investmentForm.get('expectedYield')?.value }}% annually
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="review-card">
                    <mat-card-header>
                      <mat-card-title>Images</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="review-images">
                        <img *ngFor="let hash of uploadedImageHashes.slice(0, 3)" 
                             [src]="getImageUrl(hash)" 
                             [alt]="'Property preview'"
                             class="review-image">
                        <div *ngIf="uploadedImageHashes.length > 3" class="more-images">
                          +{{ uploadedImageHashes.length - 3 }} more
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div class="deployment-section">
                  <h4>Deployment Process</h4>
                  <div class="deployment-steps">
                    <div class="deploy-step" [class.active]="deploymentStep >= 1" [class.completed]="deploymentStep > 1">
                      <mat-icon>cloud_upload</mat-icon>
                      <span>Upload Metadata to IPFS</span>
                      <mat-progress-bar *ngIf="deploymentStep === 1" mode="indeterminate"></mat-progress-bar>
                    </div>
                    <div class="deploy-step" [class.active]="deploymentStep >= 2" [class.completed]="deploymentStep > 2">
                      <mat-icon>account_balance</mat-icon>
                      <span>Deploy Smart Contract</span>
                      <mat-progress-bar *ngIf="deploymentStep === 2" mode="indeterminate"></mat-progress-bar>
                    </div>
                    <div class="deploy-step" [class.active]="deploymentStep >= 3" [class.completed]="deploymentStep > 3">
                      <mat-icon>token</mat-icon>
                      <span>Mint NFT Shares</span>
                      <mat-progress-bar *ngIf="deploymentStep === 3" mode="indeterminate"></mat-progress-bar>
                    </div>
                    <div class="deploy-step" [class.active]="deploymentStep >= 4" [class.completed]="deploymentStep > 4">
                      <mat-icon>check_circle</mat-icon>
                      <span>Listing Complete</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-navigation">
                <button mat-stroked-button matStepperPrevious [disabled]="isDeploying">
                  <mat-icon>arrow_back</mat-icon>
                  Previous
                </button>
                <button mat-raised-button color="primary" 
                        (click)="deployProperty()" 
                        [disabled]="isDeploying || !canDeploy()">
                  <mat-progress-spinner *ngIf="isDeploying" diameter="20" class="inline-spinner"></mat-progress-spinner>
                  {{ isDeploying ? 'Deploying...' : 'Deploy Property' }}
                  <mat-icon *ngIf="!isDeploying">rocket_launch</mat-icon>
                </button>
              </div>
            </div>
          </mat-step>

        </mat-stepper>
      </mat-card>
    </div>
  `,
  styleUrls: ['./property-creation-wizard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyCreationWizardComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;
  
  private destroy$ = new Subject<void>();

  basicInfoForm: FormGroup;
  locationForm: FormGroup;
  investmentForm: FormGroup;

  currentYear = new Date().getFullYear();
  deploymentStep = 0;
  isDeploying = false;

  uploadProgress: IPFSUploadProgress[] = [];
  uploadedImageHashes: string[] = [];
  selectedAmenities: string[] = [];

  availableAmenities = [
    'Swimming Pool', 'Gym/Fitness Center', 'Parking', 'Balcony/Patio',
    'Air Conditioning', 'Heating', 'Laundry', 'Dishwasher',
    'Elevator', 'Security System', 'Garden', 'Fireplace',
    'Walk-in Closet', 'Hardwood Floors', 'Updated Kitchen',
    'Stainless Steel Appliances', 'Granite Countertops'
  ];

  usStates = [
    { name: 'Alabama', code: 'AL' },
    { name: 'Alaska', code: 'AK' },
    { name: 'Arizona', code: 'AZ' },
    { name: 'Arkansas', code: 'AR' },
    { name: 'California', code: 'CA' },
    { name: 'Colorado', code: 'CO' },
    { name: 'Connecticut', code: 'CT' },
    { name: 'Delaware', code: 'DE' },
    { name: 'Florida', code: 'FL' },
    { name: 'Georgia', code: 'GA' },
    { name: 'Hawaii', code: 'HI' },
    { name: 'Idaho', code: 'ID' },
    { name: 'Illinois', code: 'IL' },
    { name: 'Indiana', code: 'IN' },
    { name: 'Iowa', code: 'IA' },
    { name: 'Kansas', code: 'KS' },
    { name: 'Kentucky', code: 'KY' },
    { name: 'Louisiana', code: 'LA' },
    { name: 'Maine', code: 'ME' },
    { name: 'Maryland', code: 'MD' },
    { name: 'Massachusetts', code: 'MA' },
    { name: 'Michigan', code: 'MI' },
    { name: 'Minnesota', code: 'MN' },
    { name: 'Mississippi', code: 'MS' },
    { name: 'Missouri', code: 'MO' },
    { name: 'Montana', code: 'MT' },
    { name: 'Nebraska', code: 'NE' },
    { name: 'Nevada', code: 'NV' },
    { name: 'New Hampshire', code: 'NH' },
    { name: 'New Jersey', code: 'NJ' },
    { name: 'New Mexico', code: 'NM' },
    { name: 'New York', code: 'NY' },
    { name: 'North Carolina', code: 'NC' },
    { name: 'North Dakota', code: 'ND' },
    { name: 'Ohio', code: 'OH' },
    { name: 'Oklahoma', code: 'OK' },
    { name: 'Oregon', code: 'OR' },
    { name: 'Pennsylvania', code: 'PA' },
    { name: 'Rhode Island', code: 'RI' },
    { name: 'South Carolina', code: 'SC' },
    { name: 'South Dakota', code: 'SD' },
    { name: 'Tennessee', code: 'TN' },
    { name: 'Texas', code: 'TX' },
    { name: 'Utah', code: 'UT' },
    { name: 'Vermont', code: 'VT' },
    { name: 'Virginia', code: 'VA' },
    { name: 'Washington', code: 'WA' },
    { name: 'West Virginia', code: 'WV' },
    { name: 'Wisconsin', code: 'WI' },
    { name: 'Wyoming', code: 'WY' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private ipfsService: IPFSService,
    private contractService: ContractService,
    private web3Service: Web3Service
  ) {
    this.createForms();
  }

  ngOnInit(): void {
    this.subscribeToUploadProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForms(): void {
    this.basicInfoForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      propertyType: ['', Validators.required]
    });

    this.locationForm = this.fb.group({
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      bedrooms: [0],
      bathrooms: [0],
      squareFeet: [0, Validators.required],
      yearBuilt: [this.currentYear, Validators.required],
      lotSize: [0],
      legalDescription: ['', Validators.required]
    });

    this.investmentForm = this.fb.group({
      pricePerShare: [100, [Validators.required, Validators.min(1)]],
      totalShares: [100],
      minimumInvestment: [100, [Validators.required, Validators.min(1)]],
      expectedYield: [8, [Validators.required, Validators.min(0)]],
      leaseTerm: [12, [Validators.required, Validators.min(1)]]
    });
  }

  private subscribeToUploadProgress(): void {
    this.ipfsService.uploadProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.uploadProgress = progress;
        this.cdr.markForCheck();
      });
  }

  toggleAmenity(amenity: string, checked: boolean): void {
    if (checked && !this.selectedAmenities.includes(amenity)) {
      this.selectedAmenities.push(amenity);
    } else if (!checked) {
      const index = this.selectedAmenities.indexOf(amenity);
      if (index > -1) {
        this.selectedAmenities.splice(index, 1);
      }
    }
  }

  onImagesUploaded(hashes: string[]): void {
    this.uploadedImageHashes = [...this.uploadedImageHashes, ...hashes];
    this.cdr.markForCheck();
    
    this.snackBar.open(`${hashes.length} image(s) uploaded successfully!`, 'Close', {
      duration: 3000
    });
  }

  removeImage(index: number): void {
    this.uploadedImageHashes.splice(index, 1);
    this.cdr.markForCheck();
  }

  getImageUrl(hash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  getProgressColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'error': return 'warn';
      case 'uploading': return 'accent';
      default: return 'primary';
    }
  }

  getFullAddress(): string {
    const address = this.locationForm.get('address')?.value || '';
    const city = this.locationForm.get('city')?.value || '';
    const state = this.locationForm.get('state')?.value || '';
    const zipCode = this.locationForm.get('zipCode')?.value || '';
    return `${address}, ${city}, ${state} ${zipCode}`;
  }

  getTotalPropertyValue(): number {
    return (this.investmentForm.get('pricePerShare')?.value || 0) * 100;
  }

  getMinimumShares(): number {
    const pricePerShare = this.investmentForm.get('pricePerShare')?.value || 1;
    const minimumInvestment = this.investmentForm.get('minimumInvestment')?.value || 1;
    return Math.ceil(minimumInvestment / pricePerShare);
  }

  getMonthlyYieldPerShare(): number {
    const pricePerShare = this.investmentForm.get('pricePerShare')?.value || 0;
    const expectedYield = this.investmentForm.get('expectedYield')?.value || 0;
    return (pricePerShare * expectedYield / 100) / 12;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  canDeploy(): boolean {
    return this.basicInfoForm.valid && 
           this.locationForm.valid && 
           this.investmentForm.valid && 
           this.uploadedImageHashes.length > 0;
  }

  async deployProperty(): Promise<void> {
    if (!this.canDeploy() || this.isDeploying) return;

    this.isDeploying = true;
    this.deploymentStep = 1;
    this.cdr.markForCheck();

    try {
      // Step 1: Create and upload metadata to IPFS
      const metadata = this.createMetadata();
      const metadataHash = await this.ipfsService.uploadMetadata(metadata);
      
      this.deploymentStep = 2;
      this.cdr.markForCheck();

      // Step 2: Deploy smart contract (mock implementation)
      await this.deployContract(metadataHash);
      
      this.deploymentStep = 3;
      this.cdr.markForCheck();

      // Step 3: Mint NFT shares (mock implementation)
      await this.mintNFTShares();
      
      this.deploymentStep = 4;
      this.cdr.markForCheck();

      this.snackBar.open('Property deployed successfully!', 'Close', {
        duration: 5000
      });

      // Navigate to property detail or listing
      setTimeout(() => {
        this.router.navigate(['/properties']);
      }, 2000);

    } catch (error: any) {
      console.error('Deployment error:', error);
      this.snackBar.open(`Deployment failed: ${error.message}`, 'Close', {
        duration: 5000
      });
      this.deploymentStep = 0;
    } finally {
      this.isDeploying = false;
      this.cdr.markForCheck();
    }
  }

  private createMetadata(): ERC1155Metadata {
    const propertyData = {
      name: this.basicInfoForm.get('name')?.value,
      description: this.basicInfoForm.get('description')?.value,
      propertyType: this.basicInfoForm.get('propertyType')?.value,
      address: this.locationForm.get('address')?.value,
      city: this.locationForm.get('city')?.value,
      state: this.locationForm.get('state')?.value,
      zipCode: this.locationForm.get('zipCode')?.value,
      bedrooms: this.locationForm.get('bedrooms')?.value,
      bathrooms: this.locationForm.get('bathrooms')?.value,
      squareFeet: this.locationForm.get('squareFeet')?.value,
      yearBuilt: this.locationForm.get('yearBuilt')?.value,
      lotSize: this.locationForm.get('lotSize')?.value,
      legalDescription: this.locationForm.get('legalDescription')?.value,
      amenities: this.selectedAmenities,
      imageHash: this.uploadedImageHashes[0],
      images: this.uploadedImageHashes,
      pricePerShare: this.investmentForm.get('pricePerShare')?.value,
      expectedYield: this.investmentForm.get('expectedYield')?.value,
      leaseTerm: this.investmentForm.get('leaseTerm')?.value
    };

    return this.ipfsService.createERC1155MetadataTemplate(propertyData);
  }

  private async deployContract(metadataHash: string): Promise<void> {
    // Mock contract deployment - replace with actual implementation
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async mintNFTShares(): Promise<void> {
    // Mock NFT minting - replace with actual implementation
    return new Promise(resolve => setTimeout(resolve, 1500));
  }
}