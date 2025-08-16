import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

interface EscrowProcess {
  id?: string;
  propertyId: string;
  userId: string;
  sharesOwned: number;
  investmentAmount: number;
  status: 'pending' | 'inspection' | 'lender_approval' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  estimatedCompletionTime: Date;
  actualCompletionTime?: Date;
  interestEarned: number;
  rejectionReason?: string;
  approvalSteps: {
    inspection: {
      status: 'pending' | 'in_progress' | 'passed' | 'failed';
      startTime?: Date;
      completionTime?: Date;
      failureReason?: string;
    };
    lenderApproval: {
      status: 'pending' | 'in_progress' | 'approved' | 'rejected';
      startTime?: Date;
      completionTime?: Date;
      rejectionReason?: string;
    };
  };
  requiresFinancing: boolean;
}

interface EscrowResult {
  success: boolean;
  process: EscrowProcess;
  finalAmount: number; // Original investment + interest (if failed) or 0 (if successful)
  message: string;
}

export class EscrowService {
  private static readonly INSPECTION_FAILURE_RATE = 0.1; // 10% failure rate
  private static readonly LENDER_REJECTION_RATE = 0.1; // 10% rejection rate for financed properties
  private static readonly INTEREST_RATE = 0.02; // 2% annual interest during escrow
  
  // Realistic inspection failure reasons
  private static readonly INSPECTION_FAILURES = [
    'Structural issues found in foundation requiring major repairs',
    'Electrical system violations of current building codes',
    'Plumbing damage discovered during inspection process',
    'HVAC system failure requiring complete replacement',
    'Roof damage exceeding acceptable repair thresholds',
    'Environmental hazards detected requiring remediation',
    'Safety code violations identified by municipal inspector',
    'Water damage found in basement and lower levels',
    'Pest infestation requiring professional treatment',
    'Asbestos materials found requiring specialized removal'
  ];

  // Realistic lender rejection reasons
  private static readonly LENDER_REJECTIONS = [
    'Property appraisal came in below purchase price',
    'Recent market conditions affect property financing',
    'Property type restrictions in current lending policy',
    'Debt-to-income ratio concerns for investment property',
    'Credit verification issues discovered during underwriting',
    'Property condition concerns identified by lender',
    'Market oversaturation in this property class',
    'Lending guidelines changed during approval process',
    'Property location risk assessment failed criteria',
    'Investment property financing limits reached'
  ];

  // Start escrow process for a property investment
  static async initiateEscrow(
    propertyId: string,
    userId: string,
    sharesOwned: number,
    investmentAmount: number,
    propertyClass: 'A' | 'B' | 'C'
  ): Promise<EscrowProcess> {
    try {
      console.log(`Initiating escrow for property ${propertyId}, user ${userId}`);

      // Determine if financing is required (Class C = cash only)
      const requiresFinancing = propertyClass !== 'C' && Math.random() > 0.3; // 70% chance for B/A class

      // Calculate estimated completion time (3-7 game days = 6-14 real minutes)
      const baseTime = 6 + Math.random() * 8; // 6-14 minutes
      const estimatedCompletionTime = new Date(Date.now() + baseTime * 60 * 1000);

      const escrowProcess: Omit<EscrowProcess, 'id'> = {
        propertyId,
        userId,
        sharesOwned,
        investmentAmount,
        status: 'pending',
        createdAt: new Date(),
        estimatedCompletionTime,
        interestEarned: 0,
        requiresFinancing,
        approvalSteps: {
          inspection: {
            status: 'pending',
          },
          lenderApproval: {
            status: requiresFinancing ? 'pending' : 'approved', // Skip if cash purchase
          },
        },
      };

      // Save to database
      const docRef = await addDoc(collection(db, 'escrowProcesses'), escrowProcess);
      const processWithId = { ...escrowProcess, id: docRef.id };

      // Start the approval process
      this.processEscrowStep(processWithId);

      return processWithId;

    } catch (error) {
      console.error('Error initiating escrow:', error);
      throw error;
    }
  }

