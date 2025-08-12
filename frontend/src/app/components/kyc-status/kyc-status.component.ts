import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

import { KYCService, KYCProfile, KYCDocument, VerificationStep } from '../../services/kyc.service';

@Component({
  selector: 'app-kyc-status',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatExpansionModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <div class="kyc-status-container">
      <div class="kyc-header">
        <div class="header-content">
          <div class="status-badge-container">
            <h1>KYC Verification</h1>
            <div class="status-badge" [class]="profile?.status || 'not_started'">
              <mat-icon>{{ getStatusIcon() }}</mat-icon>
              <span>{{ getStatusText() }}</span>
            </div>
          </div>
          <p class="header-description">
            Complete your Know Your Customer (KYC) verification to unlock full platform features
          </p>
          <div class="kyc-benefits">
            <div class="benefit-item">
              <mat-icon>security</mat-icon>
              <span>Secure & Compliant</span>
            </div>
            <div class="benefit-item">
              <mat-icon>account_balance_wallet</mat-icon>
              <span>Higher Investment Limits</span>
            </div>
            <div class="benefit-item">
              <mat-icon>verified_user</mat-icon>
              <span>Enhanced Features</span>
            </div>
          </div>
        </div>
        
        <div class="kyc-level-selector" *ngIf="profile?.status !== 'verified'">
          <h3>Select Verification Level</h3>
          <div class="level-cards">
            <mat-card 
              class="level-card" 
              [class.selected]="selectedLevel === 'basic'"
              (click)="selectLevel('basic')">
              <mat-card-header>
                <mat-card-title>Basic</mat-card-title>
                <mat-card-subtitle>Up to $10,000</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="level-features">
                  <div class="feature">✓ Basic property investments</div>
                  <div class="feature">✓ Standard yield rates</div>
                  <div class="feature">✓ Portfolio tracking</div>
                </div>
                <div class="level-requirements">
                  <strong>Required:</strong> ID, Proof of Address
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card 
              class="level-card premium" 
              [class.selected]="selectedLevel === 'enhanced'"
              (click)="selectLevel('enhanced')">
              <mat-card-header>
                <mat-card-title>Enhanced</mat-card-title>
                <mat-card-subtitle>Up to $100,000</mat-card-subtitle>
                <div class="premium-badge">
                  <mat-icon>star</mat-icon>
                  <span>POPULAR</span>
                </div>
              </mat-card-header>
              <mat-card-content>
                <div class="level-features">
                  <div class="feature">✓ Premium property access</div>
                  <div class="feature">✓ Enhanced yield rates</div>
                  <div class="feature">✓ Priority support</div>
                  <div class="feature">✓ Advanced analytics</div>
                </div>
                <div class="level-requirements">
                  <strong>Required:</strong> ID, Address, Income proof
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card 
              class="level-card institutional" 
              [class.selected]="selectedLevel === 'institutional'"
              (click)="selectLevel('institutional')">
              <mat-card-header>
                <mat-card-title>Institutional</mat-card-title>
                <mat-card-subtitle>Up to $1,000,000+</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="level-features">
                  <div class="feature">✓ Institutional access</div>
                  <div class="feature">✓ Custom investment terms</div>
                  <div class="feature">✓ Dedicated account manager</div>
                  <div class="feature">✓ White-label options</div>
                </div>
                <div class="level-requirements">
                  <strong>Required:</strong> Corporate docs, Financials
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </div>

      <!-- Progress Overview -->
      <mat-card class="progress-card" *ngIf="profile">
        <mat-card-header>
          <mat-card-title>Verification Progress</mat-card-title>
          <mat-card-subtitle>{{ getCompletedSteps() }}/{{ getTotalSteps() }} steps completed</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="progress-overview">
            <mat-progress-bar 
              mode="determinate" 
              [value]="getProgressPercentage()"
              [color]="getProgressColor()">
            </mat-progress-bar>
            <span class="progress-text">{{ getProgressPercentage() }}% Complete</span>
          </div>
          
          <div class="verification-steps">
            <div *ngFor="let step of verificationSteps" 
                 class="step-item" 
                 [class]="step.status">
              <div class="step-icon">
                <mat-icon *ngIf="step.status === 'completed'">check_circle</mat-icon>
                <mat-icon *ngIf="step.status === 'in_progress'">schedule</mat-icon>
                <mat-icon *ngIf="step.status === 'failed'">error</mat-icon>
                <mat-icon *ngIf="step.status === 'pending'">radio_button_unchecked</mat-icon>
              </div>
              <div class="step-content">
                <div class="step-title">{{ step.title }}</div>
                <div class="step-description">{{ step.description }}</div>
                <div class="step-meta">
                  <span class="estimated-time">{{ step.estimatedTime }}</span>
                  <span class="optional-badge" *ngIf="step.optional">Optional</span>
                </div>
              </div>
              <div class="step-actions">
                <button mat-icon-button 
                        *ngIf="step.status === 'pending' && isStepAvailable(step)"
                        (click)="startStep(step)"
                        matTooltip="Start this step">
                  <mat-icon>play_arrow</mat-icon>
                </button>
                <button mat-icon-button 
                        *ngIf="step.status === 'failed'"
                        (click)="retryStep(step)"
                        matTooltip="Retry this step">
                  <mat-icon>refresh</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Document Upload Section -->
      <mat-card class="documents-card" *ngIf="profile && (profile.status === 'in_progress' || profile.status === 'not_started')">
        <mat-card-header>
          <mat-card-title>Required Documents</mat-card-title>
          <mat-card-subtitle>Upload the following documents for verification</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="documents-grid">
            <div *ngFor="let document of profile.documents" 
                 class="document-item" 
                 [class]="document.status">
              <div class="document-info">
                <div class="document-icon">
                  <mat-icon>{{ getDocumentIcon(document.type) }}</mat-icon>
                </div>
                <div class="document-details">
                  <div class="document-name">{{ document.name }}</div>
                  <div class="document-type">{{ getDocumentTypeText(document.type) }}</div>
                  <div class="document-status">
                    <mat-icon class="status-icon">{{ getDocumentStatusIcon(document.status) }}</mat-icon>
                    <span>{{ getDocumentStatusText(document.status) }}</span>
                  </div>
                  <div class="required-badge" *ngIf="document.required">Required</div>
                </div>
              </div>
              <div class="document-actions">
                <input type="file" 
                       #fileInput 
                       [accept]="getAcceptedFileTypes(document.type)"
                       (change)="onFileSelected($event, document)"
                       style="display: none">
                <button mat-stroked-button 
                        *ngIf="document.status === 'pending'"
                        (click)="fileInput.click()"
                        [disabled]="uploadingDocument === document.id">
                  <mat-icon>cloud_upload</mat-icon>
                  Upload
                </button>
                <button mat-stroked-button 
                        *ngIf="document.status === 'uploaded'"
                        (click)="replaceDocument(document)">
                  <mat-icon>refresh</mat-icon>
                  Replace
                </button>
                <button mat-icon-button 
                        *ngIf="document.status === 'rejected'"
                        (click)="viewRejectionReason(document)"
                        matTooltip="View rejection reason">
                  <mat-icon>info</mat-icon>
                </button>
              </div>
              <mat-progress-bar 
                *ngIf="uploadingDocument === document.id" 
                mode="indeterminate"
                class="upload-progress">
              </mat-progress-bar>
            </div>
          </div>
          
          <div class="document-guidelines">
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>info</mat-icon>
                  Document Guidelines
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="guidelines-content">
                <div class="guideline-section">
                  <h4>General Requirements:</h4>
                  <ul>
                    <li>Documents must be clear and legible</li>
                    <li>All information must be visible</li>
                    <li>Documents must be in English or translated</li>
                    <li>Maximum file size: 10MB per document</li>
                    <li>Supported formats: PDF, JPG, PNG</li>
                  </ul>
                </div>
                <div class="guideline-section">
                  <h4>Identity Documents:</h4>
                  <ul>
                    <li>Government-issued photo ID (passport, driver's license)</li>
                    <li>Document must not be expired</li>
                    <li>All corners and edges must be visible</li>
                  </ul>
                </div>
                <div class="guideline-section">
                  <h4>Proof of Address:</h4>
                  <ul>
                    <li>Utility bill, bank statement, or government document</li>
                    <li>Document must be dated within the last 3 months</li>
                    <li>Address must match your profile information</li>
                  </ul>
                </div>
              </div>
            </mat-expansion-panel>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Personal Information Form -->
      <mat-card class="personal-info-card" *ngIf="showPersonalInfoForm">
        <mat-card-header>
          <mat-card-title>Personal Information</mat-card-title>
          <mat-card-subtitle>Provide your personal details for verification</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="personalInfoForm" (ngSubmit)="savePersonalInfo()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" required>
                <mat-error *ngIf="personalInfoForm.get('firstName')?.hasError('required')">
                  First name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" required>
                <mat-error *ngIf="personalInfoForm.get('lastName')?.hasError('required')">
                  Last name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Date of Birth</mat-label>
                <input matInput type="date" formControlName="dateOfBirth">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phoneNumber" type="tel">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Nationality</mat-label>
                <mat-select formControlName="nationality">
                  <mat-option value="US">United States</mat-option>
                  <mat-option value="CA">Canada</mat-option>
                  <mat-option value="UK">United Kingdom</mat-option>
                  <mat-option value="AU">Australia</mat-option>
                  <!-- Add more countries as needed -->
                </mat-select>
              </mat-form-field>
            </div>

            <div class="address-section" formGroupName="address">
              <h3>Address Information</h3>
              <div class="form-grid">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Street Address</mat-label>
                  <input matInput formControlName="street">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>City</mat-label>
                  <input matInput formControlName="city">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>State/Province</mat-label>
                  <input matInput formControlName="state">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>ZIP/Postal Code</mat-label>
                  <input matInput formControlName="zipCode">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Country</mat-label>
                  <mat-select formControlName="country">
                    <mat-option value="US">United States</mat-option>
                    <mat-option value="CA">Canada</mat-option>
                    <mat-option value="UK">United Kingdom</mat-option>
                    <mat-option value="AU">Australia</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>

            <div class="form-actions">
              <button mat-stroked-button type="button" (click)="cancelPersonalInfo()">
                Cancel
              </button>
              <button mat-raised-button 
                      type="submit" 
                      color="primary"
                      [disabled]="!personalInfoForm.valid || savingPersonalInfo">
                <mat-icon *ngIf="savingPersonalInfo">hourglass_empty</mat-icon>
                <mat-icon *ngIf="!savingPersonalInfo">save</mat-icon>
                {{ savingPersonalInfo ? 'Saving...' : 'Save Information' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Risk Assessment Form -->
      <mat-card class="risk-assessment-card" *ngIf="showRiskAssessment">
        <mat-card-header>
          <mat-card-title>Investment Risk Assessment</mat-card-title>
          <mat-card-subtitle>Help us understand your investment profile</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="riskAssessmentForm" (ngSubmit)="saveRiskAssessment()">
            <div class="risk-questions">
              <div class="question-group">
                <label class="question-label">What is your risk tolerance?</label>
                <mat-radio-group formControlName="riskTolerance">
                  <mat-radio-button value="conservative">
                    <strong>Conservative</strong> - I prefer stable, low-risk investments
                  </mat-radio-button>
                  <mat-radio-button value="moderate">
                    <strong>Moderate</strong> - I'm comfortable with some risk for better returns
                  </mat-radio-button>
                  <mat-radio-button value="aggressive">
                    <strong>Aggressive</strong> - I'm willing to take high risks for high returns
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <div class="question-group">
                <label class="question-label">What is your investment experience?</label>
                <mat-radio-group formControlName="investmentExperience">
                  <mat-radio-button value="beginner">
                    <strong>Beginner</strong> - I'm new to investing
                  </mat-radio-button>
                  <mat-radio-button value="intermediate">
                    <strong>Intermediate</strong> - I have some investment experience
                  </mat-radio-button>
                  <mat-radio-button value="advanced">
                    <strong>Advanced</strong> - I'm an experienced investor
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <div class="question-group">
                <label class="question-label">What is your investment time horizon?</label>
                <mat-radio-group formControlName="investmentHorizon">
                  <mat-radio-button value="short">
                    <strong>Short-term</strong> - Less than 2 years
                  </mat-radio-button>
                  <mat-radio-button value="medium">
                    <strong>Medium-term</strong> - 2-10 years
                  </mat-radio-button>
                  <mat-radio-button value="long">
                    <strong>Long-term</strong> - More than 10 years
                  </mat-radio-button>
                </mat-radio-group>
              </div>

              <div class="question-group">
                <label class="question-label">What are your liquidity needs?</label>
                <mat-radio-group formControlName="liquidityNeeds">
                  <mat-radio-button value="high">
                    <strong>High</strong> - I need quick access to my investments
                  </mat-radio-button>
                  <mat-radio-button value="medium">
                    <strong>Medium</strong> - Some liquidity is important
                  </mat-radio-button>
                  <mat-radio-button value="low">
                    <strong>Low</strong> - I can lock up funds for extended periods
                  </mat-radio-button>
                </mat-radio-group>
              </div>
            </div>

            <div class="form-actions">
              <button mat-stroked-button type="button" (click)="cancelRiskAssessment()">
                Cancel
              </button>
              <button mat-raised-button 
                      type="submit" 
                      color="primary"
                      [disabled]="!riskAssessmentForm.valid || savingRiskAssessment">
                <mat-icon *ngIf="savingRiskAssessment">hourglass_empty</mat-icon>
                <mat-icon *ngIf="!savingRiskAssessment">save</mat-icon>
                {{ savingRiskAssessment ? 'Saving...' : 'Complete Assessment' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Compliance Status -->
      <mat-card class="compliance-card" *ngIf="profile?.status === 'verified'">
        <mat-card-header>
          <mat-card-title>Compliance Status</mat-card-title>
          <mat-card-subtitle>Current compliance and regulatory status</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="compliance-overview">
            <div class="compliance-item" [class]="complianceStatus?.isCompliant ? 'compliant' : 'non-compliant'">
              <mat-icon>{{ complianceStatus?.isCompliant ? 'verified_user' : 'warning' }}</mat-icon>
              <div class="compliance-content">
                <div class="compliance-title">
                  {{ complianceStatus?.isCompliant ? 'Fully Compliant' : 'Compliance Issues' }}
                </div>
                <div class="compliance-description">
                  {{ complianceStatus?.isCompliant ? 'All compliance requirements are met' : 'Action required' }}
                </div>
              </div>
            </div>

            <div class="investment-limit" *ngIf="maxInvestmentLimit > 0">
              <mat-icon>account_balance_wallet</mat-icon>
              <div class="limit-content">
                <div class="limit-title">Current Investment Limit</div>
                <div class="limit-amount">\${{ formatNumber(maxInvestmentLimit) }}</div>
              </div>
            </div>
          </div>

          <div class="compliance-issues" *ngIf="complianceStatus?.issues && complianceStatus.issues.length > 0">
            <h4>Issues to Address:</h4>
            <mat-list>
              <mat-list-item *ngFor="let issue of complianceStatus.issues">
                <mat-icon matListIcon color="warn">warning</mat-icon>
                <div matLine>{{ issue }}</div>
              </mat-list-item>
            </mat-list>
          </div>

          <div class="compliance-recommendations" *ngIf="complianceStatus?.recommendations && complianceStatus.recommendations.length > 0">
            <h4>Recommendations:</h4>
            <mat-list>
              <mat-list-item *ngFor="let recommendation of complianceStatus.recommendations">
                <mat-icon matListIcon color="primary">lightbulb</mat-icon>
                <div matLine>{{ recommendation }}</div>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Action Buttons -->
      <div class="action-buttons" *ngIf="profile">
        <button mat-raised-button 
                color="primary" 
                *ngIf="canSubmitForReview()"
                (click)="submitForReview()"
                [disabled]="submittingForReview">
          <mat-icon *ngIf="submittingForReview">hourglass_empty</mat-icon>
          <mat-icon *ngIf="!submittingForReview">send</mat-icon>
          {{ submittingForReview ? 'Submitting...' : 'Submit for Review' }}
        </button>

        <button mat-stroked-button 
                *ngIf="profile.status !== 'verified'"
                (click)="upgradeKYCLevel()"
                [disabled]="!canUpgrade()">
          <mat-icon>upgrade</mat-icon>
          Upgrade KYC Level
        </button>

        <button mat-stroked-button 
                *ngIf="profile.status === 'verified'"
                (click)="downloadComplianceCertificate()">
          <mat-icon>download</mat-icon>
          Download Certificate
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./kyc-status.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KYCStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  profile: KYCProfile | null = null;
  verificationSteps: VerificationStep[] = [];
  complianceStatus: any = null;
  maxInvestmentLimit = 0;

  selectedLevel: 'basic' | 'enhanced' | 'institutional' = 'basic';
  showPersonalInfoForm = false;
  showRiskAssessment = false;

  personalInfoForm!: FormGroup;
  riskAssessmentForm!: FormGroup;

  uploadingDocument: string | null = null;
  savingPersonalInfo = false;
  savingRiskAssessment = false;
  submittingForReview = false;

  constructor(
    private kycService: KYCService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.createForms();
  }

  ngOnInit(): void {
    this.loadKYCData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForms(): void {
    this.personalInfoForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: [''],
      phoneNumber: [''],
      nationality: [''],
      address: this.fb.group({
        street: [''],
        city: [''],
        state: [''],
        zipCode: [''],
        country: ['']
      })
    });

    this.riskAssessmentForm = this.fb.group({
      riskTolerance: ['', Validators.required],
      investmentExperience: ['', Validators.required],
      investmentHorizon: ['', Validators.required],
      liquidityNeeds: ['', Validators.required]
    });
  }

  private loadKYCData(): void {
    this.kycService.getKYCProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.profile = profile;
        if (profile) {
          this.selectedLevel = profile.level;
          this.populatePersonalInfoForm(profile);
          this.populateRiskAssessmentForm(profile);
        }
        this.cdr.markForCheck();
      });

    this.kycService.getVerificationSteps()
      .pipe(takeUntil(this.destroy$))
      .subscribe(steps => {
        this.verificationSteps = steps;
        this.cdr.markForCheck();
      });

    // Load compliance status for verified users
    if (this.profile?.status === 'verified') {
      this.loadComplianceStatus();
      this.loadInvestmentLimit();
    }
  }

  private populatePersonalInfoForm(profile: KYCProfile): void {
    this.personalInfoForm.patchValue({
      firstName: profile.personalInfo.firstName,
      lastName: profile.personalInfo.lastName,
      dateOfBirth: profile.personalInfo.dateOfBirth,
      phoneNumber: profile.personalInfo.phoneNumber,
      nationality: profile.personalInfo.nationality,
      address: profile.personalInfo.address || {}
    });
  }

  private populateRiskAssessmentForm(profile: KYCProfile): void {
    this.riskAssessmentForm.patchValue({
      riskTolerance: profile.riskProfile.riskTolerance,
      investmentExperience: profile.riskProfile.investmentExperience,
      investmentHorizon: profile.riskProfile.investmentHorizon,
      liquidityNeeds: profile.riskProfile.liquidityNeeds
    });
  }

  private loadComplianceStatus(): void {
    this.kycService.checkComplianceStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.complianceStatus = status;
        this.cdr.markForCheck();
      });
  }

  private loadInvestmentLimit(): void {
    this.maxInvestmentLimit = this.kycService.getMaxInvestmentLimit();
    this.cdr.markForCheck();
  }

  selectLevel(level: 'basic' | 'enhanced' | 'institutional'): void {
    this.selectedLevel = level;
    
    if (this.profile && this.profile.level !== level) {
      this.kycService.upgradeKYCLevel(level)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.snackBar.open(`KYC level upgraded to ${level}`, 'Close', {
            duration: 3000
          });
        });
    }
  }

  getStatusIcon(): string {
    switch (this.profile?.status) {
      case 'verified': return 'verified_user';
      case 'pending_review': return 'hourglass_empty';
      case 'in_progress': return 'schedule';
      case 'rejected': return 'error';
      case 'expired': return 'warning';
      default: return 'info';
    }
  }

  getStatusText(): string {
    switch (this.profile?.status) {
      case 'verified': return 'Verified';
      case 'pending_review': return 'Under Review';
      case 'in_progress': return 'In Progress';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return 'Not Started';
    }
  }

  getProgressPercentage(): number {
    if (!this.verificationSteps.length) return 0;
    const completed = this.verificationSteps.filter(step => step.status === 'completed').length;
    return Math.round((completed / this.verificationSteps.length) * 100);
  }

  getProgressColor(): string {
    const percentage = this.getProgressPercentage();
    if (percentage >= 80) return 'primary';
    if (percentage >= 40) return 'accent';
    return 'warn';
  }

  getCompletedSteps(): number {
    return this.verificationSteps.filter(step => step.status === 'completed').length;
  }

  getTotalSteps(): number {
    return this.verificationSteps.length;
  }

  isStepAvailable(step: VerificationStep): boolean {
    const stepIndex = this.verificationSteps.indexOf(step);
    if (stepIndex === 0) return true;
    
    // Check if previous step is completed
    return this.verificationSteps[stepIndex - 1].status === 'completed';
  }

  startStep(step: VerificationStep): void {
    switch (step.id) {
      case 'personal-info':
        this.showPersonalInfoForm = true;
        break;
      case 'risk-assessment':
        this.showRiskAssessment = true;
        break;
      default:
        this.snackBar.open('This step will be available soon', 'Close', {
          duration: 2000
        });
    }
  }

  retryStep(step: VerificationStep): void {
    this.startStep(step);
  }

  getDocumentIcon(type: string): string {
    switch (type) {
      case 'identity': return 'badge';
      case 'address': return 'home';
      case 'income': return 'attach_money';
      case 'employment': return 'work';
      case 'bank_statement': return 'account_balance';
      default: return 'description';
    }
  }

  getDocumentTypeText(type: string): string {
    switch (type) {
      case 'identity': return 'Identity Document';
      case 'address': return 'Proof of Address';
      case 'income': return 'Income Verification';
      case 'employment': return 'Employment Document';
      case 'bank_statement': return 'Bank Statement';
      default: return 'Document';
    }
  }

  getDocumentStatusIcon(status: string): string {
    switch (status) {
      case 'verified': return 'check_circle';
      case 'uploaded': return 'cloud_done';
      case 'rejected': return 'error';
      default: return 'cloud_upload';
    }
  }

  getDocumentStatusText(status: string): string {
    switch (status) {
      case 'verified': return 'Verified';
      case 'uploaded': return 'Uploaded';
      case 'rejected': return 'Rejected';
      default: return 'Upload Required';
    }
  }

  getAcceptedFileTypes(documentType: string): string {
    return '.pdf,.jpg,.jpeg,.png';
  }

  onFileSelected(event: Event, document: KYCDocument): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('File size must be less than 10MB', 'Close', {
        duration: 3000
      });
      return;
    }

    this.uploadingDocument = document.id;
    this.cdr.markForCheck();

    this.kycService.uploadDocument(document.id, file)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.uploadingDocument = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.snackBar.open('Document uploaded successfully', 'Close', {
              duration: 3000
            });
          } else {
            this.snackBar.open(result.error || 'Upload failed', 'Close', {
              duration: 3000
            });
          }
        },
        error: (error) => {
          this.snackBar.open('Upload failed: ' + error.message, 'Close', {
            duration: 3000
          });
        }
      });

    // Clear input
    input.value = '';
  }

  replaceDocument(document: KYCDocument): void {
    // Similar to upload, but with replacement logic
    console.log('Replace document:', document);
  }

  viewRejectionReason(document: KYCDocument): void {
    this.snackBar.open(
      document.rejectionReason || 'Document was rejected. Please upload a new version.',
      'Close',
      { duration: 5000 }
    );
  }

  savePersonalInfo(): void {
    if (!this.personalInfoForm.valid) return;

    this.savingPersonalInfo = true;
    const formValue = this.personalInfoForm.value;

    this.kycService.updatePersonalInfo(formValue)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.savingPersonalInfo = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.showPersonalInfoForm = false;
          this.snackBar.open('Personal information saved successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open('Failed to save information: ' + error.message, 'Close', {
            duration: 3000
          });
        }
      });
  }

  cancelPersonalInfo(): void {
    this.showPersonalInfoForm = false;
  }

  saveRiskAssessment(): void {
    if (!this.riskAssessmentForm.valid) return;

    this.savingRiskAssessment = true;
    const formValue = this.riskAssessmentForm.value;

    this.kycService.updateRiskProfile(formValue)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.savingRiskAssessment = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.showRiskAssessment = false;
          this.snackBar.open('Risk assessment completed successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.snackBar.open('Failed to save assessment: ' + error.message, 'Close', {
            duration: 3000
          });
        }
      });
  }

  cancelRiskAssessment(): void {
    this.showRiskAssessment = false;
  }

  canSubmitForReview(): boolean {
    if (!this.profile) return false;
    
    const requiredDocs = this.profile.documents.filter(doc => doc.required);
    const uploadedDocs = requiredDocs.filter(doc => doc.status === 'uploaded');
    
    return this.profile.status === 'in_progress' && 
           uploadedDocs.length === requiredDocs.length;
  }

  submitForReview(): void {
    this.submittingForReview = true;

    this.kycService.submitForReview()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.submittingForReview = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.snackBar.open(result.message, 'Close', {
              duration: 5000
            });
          } else {
            this.snackBar.open(result.message, 'Close', {
              duration: 3000
            });
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to submit for review: ' + error.message, 'Close', {
            duration: 3000
          });
        }
      });
  }

  canUpgrade(): boolean {
    return this.profile?.status !== 'pending_review' && this.profile?.status !== 'verified';
  }

  upgradeKYCLevel(): void {
    // Logic to upgrade KYC level
    console.log('Upgrade KYC level');
  }

  downloadComplianceCertificate(): void {
    this.snackBar.open('Compliance certificate download feature coming soon', 'Close', {
      duration: 3000
    });
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
}