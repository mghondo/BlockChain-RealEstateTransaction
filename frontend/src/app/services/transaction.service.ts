import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { BehaviorSubject, Observable, from, timer, combineLatest } from 'rxjs';
import { map, switchMap, takeWhile, catchError, tap } from 'rxjs/operators';
import { Web3Service } from './web3.service';

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  timestamp?: number;
  errorMessage?: string;
  estimatedTime?: number; // in seconds
  chainId?: number;
}

export interface InvestmentTransaction {
  id: string;
  propertyAddress: string;
  investorAddress: string;
  amount: string;
  shares: number;
  method: 'direct-ethereum' | 'cross-chain-polygon';
  overallStatus: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  steps: TransactionStep[];
  startTime: number;
  completionTime?: number;
  totalGasUsed?: bigint;
  totalGasCost?: string;
  receipt?: {
    confirmationNumber: string;
    finalTxHash: string;
    proofOfOwnership: string;
  };
}

export interface TransactionSimulation {
  success: boolean;
  gasEstimate: bigint;
  gasPrice: bigint;
  estimatedCost: string;
  revertReason?: string;
  simulatedAt: number;
}

export interface GasPriceInfo {
  slow: bigint;
  standard: bigint;
  fast: bigint;
  timestamp: number;
  chainId: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private transactionsSubject = new BehaviorSubject<InvestmentTransaction[]>([]);
  public transactions$ = this.transactionsSubject.asObservable();

  private gasPricesSubject = new BehaviorSubject<GasPriceInfo[]>([]);
  public gasPrices$ = this.gasPricesSubject.asObservable();

  private readonly TRANSACTION_STORAGE_KEY = 'fracEstate_transactions';
  private readonly MAX_RETRIES = 3;
  private readonly CONFIRMATION_BLOCKS = 2;

  constructor(private web3Service: Web3Service) {
    this.loadStoredTransactions();
    this.startGasPriceMonitoring();
  }

  private loadStoredTransactions(): void {
    try {
      const stored = localStorage.getItem(this.TRANSACTION_STORAGE_KEY);
      if (stored) {
        const transactions = JSON.parse(stored);
        this.transactionsSubject.next(transactions);
      }
    } catch (error) {
      console.warn('Failed to load stored transactions:', error);
    }
  }

