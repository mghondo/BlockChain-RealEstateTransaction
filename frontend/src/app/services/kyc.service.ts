import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

export interface KYCDocument {
  id: string;
  type: 'identity' | 'address' | 'income' | 'employment' | 'bank_statement';
  name: string;
  file?: File;
  ipfsHash?: string;
  uploadDate?: Date;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  rejectionReason?: string;
  expiryDate?: Date;
  required: boolean;
}

export interface KYCProfile {
  userId: string;
  status: 'not_started' | 'in_progress' | 'pending_review' | 'verified' | 'rejected' | 'expired';
  level: 'basic' | 'enhanced' | 'institutional';
  submittedDate?: Date;
  verifiedDate?: Date;
  expiryDate?: Date;
  documents: KYCDocument[];
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    nationality?: string;
    phoneNumber?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
  };
  investorAccreditation: {
    isAccredited: boolean;
    accreditationType?: 'income' | 'net_worth' | 'professional';
    verificationDate?: Date;
    annualIncome?: number;
    netWorth?: number;
  };
  riskProfile: {
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    investmentExperience: 'beginner' | 'intermediate' | 'advanced';
    investmentHorizon: 'short' | 'medium' | 'long';
    liquidityNeeds: 'high' | 'medium' | 'low';
  };
  complianceFlags: {
    isPEP: boolean; // Politically Exposed Person
    isSanctioned: boolean;
    hasAdverseMedia: boolean;
    lastScreeningDate?: Date;
  };
}

export interface KYCRequirements {
  level: 'basic' | 'enhanced' | 'institutional';
  documents: KYCDocument[];
  maxInvestmentLimit: number;
  additionalVerifications: string[];
}