  // Process escrow approval steps
  private static async processEscrowStep(process: EscrowProcess): Promise<void> {
    try {
      // Step 1: Inspection
      if (process.approvalSteps.inspection.status === 'pending') {
        await this.processInspection(process);
        return;
      }

      // Step 2: Lender approval (if required)
      if (process.requiresFinancing && process.approvalSteps.lenderApproval.status === 'pending') {
        await this.processLenderApproval(process);
        return;
      }

      // Step 3: Complete escrow
      if (process.approvalSteps.inspection.status === 'passed' && 
          process.approvalSteps.lenderApproval.status === 'approved') {
        await this.completeEscrow(process);
      }

    } catch (error) {
      console.error('Error processing escrow step:', error);
    }
  }

  // Process inspection phase
  private static async processInspection(process: EscrowProcess): Promise<void> {
    try {
      // Update to in_progress
      process.approvalSteps.inspection.status = 'in_progress';
      process.approvalSteps.inspection.startTime = new Date();
      process.status = 'inspection';
      
      await updateDoc(doc(db, 'escrowProcesses', process.id!), {
        'approvalSteps.inspection.status': 'in_progress',
        'approvalSteps.inspection.startTime': new Date(),
        status: 'inspection',
      });

      // Wait for inspection time (1-3 minutes)
      const inspectionTime = (1 + Math.random() * 2) * 60 * 1000;
      setTimeout(async () => {
        const passed = Math.random() > this.INSPECTION_FAILURE_RATE;
        
        if (passed) {
          // Inspection passed
          process.approvalSteps.inspection.status = 'passed';
          process.approvalSteps.inspection.completionTime = new Date();
          
          await updateDoc(doc(db, 'escrowProcesses', process.id!), {
            'approvalSteps.inspection.status': 'passed',
            'approvalSteps.inspection.completionTime': new Date(),
          });

          // Continue to next step
          this.processEscrowStep(process);

        } else {
          // Inspection failed
          const failureReason = this.INSPECTION_FAILURES[
            Math.floor(Math.random() * this.INSPECTION_FAILURES.length)
          ];
          
          process.approvalSteps.inspection.status = 'failed';
          process.approvalSteps.inspection.completionTime = new Date();
          process.approvalSteps.inspection.failureReason = failureReason;
          process.status = 'rejected';
          process.rejectionReason = `Inspection Failed: ${failureReason}`;
          process.actualCompletionTime = new Date();

          // Calculate interest earned during escrow
          const escrowDuration = Date.now() - process.createdAt.getTime();
          const interestEarned = this.calculateInterest(process.investmentAmount, escrowDuration);
          process.interestEarned = interestEarned;

          await updateDoc(doc(db, 'escrowProcesses', process.id!), {
            'approvalSteps.inspection.status': 'failed',
            'approvalSteps.inspection.completionTime': new Date(),
            'approvalSteps.inspection.failureReason': failureReason,
            status: 'rejected',
            rejectionReason: `Inspection Failed: ${failureReason}`,
            actualCompletionTime: new Date(),
            interestEarned,
          });

          // Refund user with interest
          await this.processRefund(process);
        }
      }, inspectionTime);

    } catch (error) {
      console.error('Error processing inspection:', error);
    }
  }