  private saveTransactions(): void {
    try {
      const transactions = this.transactionsSubject.value;
      localStorage.setItem(this.TRANSACTION_STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.warn('Failed to save transactions:', error);
    }
  }

  private startGasPriceMonitoring(): void {
    // Update gas prices every 30 seconds
    timer(0, 30000).pipe(
      switchMap(() => this.fetchCurrentGasPrices())
    ).subscribe(gasPrices => {
      if (gasPrices) {
        const current = this.gasPricesSubject.value;
        const updated = [...current.filter(gp => gp.chainId !== gasPrices.chainId), gasPrices];
        this.gasPricesSubject.next(updated);
      }
    });
  }

  private async fetchCurrentGasPrices(): Promise<GasPriceInfo | null> {
    try {
      const provider = await this.web3Service.getProvider();
      if (!provider) return null;

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Get current gas price from the network
      const gasPrice = (await provider.getFeeData()).gasPrice || BigInt(0);
      
      // Create estimates (in production, you'd use gas price APIs)
      const basePrice = gasPrice;
      const slow = (basePrice * BigInt(80)) / BigInt(100); // 80% of current
      const standard = basePrice;
      const fast = (basePrice * BigInt(120)) / BigInt(100); // 120% of current

      return {
        slow,
        standard,
        fast,
        timestamp: Date.now(),
        chainId
      };
    } catch (error) {
      console.error('Failed to fetch gas prices:', error);
      return null;
    }
  }

  createInvestmentTransaction(
    propertyAddress: string,
    amount: string,
    shares: number,
    method: 'direct-ethereum' | 'cross-chain-polygon'
  ): InvestmentTransaction {
    const id = `invest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const baseSteps: Omit<TransactionStep, 'id'>[] = method === 'direct-ethereum' 
      ? [
          {
            title: 'Approve USDC',
            description: 'Approve escrow contract to spend your USDC',
            status: 'pending',
            estimatedTime: 30
          },
          {
            title: 'Deposit Investment',
            description: 'Transfer USDC to escrow and mint property shares',
            status: 'pending',
            estimatedTime: 45
          },
          {
            title: 'Confirm Ownership',
            description: 'Verify property shares in your wallet',
            status: 'pending',
            estimatedTime: 15
          }
        ]
      : [
          {
            title: 'Switch to Polygon',
            description: 'Switch wallet to Polygon network',
            status: 'pending',
            estimatedTime: 10
          },
          {
            title: 'Approve USDC on Polygon',
            description: 'Approve bridge contract to spend your USDC',
            status: 'pending',
            estimatedTime: 20
          },
          {
            title: 'Initiate Cross-Chain Deposit',
            description: 'Start USDC bridge from Polygon to Ethereum',
            status: 'pending',
            estimatedTime: 60
          },
          {
            title: 'LayerZero Message Relay',
            description: 'Wait for cross-chain message confirmation',
            status: 'pending',
            estimatedTime: 300 // 5 minutes
          },
          {
            title: 'Ethereum Escrow Deposit',
            description: 'Complete investment on Ethereum escrow',
            status: 'pending',
            estimatedTime: 120
          },
          {
            title: 'Confirm Ownership',
            description: 'Verify property shares in your wallet',
            status: 'pending',
            estimatedTime: 30
          }
        ];

    const transaction: InvestmentTransaction = {
      id,
      propertyAddress,
      investorAddress: '', // Will be set when we get the account
      amount,
      shares,
      method,
      overallStatus: 'pending',
      steps: baseSteps.map((step, index) => ({
        ...step,
        id: `${id}-step-${index}`
      })),
      startTime: Date.now()
    };

    // Set investor address
    this.web3Service.getAccount().then(account => {
      if (account) {
        transaction.investorAddress = account;
        this.updateTransaction(transaction);
      }
    });

    const currentTransactions = this.transactionsSubject.value;
    this.transactionsSubject.next([...currentTransactions, transaction]);
    this.saveTransactions();

    return transaction;
  }

  async simulateTransaction(
    contractAddress: string,
    functionName: string,
    args: any[],
    value?: bigint
  ): Promise<TransactionSimulation> {
    try {
      const provider = await this.web3Service.getProvider();
      const signer = await this.web3Service.getSigner();
      
      if (!provider || !signer) {
        throw new Error('Provider or signer not available');
      }

      // Create a simple contract interface for simulation
      const contract = new ethers.Contract(contractAddress, [
        `function ${functionName}(...) external payable`
      ], signer);

      const gasEstimate = await contract[functionName].estimateGas(...args, { value });
      const gasPrice = (await provider.getFeeData()).gasPrice || BigInt(0);
      const estimatedCost = ethers.formatEther(gasEstimate * gasPrice);

      return {
        success: true,
        gasEstimate,
        gasPrice,
        estimatedCost,
        simulatedAt: Date.now()
      };
    } catch (error: any) {
      return {
        success: false,
        gasEstimate: BigInt(0),
        gasPrice: BigInt(0),
        estimatedCost: '0',
        revertReason: error.reason || error.message,
        simulatedAt: Date.now()
      };
    }
  }

  executeStep(transactionId: string, stepId: string): Observable<TransactionStep> {
    const transaction = this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const step = transaction.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    // Update step to in-progress
    step.status = 'in-progress';
    step.timestamp = Date.now();
    this.updateTransaction(transaction);

    // Execute the step based on its title
    return this.executeStepLogic(transaction, step).pipe(
      tap(updatedStep => {
        const stepIndex = transaction.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1) {
          transaction.steps[stepIndex] = updatedStep;
          this.updateOverallStatus(transaction);
          this.updateTransaction(transaction);
        }
      }),
      catchError(error => {
        step.status = 'failed';
        step.errorMessage = error.message || 'Unknown error occurred';
        transaction.overallStatus = 'failed';
        this.updateTransaction(transaction);
        throw error;
      })
    );
  }

  private executeStepLogic(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    switch (step.title) {
      case 'Switch to Polygon':
        return this.executeSwitchChain(137, step);
      
      case 'Approve USDC':
      case 'Approve USDC on Polygon':
        return this.executeApproval(transaction, step);
      
      case 'Deposit Investment':
        return this.executeDirectDeposit(transaction, step);
      
      case 'Initiate Cross-Chain Deposit':
        return this.executeCrossChainDeposit(transaction, step);
      
      case 'LayerZero Message Relay':
        return this.monitorLayerZeroRelay(transaction, step);
      
      case 'Ethereum Escrow Deposit':
        return this.monitorEscrowDeposit(transaction, step);
      
      case 'Confirm Ownership':
        return this.confirmOwnership(transaction, step);
      
      default:
        step.status = 'completed';
        return from([step]);
    }
  }

  private executeSwitchChain(chainId: number, step: TransactionStep): Observable<TransactionStep> {
    return from(this.web3Service.switchNetwork(chainId)).pipe(
      map(success => {
        if (success) {
          step.status = 'completed';
          step.chainId = chainId;
        } else {
          step.status = 'failed';
          step.errorMessage = 'Failed to switch network';
        }
        return step;
      })
    );
  }

  private executeApproval(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    // This would integrate with the contract service to execute USDC approval
    return timer(2000).pipe( // Simulate async operation
      map(() => {
        step.status = 'completed';
        step.txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        step.blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
        step.gasUsed = BigInt(21000);
        return step;
      })
    );
  }

  private executeDirectDeposit(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    // This would integrate with the contract service to execute the deposit
    return timer(3000).pipe(
      map(() => {
        step.status = 'completed';
        step.txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        step.blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
        step.gasUsed = BigInt(150000);
        return step;
      })
    );
  }

  private executeCrossChainDeposit(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    return timer(4000).pipe(
      map(() => {
        step.status = 'completed';
        step.txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        step.blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
        step.gasUsed = BigInt(200000);
        return step;
      })
    );
  }

  private monitorLayerZeroRelay(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    let progress = 0;
    return timer(0, 1000).pipe(
      takeWhile(() => progress < 100),
      map(() => {
        progress += Math.random() * 20;
        step.description = `LayerZero message relay in progress... ${Math.min(100, Math.floor(progress))}%`;
        
        if (progress >= 100) {
          step.status = 'completed';
          step.description = 'Cross-chain message confirmed on Ethereum';
        }
        
        return step;
      })
    );
  }

  private monitorEscrowDeposit(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    return timer(2000).pipe(
      map(() => {
        step.status = 'completed';
        step.txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        step.blockNumber = Math.floor(Math.random() * 1000000) + 15000000;
        step.gasUsed = BigInt(180000);
        return step;
      })
    );
  }

  private confirmOwnership(transaction: InvestmentTransaction, step: TransactionStep): Observable<TransactionStep> {
    return timer(1500).pipe(
      map(() => {
        step.status = 'completed';
        step.description = `Confirmed ${transaction.shares}% ownership of property`;
        
        // Generate receipt
        transaction.receipt = {
          confirmationNumber: `FE-${Date.now().toString(36).toUpperCase()}`,
          finalTxHash: step.txHash || `0x${Math.random().toString(16).substring(2, 66)}`,
          proofOfOwnership: `${transaction.shares}% shares in ${transaction.propertyAddress}`
        };
        
        return step;
      })
    );
  }

  private updateOverallStatus(transaction: InvestmentTransaction): void {
    const allCompleted = transaction.steps.every(step => step.status === 'completed');
    const anyFailed = transaction.steps.some(step => step.status === 'failed');
    const anyInProgress = transaction.steps.some(step => step.status === 'in-progress');

    if (anyFailed) {
      transaction.overallStatus = 'failed';
    } else if (allCompleted) {
      transaction.overallStatus = 'completed';
      transaction.completionTime = Date.now();
      
      // Calculate total gas used
      transaction.totalGasUsed = transaction.steps.reduce(
        (total, step) => total + (step.gasUsed || BigInt(0)), 
        BigInt(0)
      );
    } else if (anyInProgress) {
      transaction.overallStatus = 'in-progress';
    }
  }

  private updateTransaction(transaction: InvestmentTransaction): void {
    const transactions = this.transactionsSubject.value;
    const index = transactions.findIndex(tx => tx.id === transaction.id);
    
    if (index !== -1) {
      transactions[index] = transaction;
      this.transactionsSubject.next([...transactions]);
      this.saveTransactions();
    }
  }

  getTransaction(id: string): InvestmentTransaction | undefined {
    return this.transactionsSubject.value.find(tx => tx.id === id);
  }

  getUserTransactions(userAddress?: string): Observable<InvestmentTransaction[]> {
    return combineLatest([
      this.transactions$,
      from(this.web3Service.getAccount())
    ]).pipe(
      map(([transactions, currentAccount]) => {
        const targetAddress = userAddress || currentAccount;
        return transactions.filter(tx => 
          targetAddress && tx.investorAddress.toLowerCase() === targetAddress.toLowerCase()
        );
      })
    );
  }

  cancelTransaction(transactionId: string): boolean {
    const transaction = this.getTransaction(transactionId);
    if (!transaction || transaction.overallStatus === 'completed') {
      return false;
    }

    transaction.overallStatus = 'cancelled';
    transaction.completionTime = Date.now();
    
    // Cancel any pending steps
    transaction.steps.forEach(step => {
      if (step.status === 'pending') {
        step.status = 'failed';
        step.errorMessage = 'Cancelled by user';
      }
    });

    this.updateTransaction(transaction);
    return true;
  }

  retryTransaction(transactionId: string): Observable<InvestmentTransaction> {
    const transaction = this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Reset failed steps to pending
    transaction.steps.forEach(step => {
      if (step.status === 'failed') {
        step.status = 'pending';
        step.errorMessage = undefined;
        step.txHash = undefined;
        step.blockNumber = undefined;
        step.gasUsed = undefined;
      }
    });

    transaction.overallStatus = 'pending';
    transaction.completionTime = undefined;
    
    this.updateTransaction(transaction);
    return from([transaction]);
  }

  getGasPriceForChain(chainId: number): GasPriceInfo | undefined {
    return this.gasPricesSubject.value.find(gp => gp.chainId === chainId);
  }

  calculateTransactionCost(transaction: InvestmentTransaction): string {
    if (!transaction.totalGasUsed) return '0';
    
    // This is a simplified calculation
    // In production, you'd factor in the gas prices at time of execution
    const avgGasPrice = ethers.parseUnits('20', 'gwei'); // 20 gwei average
    const totalCost = transaction.totalGasUsed * avgGasPrice;
    
    return ethers.formatEther(totalCost);
  }
}