export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimatedTime: string;
  documents: string[];
  optional: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class KYCService {
  private kycProfileSubject = new BehaviorSubject<KYCProfile | null>(null);
  public kycProfile$ = this.kycProfileSubject.asObservable();

  private verificationStepsSubject = new BehaviorSubject<VerificationStep[]>([]);
  public verificationSteps$ = this.verificationStepsSubject.asObservable();

  private kycRequirements: { [key: string]: KYCRequirements } = {
    basic: {
      level: 'basic',
      documents: [
        {
          id: 'identity-1',
          type: 'identity',
          name: 'Government-issued ID',
          status: 'pending',
          required: true
        },
        {
          id: 'address-1',
          type: 'address',
          name: 'Proof of Address',
          status: 'pending',
          required: true
        }
      ],
      maxInvestmentLimit: 10000,
      additionalVerifications: ['phone', 'email']
    },
    enhanced: {
      level: 'enhanced',
      documents: [
        {
          id: 'identity-1',
          type: 'identity',
          name: 'Government-issued ID',
          status: 'pending',
          required: true
        },
        {
          id: 'address-1',
          type: 'address',
          name: 'Proof of Address',
          status: 'pending',
          required: true
        },
        {
          id: 'income-1',
          type: 'income',
          name: 'Income Verification',
          status: 'pending',
          required: true
        },
        {
          id: 'bank-1',
          type: 'bank_statement',
          name: 'Bank Statement',
          status: 'pending',
          required: false
        }
      ],
      maxInvestmentLimit: 100000,
      additionalVerifications: ['phone', 'email', 'video_call', 'accreditation']
    },
    institutional: {
      level: 'institutional',
      documents: [
        {
          id: 'identity-1',
          type: 'identity',
          name: 'Corporate Registration',
          status: 'pending',
          required: true
        },
        {
          id: 'address-1',
          type: 'address',
          name: 'Business Address Proof',
          status: 'pending',
          required: true
        },
        {
          id: 'employment-1',
          type: 'employment',
          name: 'Authorized Signatory Document',
          status: 'pending',
          required: true
        },
        {
          id: 'bank-1',
          type: 'bank_statement',
          name: 'Corporate Bank Statement',
          status: 'pending',
          required: true
        }
      ],
      maxInvestmentLimit: 1000000,
      additionalVerifications: ['phone', 'email', 'video_call', 'corporate_verification', 'ultimate_beneficial_owner']
    }
  };

  constructor() {
    this.initializeMockProfile();
    this.initializeVerificationSteps();
  }

  private initializeMockProfile(): void {
    const mockProfile: KYCProfile = {
      userId: 'user123',
      status: 'in_progress',
      level: 'basic',
      documents: this.kycRequirements['basic'].documents,
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-0123'
      },
      investorAccreditation: {
        isAccredited: false
      },
      riskProfile: {
        riskTolerance: 'moderate',
        investmentExperience: 'intermediate',
        investmentHorizon: 'medium',
        liquidityNeeds: 'medium'
      },
      complianceFlags: {
        isPEP: false,
        isSanctioned: false,
        hasAdverseMedia: false
      }
    };

    this.kycProfileSubject.next(mockProfile);
  }

  private initializeVerificationSteps(): void {
    const steps: VerificationStep[] = [
      {
        id: 'personal-info',
        title: 'Personal Information',
        description: 'Provide your basic personal details',
        status: 'completed',
        estimatedTime: '2 minutes',
        documents: [],
        optional: false
      },
      {
        id: 'identity-verification',
        title: 'Identity Verification',
        description: 'Upload a government-issued photo ID',
        status: 'in_progress',
        estimatedTime: '5 minutes',
        documents: ['Government ID', 'Selfie'],
        optional: false
      },
      {
        id: 'address-verification',
        title: 'Address Verification',
        description: 'Provide proof of your residential address',
        status: 'pending',
        estimatedTime: '3 minutes',
        documents: ['Utility bill', 'Bank statement', 'Government document'],
        optional: false
      },
      {
        id: 'financial-verification',
        title: 'Financial Information',
        description: 'Verify your income and financial capacity',
        status: 'pending',
        estimatedTime: '10 minutes',
        documents: ['Pay stub', 'Tax return', 'Bank statement'],
        optional: true
      },
      {
        id: 'risk-assessment',
        title: 'Risk Assessment',
        description: 'Complete investment risk questionnaire',
        status: 'pending',
        estimatedTime: '5 minutes',
        documents: [],
        optional: false
      }
    ];

    this.verificationStepsSubject.next(steps);
  }

  getKYCProfile(): Observable<KYCProfile | null> {
    return this.kycProfile$;
  }

  getVerificationSteps(): Observable<VerificationStep[]> {
    return this.verificationSteps$;
  }

  getKYCRequirements(level: 'basic' | 'enhanced' | 'institutional'): KYCRequirements {
    return this.kycRequirements[level];
  }

  updatePersonalInfo(personalInfo: Partial<KYCProfile['personalInfo']>): Observable<boolean> {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No KYC profile found'));
    }

    const updatedProfile = {
      ...currentProfile,
      personalInfo: {
        ...currentProfile.personalInfo,
        ...personalInfo
      }
    };

    return of(true).pipe(
      delay(1000),
      switchMap(() => {
        this.kycProfileSubject.next(updatedProfile);
        this.updateVerificationStepStatus('personal-info', 'completed');
        return of(true);
      })
    );
  }

  uploadDocument(documentId: string, file: File): Observable<{ success: boolean; ipfsHash?: string; error?: string }> {
    return of(null).pipe(
      delay(2000), // Simulate upload time
      switchMap(() => {
        const mockHash = 'Qm' + Math.random().toString(36).substring(2, 46);
        
        const currentProfile = this.kycProfileSubject.value;
        if (!currentProfile) {
          return of({ success: false, error: 'No KYC profile found' });
        }

        const documentIndex = currentProfile.documents.findIndex(doc => doc.id === documentId);
        if (documentIndex === -1) {
          return of({ success: false, error: 'Document not found' });
        }

        const updatedDocuments = [...currentProfile.documents];
        updatedDocuments[documentIndex] = {
          ...updatedDocuments[documentIndex],
          file,
          ipfsHash: mockHash,
          uploadDate: new Date(),
          status: 'uploaded'
        };

        const updatedProfile = {
          ...currentProfile,
          documents: updatedDocuments
        };

        this.kycProfileSubject.next(updatedProfile);
        this.checkAndUpdateProfileStatus();

        return of({ success: true, ipfsHash: mockHash });
      })
    );
  }

  updateRiskProfile(riskProfile: Partial<KYCProfile['riskProfile']>): Observable<boolean> {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No KYC profile found'));
    }

    const updatedProfile = {
      ...currentProfile,
      riskProfile: {
        ...currentProfile.riskProfile,
        ...riskProfile
      }
    };

    return of(true).pipe(
      delay(500),
      switchMap(() => {
        this.kycProfileSubject.next(updatedProfile);
        this.updateVerificationStepStatus('risk-assessment', 'completed');
        return of(true);
      })
    );
  }

  updateInvestorAccreditation(accreditation: Partial<KYCProfile['investorAccreditation']>): Observable<boolean> {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No KYC profile found'));
    }

    const updatedProfile = {
      ...currentProfile,
      investorAccreditation: {
        ...currentProfile.investorAccreditation,
        ...accreditation,
        verificationDate: new Date()
      }
    };

    return of(true).pipe(
      delay(1000),
      switchMap(() => {
        this.kycProfileSubject.next(updatedProfile);
        return of(true);
      })
    );
  }

  submitForReview(): Observable<{ success: boolean; message: string }> {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No KYC profile found'));
    }

    // Check if all required documents are uploaded
    const requiredDocuments = currentProfile.documents.filter(doc => doc.required);
    const uploadedRequiredDocs = requiredDocuments.filter(doc => doc.status === 'uploaded');

    if (uploadedRequiredDocs.length < requiredDocuments.length) {
      return of({
        success: false,
        message: 'Please upload all required documents before submitting for review'
      });
    }

    return of(null).pipe(
      delay(1500),
      switchMap(() => {
        const updatedProfile = {
          ...currentProfile,
          status: 'pending_review' as const,
          submittedDate: new Date()
        };

        this.kycProfileSubject.next(updatedProfile);
        this.updateAllStepsToCompleted();

        return of({
          success: true,
          message: 'KYC application submitted successfully. Review typically takes 1-2 business days.'
        });
      })
    );
  }

  upgradeKYCLevel(newLevel: 'basic' | 'enhanced' | 'institutional'): Observable<boolean> {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) {
      return throwError(() => new Error('No KYC profile found'));
    }

    const newRequirements = this.kycRequirements[newLevel];
    const updatedProfile = {
      ...currentProfile,
      level: newLevel,
      status: 'in_progress' as const,
      documents: newRequirements.documents
    };

    return of(true).pipe(
      delay(500),
      switchMap(() => {
        this.kycProfileSubject.next(updatedProfile);
        this.resetVerificationStepsForLevel(newLevel);
        return of(true);
      })
    );
  }

  checkComplianceStatus(): Observable<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) {
      return of({
        isCompliant: false,
        issues: ['No KYC profile found'],
        recommendations: ['Please complete KYC verification']
      });
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check document expiry
    const expiredDocs = currentProfile.documents.filter(doc => 
      doc.expiryDate && doc.expiryDate < new Date()
    );
    if (expiredDocs.length > 0) {
      issues.push('Some documents have expired');
      recommendations.push('Please upload updated versions of expired documents');
    }

    // Check profile expiry
    if (currentProfile.expiryDate && currentProfile.expiryDate < new Date()) {
      issues.push('KYC profile has expired');
      recommendations.push('Please complete KYC renewal process');
    }

    // Check for compliance flags
    if (currentProfile.complianceFlags.isSanctioned) {
      issues.push('Account flagged for sanctions screening');
    }

    if (currentProfile.complianceFlags.hasAdverseMedia) {
      issues.push('Adverse media detected');
      recommendations.push('Please provide additional documentation');
    }

    // Check screening date
    const lastScreening = currentProfile.complianceFlags.lastScreeningDate;
    if (!lastScreening || (new Date().getTime() - lastScreening.getTime()) > 90 * 24 * 60 * 60 * 1000) {
      recommendations.push('Compliance screening is due');
    }

    return of({
      isCompliant: issues.length === 0,
      issues,
      recommendations
    }).pipe(delay(1000));
  }

  getMaxInvestmentLimit(): number {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile || currentProfile.status !== 'verified') {
      return 0;
    }

    return this.kycRequirements[currentProfile.level].maxInvestmentLimit;
  }

  private updateVerificationStepStatus(stepId: string, status: VerificationStep['status']): void {
    const currentSteps = this.verificationStepsSubject.value;
    const updatedSteps = currentSteps.map(step => 
      step.id === stepId ? { ...step, status } : step
    );
    this.verificationStepsSubject.next(updatedSteps);
  }

  private updateAllStepsToCompleted(): void {
    const currentSteps = this.verificationStepsSubject.value;
    const updatedSteps = currentSteps.map(step => ({
      ...step,
      status: 'completed' as const
    }));
    this.verificationStepsSubject.next(updatedSteps);
  }

  private resetVerificationStepsForLevel(level: string): void {
    // Reset steps based on KYC level
    const steps = this.verificationStepsSubject.value.map(step => ({
      ...step,
      status: step.id === 'personal-info' ? 'completed' as const : 'pending' as const
    }));
    
    this.verificationStepsSubject.next(steps);
  }

  private checkAndUpdateProfileStatus(): void {
    const currentProfile = this.kycProfileSubject.value;
    if (!currentProfile) return;

    const requiredDocs = currentProfile.documents.filter(doc => doc.required);
    const uploadedDocs = requiredDocs.filter(doc => doc.status === 'uploaded');

    if (uploadedDocs.length === requiredDocs.length) {
      // All required documents uploaded, update relevant steps
      this.updateVerificationStepStatus('identity-verification', 'completed');
      this.updateVerificationStepStatus('address-verification', 'completed');
    }
  }

  // Mock verification methods (would integrate with real KYC providers)
  performBackgroundCheck(): Observable<{ passed: boolean; details: string }> {
    return of({ passed: true, details: 'Background check completed successfully' }).pipe(
      delay(3000)
    );
  }

  verifyIdentity(documentHash: string): Observable<{ verified: boolean; confidence: number }> {
    return of({ verified: true, confidence: 0.95 }).pipe(
      delay(2000)
    );
  }

  screenForSanctions(): Observable<{ clear: boolean; matches: any[] }> {
    return of({ clear: true, matches: [] }).pipe(
      delay(1500)
    );
  }
}