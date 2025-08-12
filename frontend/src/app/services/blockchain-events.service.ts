import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ethers, ContractEventPayload } from 'ethers';
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
  
  private escrowContracts = new Map<string, ethers.Contract>();
  private eventFilters = new Map<string, ethers.EventFilter[]>();
  private isListening = false;

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

  constructor(private web3Service: Web3Service) {
    this.startEventMonitoring();
  }

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
    if (this.escrowContracts.has(escrowAddress)) {
      return;
    }

    const provider = await this.web3Service.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    const escrowABI = [
      "event EarnestMoneyDeposited(address indexed buyer, uint256 amount, uint256 timestamp)",
      "event CrossChainDepositReceived(address indexed buyer, uint256 amount, uint256 shares, bytes32 indexed depositId)",
      "event InspectionStatusUpdated(address indexed inspector, bool passed, uint256 timestamp)",
      "event ApprovalGranted(address indexed approver, string role, uint256 timestamp)",
      "event FullPriceFunded(address indexed funder, uint256 amount, uint256 timestamp)",
      "event TransactionFinalized(address indexed seller, uint256 amount, uint256 timestamp)",
      "event TransactionCancelled(bool inspectionFailed, uint256 refundedAmount, address indexed recipient, uint256 timestamp)",
      "event YieldEarned(uint256 amount, uint256 timestamp)",
      "event BuyersInitialized(address[] buyers, uint256[] shares, uint256 timestamp)",
      "event TimelockInitiated(bytes32 indexed actionType, uint256 executeAfter)",
      "event TimelockExecuted(bytes32 indexed actionType, uint256 timestamp)",
      "function currentPhase() external view returns (uint8 id, uint256 timestamp)",
      "function getTimelockStatus(string memory actionType) external view returns (bool isPending, uint256 executeAfter)",
      "function config() external view returns (address, uint256, uint256, uint256, address, address, address, address, address, address, address)"
    ];

    const contract = new ethers.Contract(escrowAddress, escrowABI, provider);
    this.escrowContracts.set(escrowAddress, contract);

    const eventFilters = [
      contract.filters['EarnestMoneyDeposited'](),
      contract.filters['CrossChainDepositReceived'](),
      contract.filters['InspectionStatusUpdated'](),
      contract.filters['ApprovalGranted'](),
      contract.filters['FullPriceFunded'](),
      contract.filters['TransactionFinalized'](),
      contract.filters['TransactionCancelled'](),
      contract.filters['YieldEarned'](),
      contract.filters['BuyersInitialized'](),
      contract.filters['TimelockInitiated'](),
      contract.filters['TimelockExecuted']()
    ];

    this.eventFilters.set(escrowAddress, eventFilters as any);

    // Subscribe to events using event names instead of filters
    const eventNames = [
      'EarnestMoneyDeposited',
      'CrossChainDepositReceived', 
      'InspectionStatusUpdated',
      'ApprovalGranted',
      'FullPriceFunded',
      'TransactionFinalized',
      'TransactionCancelled',
      'YieldEarned',
      'BuyersInitialized',
      'TimelockInitiated',
      'TimelockExecuted'
    ];

    eventNames.forEach(eventName => {
      contract.on(eventName, (...args) => {
        const event = { eventName, args: args.slice(0, -1) };
        this.handleContractEvent(escrowAddress, event);
      });
    });

    await this.updateEscrowPhase(escrowAddress);
  }

  async unsubscribeFromEscrow(escrowAddress: string): Promise<void> {
    const contract = this.escrowContracts.get(escrowAddress);

    if (contract) {
      // Remove all listeners
      contract.removeAllListeners();
    }

    this.escrowContracts.delete(escrowAddress);
    this.eventFilters.delete(escrowAddress);
  }

  async updateEscrowPhase(escrowAddress: string): Promise<void> {
    const contract = this.escrowContracts.get(escrowAddress);
    if (!contract) {
      throw new Error('Escrow not subscribed');
    }

    try {
      const [phaseId, timestamp] = await contract['currentPhase']();
      
      const phase: EscrowPhase = {
        id: Number(phaseId),
        name: this.PHASE_NAMES[Number(phaseId) as keyof typeof this.PHASE_NAMES] || 'Unknown',
        timestamp: Number(timestamp) * 1000,
        description: this.PHASE_DESCRIPTIONS[Number(phaseId) as keyof typeof this.PHASE_DESCRIPTIONS] || 'Unknown phase'
      };

      this.phaseUpdateSubject.next({ escrowAddress, phase });
    } catch (error) {
      console.error('Error updating escrow phase:', error);
    }
  }

  async updateTimelockStatus(escrowAddress: string, actionType: string): Promise<void> {
    const contract = this.escrowContracts.get(escrowAddress);
    if (!contract) {
      throw new Error('Escrow not subscribed');
    }

    try {
      const [isPending, executeAfter] = await contract['getTimelockStatus'](actionType);
      
      const timelock: TimelockAction = {
        actionType,
        isPending,
        executeAfter: Number(executeAfter) * 1000,
        timeRemaining: Math.max(0, (Number(executeAfter) * 1000) - Date.now())
      };

      this.timelockUpdateSubject.next({ escrowAddress, timelock });
    } catch (error) {
      console.error('Error updating timelock status:', error);
    }
  }

  private handleContractEvent(escrowAddress: string, event: any): void {
    const escrowEvent: EscrowEvent = {
      type: event.eventName || event.event || 'Unknown',
      escrowAddress,
      transactionHash: event.transactionHash || '',
      blockNumber: event.blockNumber || 0,
      timestamp: Date.now(),
      data: event.args
    };

    this.eventSubject.next(escrowEvent);

    const eventName = event.eventName || event.event;
    if (this.isPhaseChangingEvent(eventName)) {
      this.updateEscrowPhase(escrowAddress);
    }

    if (eventName === 'TimelockInitiated') {
      const actionTypeBytes32 = event.args?.[0];
      const actionType = this.decodeActionType(actionTypeBytes32);
      this.updateTimelockStatus(escrowAddress, actionType);
    }

    if (eventName === 'TimelockExecuted') {
      const actionTypeBytes32 = event.args?.[0];
      const actionType = this.decodeActionType(actionTypeBytes32);
      this.updateTimelockStatus(escrowAddress, actionType);
    }
  }

  private isPhaseChangingEvent(eventName?: string): boolean {
    const phaseChangingEvents = [
      'BuyersInitialized',
      'EarnestMoneyDeposited',
      'ApprovalGranted',
      'FullPriceFunded',
      'TransactionFinalized',
      'TransactionCancelled'
    ];
    return phaseChangingEvents.includes(eventName || '');
  }

  private decodeActionType(actionTypeBytes32: string): string {
    const actionTypes: { [key: string]: string } = {
      [ethers.keccak256(ethers.toUtf8Bytes('FINALIZE_SALE'))]: 'FINALIZE_SALE',
      [ethers.keccak256(ethers.toUtf8Bytes('CANCEL_SALE'))]: 'CANCEL_SALE'
    };
    
    return actionTypes[actionTypeBytes32] || 'UNKNOWN';
  }

  private startEventMonitoring(): void {
    if (this.isListening) {
      return;
    }

    this.isListening = true;
    
    setInterval(async () => {
      for (const [escrowAddress] of this.escrowContracts) {
        await this.updateTimelockStatus(escrowAddress, 'FINALIZE_SALE');
        await this.updateTimelockStatus(escrowAddress, 'CANCEL_SALE');
      }
    }, 5000);
  }

  async getHistoricalEvents(
    escrowAddress: string, 
    fromBlock: number = 0,
    toBlock: number | string = 'latest'
  ): Promise<EscrowEvent[]> {
    const contract = this.escrowContracts.get(escrowAddress);
    if (!contract) {
      throw new Error('Escrow not subscribed');
    }

    const provider = await this.web3Service.getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    try {
      const events: EscrowEvent[] = [];
      const filters = this.eventFilters.get(escrowAddress) || [];

      for (const filter of filters) {
        const logs = await contract.queryFilter(filter as any, fromBlock, toBlock);
        
        for (const log of logs) {
          const block = await provider.getBlock(log.blockNumber);
          const eventLog = log as any;
          events.push({
            type: eventLog.event || 'Unknown',
            escrowAddress,
            transactionHash: eventLog.transactionHash,
            blockNumber: eventLog.blockNumber,
            timestamp: (block?.timestamp || 0) * 1000,
            data: eventLog.args
          });
        }
      }

      return events.sort((a, b) => a.blockNumber - b.blockNumber);
    } catch (error) {
      console.error('Error fetching historical events:', error);
      return [];
    }
  }

  async getYieldBalance(escrowAddress: string): Promise<number> {
    const contract = this.escrowContracts.get(escrowAddress);
    if (!contract) {
      throw new Error('Escrow not subscribed');
    }

    try {
      const balance = await contract['getBalance']();
      return Number(ethers.formatUnits(balance, 6));
    } catch (error) {
      console.error('Error fetching yield balance:', error);
      return 0;
    }
  }

  stopAllListeners(): void {
    this.isListening = false;
    
    for (const [escrowAddress] of this.escrowContracts) {
      this.unsubscribeFromEscrow(escrowAddress);
    }
  }
}