import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ERC1155Metadata, IPFSService } from '../../services/ipfs.service';

export interface AttributeTemplate {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'date' | 'boost_number' | 'boost_percentage';
  required: boolean;
  category: string;
  description?: string;
}

@Component({
  selector: 'app-metadata-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatCheckboxModule,
    MatTabsModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
    <div class="metadata-editor">
      <div class="editor-header">
        <div class="header-content">
          <h2>NFT Metadata Editor</h2>
          <p>Configure ERC-1155 compliant metadata for your property token</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button 
                  [matMenuTriggerFor]="templatesMenu"
                  [disabled]="isLoading">
            <mat-icon>file_copy</mat-icon>
            Templates
          </button>
          <mat-menu #templatesMenu="matMenu">
            <button mat-menu-item (click)="loadTemplate('residential')">
              <mat-icon>home</mat-icon>
              Residential Property
            </button>
            <button mat-menu-item (click)="loadTemplate('commercial')">
              <mat-icon>business</mat-icon>
              Commercial Property
            </button>
            <button mat-menu-item (click)="loadTemplate('industrial')">
              <mat-icon>factory</mat-icon>
              Industrial Property
            </button>
          </mat-menu>
          <button mat-stroked-button 
                  (click)="validateMetadata()"
                  [disabled]="isLoading">
            <mat-icon>verified</mat-icon>
            Validate
          </button>
          <button mat-stroked-button 
                  (click)="previewMetadata()"
                  [disabled]="isLoading || !metadataForm.valid">
            <mat-icon>preview</mat-icon>
            Preview
          </button>
        </div>
      </div>

      <form [formGroup]="metadataForm" class="metadata-form">
        <mat-tab-group class="metadata-tabs" (selectedTabChange)="onTabChange($event)">
          
          <!-- Basic Information Tab -->
          <mat-tab label="Basic Info" icon="info">
            <div class="tab-content">
              <mat-card class="form-card">
                <mat-card-header>
                  <mat-card-title>Core Metadata</mat-card-title>
                  <mat-card-subtitle>Essential NFT information following ERC-1155 standards</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Token Name *</mat-label>
                      <input matInput formControlName="name" placeholder="e.g., Luxury Downtown Condo">
                      <mat-hint>The name of your NFT token</mat-hint>
                      <mat-error *ngIf="metadataForm.get('name')?.hasError('required')">
                        Token name is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Description *</mat-label>
                      <textarea matInput formControlName="description" rows="4"
                                placeholder="Describe the property and investment opportunity..."></textarea>
                      <mat-hint>Detailed description of the asset and investment terms</mat-hint>
                      <mat-error *ngIf="metadataForm.get('description')?.hasError('required')">
                        Description is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Image IPFS Hash *</mat-label>
                      <input matInput formControlName="image" placeholder="QmXxx...">
                      <button mat-icon-button matSuffix 
                              matTooltip="Upload image to generate hash"
                              (click)="openImageUpload()">
                        <mat-icon>cloud_upload</mat-icon>
                      </button>
                      <mat-hint>Primary image displayed for this token</mat-hint>
                      <mat-error *ngIf="metadataForm.get('image')?.hasError('required')">
                        Image is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>External URL</mat-label>
                      <input matInput formControlName="external_url" type="url"
                             placeholder="https://example.com/property/123">
                      <mat-hint>Link to external property details</mat-hint>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Background Color</mat-label>
                      <input matInput formControlName="background_color"
                             placeholder="f8fafc"
                             maxlength="6">
                      <mat-hint>Hex color without #</mat-hint>
                    </mat-form-field>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Attributes Tab -->
          <mat-tab label="Attributes" icon="category">
            <div class="tab-content">
              <mat-card class="form-card">
                <mat-card-header>
                  <mat-card-title>Token Attributes</mat-card-title>
                  <mat-card-subtitle>Properties that define your asset characteristics</mat-card-subtitle>
                  <div class="card-actions">
                    <button mat-icon-button 
                            (click)="addAttribute()"
                            matTooltip="Add custom attribute">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <div class="attributes-section">
                    
                    <!-- Standard Attributes -->
                    <mat-expansion-panel class="attribute-panel" expanded="true">
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          <mat-icon>home</mat-icon>
                          Property Specifications
                        </mat-panel-title>
                        <mat-panel-description>
                          Standard property attributes
                        </mat-panel-description>
                      </mat-expansion-panel-header>
                      
                      <div class="standard-attributes" formArrayName="attributes">
                        <div *ngFor="let attr of standardAttributes; let i = index" 
                             class="attribute-row" 
                             [formGroupName]="i">
                          <mat-form-field appearance="outline">
                            <mat-label>{{ attr.displayName }}</mat-label>
                            <input matInput formControlName="value" 
                                   [type]="attr.type === 'number' ? 'number' : 'text'"
                                   [placeholder]="getAttributePlaceholder(attr)">
                            <mat-hint *ngIf="attr.description">{{ attr.description }}</mat-hint>
                          </mat-form-field>
                          <mat-form-field appearance="outline" *ngIf="attr.type !== 'string'">
                            <mat-label>Display Type</mat-label>
                            <mat-select formControlName="display_type">
                              <mat-option value="">Default</mat-option>
                              <mat-option value="number">Number</mat-option>
                              <mat-option value="boost_number">Boost Number</mat-option>
                              <mat-option value="boost_percentage">Boost Percentage</mat-option>
                              <mat-option value="date">Date</mat-option>
                            </mat-select>
                          </mat-form-field>
                        </div>
                      </div>
                    </mat-expansion-panel>

                    <!-- Custom Attributes -->
                    <mat-expansion-panel class="attribute-panel" *ngIf="customAttributesArray.length > 0">
                      <mat-expansion-panel-header>
                        <mat-panel-title>
                          <mat-icon>tune</mat-icon>
                          Custom Attributes
                        </mat-panel-title>
                        <mat-panel-description>
                          User-defined properties
                        </mat-panel-description>
                      </mat-expansion-panel-header>
                      
                      <div class="custom-attributes" formArrayName="customAttributes">
                        <div *ngFor="let attr of customAttributesArray.controls; let i = index" 
                             class="custom-attribute-row" 
                             [formGroupName]="i">
                          <mat-form-field appearance="outline">
                            <mat-label>Trait Type</mat-label>
                            <input matInput formControlName="trait_type" placeholder="e.g., Parking Spaces">
                          </mat-form-field>
                          <mat-form-field appearance="outline">
                            <mat-label>Value</mat-label>
                            <input matInput formControlName="value" placeholder="e.g., 2">
                          </mat-form-field>
                          <mat-form-field appearance="outline">
                            <mat-label>Display Type</mat-label>
                            <mat-select formControlName="display_type">
                              <mat-option value="">Default</mat-option>
                              <mat-option value="number">Number</mat-option>
                              <mat-option value="boost_number">Boost Number</mat-option>
                              <mat-option value="boost_percentage">Boost Percentage</mat-option>
                              <mat-option value="date">Date</mat-option>
                            </mat-select>
                          </mat-form-field>
                          <button mat-icon-button 
                                  color="warn"
                                  (click)="removeCustomAttribute(i)"
                                  matTooltip="Remove attribute">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </div>
                    </mat-expansion-panel>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Property Details Tab -->
          <mat-tab label="Property Details" icon="location_on">
            <div class="tab-content">
              <mat-card class="form-card">
                <mat-card-header>
                  <mat-card-title>Property Information</mat-card-title>
                  <mat-card-subtitle>Detailed property specifications</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div formGroupName="properties" class="properties-form">
                    <div class="form-grid">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Address *</mat-label>
                        <input matInput formControlName="address" placeholder="123 Main Street">
                        <mat-error *ngIf="propertiesForm.get('address')?.hasError('required')">
                          Address is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>City *</mat-label>
                        <input matInput formControlName="city" placeholder="New York">
                        <mat-error *ngIf="propertiesForm.get('city')?.hasError('required')">
                          City is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>State *</mat-label>
                        <input matInput formControlName="state" placeholder="NY">
                        <mat-error *ngIf="propertiesForm.get('state')?.hasError('required')">
                          State is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>ZIP Code *</mat-label>
                        <input matInput formControlName="zipCode" placeholder="10001">
                        <mat-error *ngIf="propertiesForm.get('zipCode')?.hasError('required')">
                          ZIP code is required
                        </mat-error>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Property Type *</mat-label>
                        <mat-select formControlName="propertyType">
                          <mat-option value="Residential">Residential</mat-option>
                          <mat-option value="Commercial">Commercial</mat-option>
                          <mat-option value="Industrial">Industrial</mat-option>
                          <mat-option value="Mixed-Use">Mixed-Use</mat-option>
                          <mat-option value="Retail">Retail</mat-option>
                        </mat-select>
                        <mat-error *ngIf="propertiesForm.get('propertyType')?.hasError('required')">
                          Property type is required
                        </mat-error>
                      </mat-form-field>

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
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Year Built</mat-label>
                        <input matInput type="number" formControlName="yearBuilt" 
                               [min]="1800" [max]="currentYear">
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Lot Size (sq ft)</mat-label>
                        <input matInput type="number" formControlName="lotSize" min="0">
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Legal Description</mat-label>
                        <textarea matInput formControlName="legalDescription" rows="3"
                                  placeholder="Parcel ID, subdivision details..."></textarea>
                      </mat-form-field>
                    </div>

                    <!-- Amenities Section -->
                    <div class="amenities-section">
                      <h4>Amenities</h4>
                      <div class="amenities-grid">
                        <mat-checkbox *ngFor="let amenity of availableAmenities"
                                      [checked]="isAmenitySelected(amenity)"
                                      (change)="toggleAmenity(amenity, $event.checked)">
                          {{ amenity }}
                        </mat-checkbox>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- JSON Preview Tab -->
          <mat-tab label="JSON Preview" icon="code">
            <div class="tab-content">
              <mat-card class="form-card">
                <mat-card-header>
                  <mat-card-title>Metadata JSON</mat-card-title>
                  <mat-card-subtitle>Generated ERC-1155 compliant metadata</mat-card-subtitle>
                  <div class="card-actions">
                    <button mat-icon-button 
                            (click)="copyJsonToClipboard()"
                            matTooltip="Copy JSON">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                    <button mat-icon-button 
                            (click)="downloadJson()"
                            matTooltip="Download JSON">
                      <mat-icon>download</mat-icon>
                    </button>
                    <button mat-icon-button 
                            (click)="uploadToIPFS()"
                            [disabled]="!metadataForm.valid || isUploading"
                            matTooltip="Upload to IPFS">
                      <mat-icon>cloud_upload</mat-icon>
                    </button>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <div class="json-preview">
                    <pre><code>{{ getFormattedJson() }}</code></pre>
                  </div>
                  
                  <div class="validation-status">
                    <div class="status-item" [class]="validationResult.valid ? 'valid' : 'invalid'">
                      <mat-icon>{{ validationResult.valid ? 'check_circle' : 'error' }}</mat-icon>
                      <span>{{ validationResult.valid ? 'Valid ERC-1155 Metadata' : 'Invalid Metadata' }}</span>
                    </div>
                    <div class="validation-errors" *ngIf="validationResult.errors.length > 0">
                      <h5>Validation Errors:</h5>
                      <ul>
                        <li *ngFor="let error of validationResult.errors">{{ error }}</li>
                      </ul>
                    </div>
                  </div>

                  <div class="upload-result" *ngIf="uploadResult">
                    <div class="result-success" *ngIf="uploadResult.success">
                      <mat-icon color="primary">check_circle</mat-icon>
                      <span>Metadata uploaded to IPFS</span>
                      <div class="ipfs-details">
                        <strong>Hash:</strong> {{ uploadResult.hash }}
                        <button mat-icon-button 
                                (click)="copyToClipboard(uploadResult.hash!)"
                                matTooltip="Copy hash">
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </div>
                    </div>
                    <div class="result-error" *ngIf="!uploadResult.success">
                      <mat-icon color="warn">error</mat-icon>
                      <span>Upload failed: {{ uploadResult.error }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

        </mat-tab-group>

        <div class="form-actions">
          <button mat-stroked-button type="button" (click)="resetForm()" [disabled]="isLoading">
            <mat-icon>refresh</mat-icon>
            Reset
          </button>
          <button mat-raised-button 
                  color="primary" 
                  (click)="saveMetadata()"
                  [disabled]="!metadataForm.valid || isLoading">
            <mat-icon>save</mat-icon>
            {{ isLoading ? 'Saving...' : 'Save Metadata' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./metadata-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetadataEditorComponent implements OnInit, OnDestroy {
  @Input() initialMetadata?: ERC1155Metadata;
  @Output() metadataChanged = new EventEmitter<ERC1155Metadata>();
  @Output() metadataSaved = new EventEmitter<ERC1155Metadata>();
  @Output() ipfsHashGenerated = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  metadataForm: FormGroup;
  isLoading = false;
  isUploading = false;
  currentYear = new Date().getFullYear();

  validationResult = {
    valid: false,
    errors: [] as string[]
  };

  uploadResult: {
    success: boolean;
    hash?: string;
    error?: string;
  } | null = null;

  standardAttributes: AttributeTemplate[] = [
    { name: 'property_type', displayName: 'Property Type', type: 'string', required: true, category: 'basic' },
    { name: 'bedrooms', displayName: 'Bedrooms', type: 'number', required: false, category: 'specs' },
    { name: 'bathrooms', displayName: 'Bathrooms', type: 'number', required: false, category: 'specs' },
    { name: 'square_feet', displayName: 'Square Feet', type: 'number', required: false, category: 'specs' },
    { name: 'year_built', displayName: 'Year Built', type: 'date', required: false, category: 'specs' },
    { name: 'city', displayName: 'City', type: 'string', required: false, category: 'location' },
    { name: 'state', displayName: 'State', type: 'string', required: false, category: 'location' }
  ];

  availableAmenities = [
    'Swimming Pool', 'Gym/Fitness Center', 'Parking', 'Balcony/Patio',
    'Air Conditioning', 'Heating', 'Laundry', 'Dishwasher',
    'Elevator', 'Security System', 'Garden', 'Fireplace',
    'Walk-in Closet', 'Hardwood Floors', 'Updated Kitchen',
    'Stainless Steel Appliances', 'Granite Countertops'
  ];

  constructor(
    private fb: FormBuilder,
    private ipfsService: IPFSService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    if (this.initialMetadata) {
      this.loadMetadata(this.initialMetadata);
    }
    
    this.metadataForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateMetadata();
        this.emitMetadataChange();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): void {
    this.metadataForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      image: ['', Validators.required],
      external_url: [''],
      background_color: ['f8fafc'],
      attributes: this.fb.array(this.createStandardAttributesArray()),
      customAttributes: this.fb.array([]),
      properties: this.fb.group({
        address: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zipCode: ['', Validators.required],
        propertyType: ['Residential', Validators.required],
        bedrooms: [0],
        bathrooms: [0],
        squareFeet: [0],
        yearBuilt: [this.currentYear],
        lotSize: [0],
        amenities: [[] as string[]],
        legalDescription: ['']
      })
    });
  }

  private createStandardAttributesArray(): FormGroup[] {
    return this.standardAttributes.map(attr => 
      this.fb.group({
        trait_type: [attr.displayName],
        value: ['', attr.required ? Validators.required : []],
        display_type: [attr.type === 'number' ? 'number' : '']
      })
    );
  }

  get attributesArray(): FormArray {
    return this.metadataForm.get('attributes') as FormArray;
  }

  get customAttributesArray(): FormArray {
    return this.metadataForm.get('customAttributes') as FormArray;
  }

  get propertiesForm(): FormGroup {
    return this.metadataForm.get('properties') as FormGroup;
  }

  addAttribute(): void {
    const customAttr = this.fb.group({
      trait_type: ['', Validators.required],
      value: ['', Validators.required],
      display_type: ['']
    });
    
    this.customAttributesArray.push(customAttr);
    this.cdr.markForCheck();
  }

  removeCustomAttribute(index: number): void {
    this.customAttributesArray.removeAt(index);
    this.cdr.markForCheck();
  }

  getAttributePlaceholder(attr: AttributeTemplate): string {
    const placeholders: Record<string, string> = {
      'property_type': 'e.g., Residential',
      'bedrooms': '3',
      'bathrooms': '2.5',
      'square_feet': '2000',
      'year_built': '2020',
      'city': 'New York',
      'state': 'NY'
    };
    return placeholders[attr.name] || '';
  }

  isAmenitySelected(amenity: string): boolean {
    const amenities = this.propertiesForm.get('amenities')?.value || [];
    return amenities.includes(amenity);
  }

  toggleAmenity(amenity: string, selected: boolean): void {
    const amenities = this.propertiesForm.get('amenities')?.value || [];
    
    if (selected && !amenities.includes(amenity)) {
      amenities.push(amenity);
    } else if (!selected) {
      const index = amenities.indexOf(amenity);
      if (index > -1) {
        amenities.splice(index, 1);
      }
    }
    
    this.propertiesForm.get('amenities')?.setValue([...amenities]);
  }

  validateMetadata(): void {
    const metadata = this.generateMetadata();
    const errors: string[] = [];

    // Basic validation
    if (!metadata.name) errors.push('Name is required');
    if (!metadata.description) errors.push('Description is required');
    if (!metadata.image) errors.push('Image is required');
    
    // Properties validation
    if (!metadata.properties?.address) errors.push('Address is required');
    if (!metadata.properties?.city) errors.push('City is required');
    if (!metadata.properties?.state) errors.push('State is required');
    if (!metadata.properties?.propertyType) errors.push('Property type is required');
    
    // Attributes validation
    if (!Array.isArray(metadata.attributes)) {
      errors.push('Attributes must be an array');
    }

    this.validationResult = {
      valid: errors.length === 0,
      errors
    };

    this.cdr.markForCheck();
  }

  private generateMetadata(): ERC1155Metadata {
    const formValue = this.metadataForm.value;
    
    // Combine standard and custom attributes
    const allAttributes = [
      ...formValue.attributes.filter((attr: any) => attr.value),
      ...formValue.customAttributes.filter((attr: any) => attr.trait_type && attr.value)
    ];

    return {
      name: formValue.name,
      description: formValue.description,
      image: formValue.image.startsWith('ipfs://') ? formValue.image : `ipfs://${formValue.image}`,
      external_url: formValue.external_url,
      background_color: formValue.background_color,
      attributes: allAttributes,
      properties: {
        ...formValue.properties,
        amenities: formValue.properties.amenities || []
      }
    };
  }

  private emitMetadataChange(): void {
    if (this.metadataForm.valid) {
      const metadata = this.generateMetadata();
      this.metadataChanged.emit(metadata);
    }
  }

  getFormattedJson(): string {
    const metadata = this.generateMetadata();
    return JSON.stringify(metadata, null, 2);
  }

  loadTemplate(type: 'residential' | 'commercial' | 'industrial'): void {
    const templates = {
      residential: {
        name: 'Residential Property Token',
        description: 'Fractional ownership token for residential real estate property',
        propertyType: 'Residential',
        attributes: [
          { trait_type: 'Property Type', value: 'Residential' },
          { trait_type: 'Bedrooms', value: '3', display_type: 'number' },
          { trait_type: 'Bathrooms', value: '2', display_type: 'number' }
        ]
      },
      commercial: {
        name: 'Commercial Property Token',
        description: 'Fractional ownership token for commercial real estate property',
        propertyType: 'Commercial',
        attributes: [
          { trait_type: 'Property Type', value: 'Commercial' },
          { trait_type: 'Office Spaces', value: '10', display_type: 'number' }
        ]
      },
      industrial: {
        name: 'Industrial Property Token',
        description: 'Fractional ownership token for industrial real estate property',
        propertyType: 'Industrial',
        attributes: [
          { trait_type: 'Property Type', value: 'Industrial' },
          { trait_type: 'Loading Docks', value: '4', display_type: 'number' }
        ]
      }
    };

    const template = templates[type];
    this.metadataForm.patchValue({
      name: template.name,
      description: template.description,
      properties: {
        propertyType: template.propertyType
      }
    });

    this.snackBar.open(`${type} template loaded`, 'Close', { duration: 2000 });
  }

  loadMetadata(metadata: ERC1155Metadata): void {
    this.metadataForm.patchValue({
      name: metadata.name,
      description: metadata.description,
      image: metadata.image.replace('ipfs://', ''),
      external_url: metadata.external_url,
      background_color: metadata.background_color,
      properties: metadata.properties
    });

    // Load attributes
    if (metadata.attributes) {
      // Clear existing custom attributes
      while (this.customAttributesArray.length > 0) {
        this.customAttributesArray.removeAt(0);
      }

      // Separate standard and custom attributes
      metadata.attributes.forEach(attr => {
        const standardIndex = this.standardAttributes.findIndex(
          std => std.displayName === attr.trait_type
        );

        if (standardIndex >= 0) {
          // Update standard attribute
          this.attributesArray.at(standardIndex).patchValue(attr);
        } else {
          // Add as custom attribute
          const customAttr = this.fb.group({
            trait_type: [attr.trait_type],
            value: [attr.value],
            display_type: [attr.display_type || '']
          });
          this.customAttributesArray.push(customAttr);
        }
      });
    }

    this.cdr.markForCheck();
  }

  async copyJsonToClipboard(): Promise<void> {
    try {
      const json = this.getFormattedJson();
      await navigator.clipboard.writeText(json);
      this.snackBar.open('JSON copied to clipboard', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  }

  downloadJson(): void {
    const json = this.getFormattedJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metadata.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async uploadToIPFS(): Promise<void> {
    if (!this.metadataForm.valid) return;

    this.isUploading = true;
    this.uploadResult = null;
    this.cdr.markForCheck();

    try {
      const metadata = this.generateMetadata();
      const hash = await this.ipfsService.uploadMetadata(metadata);
      
      this.uploadResult = { success: true, hash };
      this.ipfsHashGenerated.emit(hash);
      
      this.snackBar.open('Metadata uploaded to IPFS successfully!', 'Close', {
        duration: 3000
      });

    } catch (error: any) {
      console.error('IPFS upload error:', error);
      this.uploadResult = { success: false, error: error.message };
      
    } finally {
      this.isUploading = false;
      this.cdr.markForCheck();
    }
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  previewMetadata(): void {
    // This could open a modal or navigate to a preview page
    console.log('Preview metadata:', this.generateMetadata());
  }

  openImageUpload(): void {
    // This could open a file upload dialog or modal
    console.log('Open image upload dialog');
  }

  resetForm(): void {
    this.metadataForm.reset();
    this.createForm();
    this.uploadResult = null;
    this.validationResult = { valid: false, errors: [] };
    this.cdr.markForCheck();
  }

  saveMetadata(): void {
    if (!this.metadataForm.valid) return;

    this.isLoading = true;
    const metadata = this.generateMetadata();
    
    // Simulate save operation
    setTimeout(() => {
      this.metadataSaved.emit(metadata);
      this.snackBar.open('Metadata saved successfully!', 'Close', {
        duration: 2000
      });
      this.isLoading = false;
      this.cdr.markForCheck();
    }, 1000);
  }

  onTabChange(event: any): void {
    if (event.index === 3) { // JSON Preview tab
      this.validateMetadata();
    }
  }
}