  // Process lender approval phase
  private static async processLenderApproval(process: EscrowProcess): Promise<void> {
    try {
      // Update to in_progress
      process.approvalSteps.lenderApproval.status = 'in_progress';
      process.approvalSteps.lenderApproval.startTime = new Date();
      process.status = 'lender_approval';
      
      await updateDoc(doc(db, 'escrowProcesses', process.id!), {
        'approvalSteps.lenderApproval.status': 'in_progress',
        'approvalSteps.lenderApproval.startTime': new Date(),
        status: 'lender_approval',
      });

      // Wait for lender approval time (2-4 minutes)
      const approvalTime = (2 + Math.random() * 2) * 60 * 1000;
      setTimeout(async () => {
        const approved = Math.random() > this.LENDER_REJECTION_RATE;
        
        if (approved) {
          // Lender approved
          process.approvalSteps.lenderApproval.status = 'approved';
          process.approvalSteps.lenderApproval.completionTime = new Date();
          
          await updateDoc(doc(db, 'escrowProcesses', process.id!), {
            'approvalSteps.lenderApproval.status': 'approved',
            'approvalSteps.lenderApproval.completionTime': new Date(),
          });

          // Continue to completion
          this.processEscrowStep(process);

        } else {
          // Lender rejected
          const rejectionReason = this.LENDER_REJECTIONS[
            Math.floor(Math.random() * this.LENDER_REJECTIONS.length)
          ];
          
          process.approvalSteps.lenderApproval.status = 'rejected';
          process.approvalSteps.lenderApproval.completionTime = new Date();
          process.approvalSteps.lenderApproval.rejectionReason = rejectionReason;
          process.status = 'rejected';
          process.rejectionReason = `Lender Rejected: ${rejectionReason}`;
          process.actualCompletionTime = new Date();

          // Calculate interest earned during escrow
          const escrowDuration = Date.now() - process.createdAt.getTime();
          const interestEarned = this.calculateInterest(process.investmentAmount, escrowDuration);
          process.interestEarned = interestEarned;

          await updateDoc(doc(db, 'escrowProcesses', process.id!), {
            'approvalSteps.lenderApproval.status': 'rejected',
            'approvalSteps.lenderApproval.completionTime': new Date(),
            'approvalSteps.lenderApproval.rejectionReason': rejectionReason,
            status: 'rejected',
            rejectionReason: `Lender Rejected: ${rejectionReason}`,
            actualCompletionTime: new Date(),
            interestEarned,
          });

          // Refund user with interest
          await this.processRefund(process);
        }
      }, approvalTime);

    } catch (error) {
      console.error('Error processing lender approval:', error);
    }
  }

  // Complete successful escrow
  private static async completeEscrow(process: EscrowProcess): Promise<void> {
    try {
      process.status = 'approved';
      process.actualCompletionTime = new Date();

      await updateDoc(doc(db, 'escrowProcesses', process.id!), {
        status: 'approved',
        actualCompletionTime: new Date(),
      });

      // Create actual investment record
      await addDoc(collection(db, 'investments'), {
        userId: process.userId,
        propertyId: process.propertyId,
        sharesOwned: process.sharesOwned,
        purchasePrice: process.investmentAmount,
        currentValue: process.investmentAmount, // Will be updated by appreciation
        purchaseDate: new Date(),
        escrowProcessId: process.id,
      });

      // Final update
      await updateDoc(doc(db, 'escrowProcesses', process.id!), {
        status: 'completed',
      });

      console.log(`Escrow completed successfully for property ${process.propertyId}`);

    } catch (error) {
      console.error('Error completing escrow:', error);
    }
  }

  // Process refund with interest
  private static async processRefund(process: EscrowProcess): Promise<void> {
    try {
      const refundAmount = process.investmentAmount + process.interestEarned;
      
      // Update user's ETH balance (you'll need to implement this)
      // For now, just log the refund
      console.log(`Refunding ${refundAmount} ETH to user ${process.userId}`);
      
      // TODO: Update user's balance in database
      // await this.updateUserBalance(process.userId, refundAmount);

    } catch (error) {
      console.error('Error processing refund:', error);
    }
  }

