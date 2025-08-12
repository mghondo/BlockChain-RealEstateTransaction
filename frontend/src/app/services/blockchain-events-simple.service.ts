import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Web3Service } from './web3.service';

export interface EscrowEvent {
  type: string;
  escrowAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  data: any;
}

export interface EscrowPhase {
  id: number;
  name: string;
  timestamp: number;
  description: string;
}

export interface TimelockAction {
  actionType: string;
  executeAfter: number;
  isPending: boolean;
  timeRemaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class BlockchainEventsService {
  private eventSubject = new Subject<EscrowEvent>();
  private phaseUpdateSubject = new Subject<{ escrowAddress: string; phase: EscrowPhase }>();
  private timelockUpdateSubject = new Subject<{ escrowAddress: string; timelock: TimelockAction }>();
  
  private readonly PHASE_NAMES = {
    0: 'Created',
    1: 'Earnest Deposited', 
    2: 'Approved',
    3: 'Fully Funded',
    4: 'Completed',
    5: 'Cancelled'
  };

  private readonly PHASE_DESCRIPTIONS = {
    0: 'Escrow created, waiting for buyer initialization',
    1: 'Buyers have deposited earnest money, awaiting inspection',
    2: 'All parties approved, ready for full funding',
    3: 'Property fully funded, executing sale with timelock',
    4: 'Transaction completed successfully',
    5: 'Transaction cancelled, funds refunded'
  };

  constructor(private web3Service: Web3Service) {}

  get events$(): Observable<EscrowEvent> {
    return this.eventSubject.asObservable();
  }

  get phaseUpdates$(): Observable<{ escrowAddress: string; phase: EscrowPhase }> {
    return this.phaseUpdateSubject.asObservable();
  }

  get timelockUpdates$(): Observable<{ escrowAddress: string; timelock: TimelockAction }> {
    return this.timelockUpdateSubject.asObservable();
  }

  async subscribeToEscrow(escrowAddress: string): Promise<void> {
    // Mock implementation - in real app would connect to blockchain
    console.log('Subscribing to escrow:', escrowAddress);
    
    // Simulate initial phase
    const mockPhase: EscrowPhase = {
      id: 1,
      name: this.PHASE_NAMES[1],
      timestamp: Date.now(),
      description: this.PHASE_DESCRIPTIONS[1]
    };
    
    this.phaseUpdateSubject.next({ escrowAddress, phase: mockPhase });
  }

  async unsubscribeFromEscrow(escrowAddress: string): Promise<void> {
    console.log('Unsubscribing from escrow:', escrowAddress);
  }

  async updateEscrowPhase(escrowAddress: string): Promise<void> {
    // Mock phase update
    const mockPhase: EscrowPhase = {
      id: 1,
      name: this.PHASE_NAMES[1],
      timestamp: Date.now(),
      description: this.PHASE_DESCRIPTIONS[1]
    };
    
    this.phaseUpdateSubject.next({ escrowAddress, phase: mockPhase });
  }

  async updateTimelockStatus(escrowAddress: string, actionType: string): Promise<void> {
    // Mock timelock update
    const mockTimelock: TimelockAction = {
      actionType,
      isPending: true,
      executeAfter: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
      timeRemaining: 24 * 60 * 60 * 1000
    };
    
    this.timelockUpdateSubject.next({ escrowAddress, timelock: mockTimelock });
  }

  async getHistoricalEvents(
    escrowAddress: string, 
    fromBlock: number = 0,
    toBlock: number | string = 'latest'
  ): Promise<EscrowEvent[]> {
    // Mock historical events
    return [
      {
        type: 'BuyersInitialized',
        escrowAddress,
        transactionHash: '0x1234...5678',
        blockNumber: 12345678,
        timestamp: Date.now() - 86400000, // 1 day ago
        data: {}
      },
      {
        type: 'EarnestMoneyDeposited',
        escrowAddress,
        transactionHash: '0x2345...6789',
        blockNumber: 12345679,
        timestamp: Date.now() - 3600000, // 1 hour ago
        data: {}
      }
    ];
  }

  async getYieldBalance(escrowAddress: string): Promise<number> {
    // Mock yield balance
    return 1050.25; // $1,050.25
  }

  stopAllListeners(): void {
    console.log('Stopping all listeners');
  }
}