  // Calculate interest earned during escrow
  private static calculateInterest(principal: number, durationMs: number): number {
    const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365);
    const interest = principal * this.INTEREST_RATE * durationYears;
    return Number(interest.toFixed(6));
  }

  // Get escrow process by ID
  static async getEscrowProcess(escrowId: string): Promise<EscrowProcess | null> {
    try {
      const escrowDoc = await getDoc(doc(db, 'escrowProcesses', escrowId));
      
      if (escrowDoc.exists()) {
        const data = escrowDoc.data();
        return {
          id: escrowDoc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          estimatedCompletionTime: data.estimatedCompletionTime.toDate(),
          actualCompletionTime: data.actualCompletionTime?.toDate(),
          approvalSteps: {
            inspection: {
              ...data.approvalSteps.inspection,
              startTime: data.approvalSteps.inspection.startTime?.toDate(),
              completionTime: data.approvalSteps.inspection.completionTime?.toDate(),
            },
            lenderApproval: {
              ...data.approvalSteps.lenderApproval,
              startTime: data.approvalSteps.lenderApproval.startTime?.toDate(),
              completionTime: data.approvalSteps.lenderApproval.completionTime?.toDate(),
            },
          },
        } as EscrowProcess;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting escrow process:', error);
      return null;
    }
  }

  // Get user's active escrow processes
  static async getUserEscrowProcesses(userId: string): Promise<EscrowProcess[]> {
    try {
      const escrowQuery = query(
        collection(db, 'escrowProcesses'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(escrowQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          estimatedCompletionTime: data.estimatedCompletionTime.toDate(),
          actualCompletionTime: data.actualCompletionTime?.toDate(),
          approvalSteps: {
            inspection: {
              ...data.approvalSteps.inspection,
              startTime: data.approvalSteps.inspection.startTime?.toDate(),
              completionTime: data.approvalSteps.inspection.completionTime?.toDate(),
            },
            lenderApproval: {
              ...data.approvalSteps.lenderApproval,
              startTime: data.approvalSteps.lenderApproval.startTime?.toDate(),
              completionTime: data.approvalSteps.lenderApproval.completionTime?.toDate(),
            },
          },
        } as EscrowProcess;
      });
    } catch (error) {
      console.error('Error getting user escrow processes:', error);
      return [];
    }
  }

  // Get escrow statistics
  static async getEscrowStats(): Promise<{
    totalProcesses: number;
    successRate: number;
    averageCompletionTime: number;
    inspectionFailureRate: number;
    lenderRejectionRate: number;
  }> {
    try {
      const escrowQuery = query(collection(db, 'escrowProcesses'));
      const snapshot = await getDocs(escrowQuery);
      
      const processes = snapshot.docs.map(doc => doc.data());
      const totalProcesses = processes.length;
      
      if (totalProcesses === 0) {
        return {
          totalProcesses: 0,
          successRate: 0,
          averageCompletionTime: 0,
          inspectionFailureRate: 0,
          lenderRejectionRate: 0,
        };
      }

      const successful = processes.filter(p => p.status === 'completed').length;
      const inspectionFailed = processes.filter(p => p.approvalSteps.inspection.status === 'failed').length;
      const lenderRejected = processes.filter(p => p.approvalSteps.lenderApproval.status === 'rejected').length;
      
      const completedProcesses = processes.filter(p => p.actualCompletionTime);
      const averageCompletionTime = completedProcesses.length > 0
        ? completedProcesses.reduce((sum, p) => {
            const duration = p.actualCompletionTime.toDate().getTime() - p.createdAt.toDate().getTime();
            return sum + duration;
          }, 0) / completedProcesses.length
        : 0;

      return {
        totalProcesses,
        successRate: successful / totalProcesses,
        averageCompletionTime: averageCompletionTime / (1000 * 60), // Convert to minutes
        inspectionFailureRate: inspectionFailed / totalProcesses,
        lenderRejectionRate: lenderRejected / totalProcesses,
      };
    } catch (error) {
      console.error('Error getting escrow stats:', error);
      return {
        totalProcesses: 0,
        successRate: 0,
        averageCompletionTime: 0,
        inspectionFailureRate: 0,
        lenderRejectionRate: 0,
      };
    }
  }
}

export type { EscrowProcess, EscrowResult };