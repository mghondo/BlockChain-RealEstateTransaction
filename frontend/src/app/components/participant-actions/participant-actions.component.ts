import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EscrowPhase } from '../../services/blockchain-events-simple.service';
import { ContractService } from '../../services/contract.service';
import { Web3Service } from '../../services/web3.service';

export interface ParticipantAction {
  id: string;
  label: string;
  description: string;
  buttonText: string;
  buttonClass: string;
  requiredPhase: number[];
  requiredRole: string[];
  enabled: boolean;
  loading: boolean;
  requiresInput?: boolean;
  inputType?: 'text' | 'number' | 'boolean';
  inputLabel?: string;
  inputValue?: any;
}

@Component({
  selector: 'app-participant-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="participant-actions">
      <h3>Available Actions</h3>
      
      <div class="actions-list" *ngIf="availableActions.length > 0; else noActions">
        <div 
          *ngFor="let action of availableActions"
          class="action-item"
          [class.disabled]="!action.enabled">
          
          <div class="action-info">
            <h4>{{ action.label }}</h4>
            <p>{{ action.description }}</p>
          </div>

          <div class="action-input" *ngIf="action.requiresInput && action.enabled">
            <label [for]="action.id + '_input'">{{ action.inputLabel }}</label>
            <input 
              *ngIf="action.inputType !== 'boolean'"
              [id]="action.id + '_input'"
              [type]="action.inputType"
              [(ngModel)]="action.inputValue"
              [placeholder]="getInputPlaceholder(action)"
              class="form-input">
            <select 
              *ngIf="action.inputType === 'boolean'"
              [id]="action.id + '_input'"
              [(ngModel)]="action.inputValue"
              class="form-select">
              <option value="">Select...</option>
              <option [value]="true">Yes / Pass</option>
              <option [value]="false">No / Fail</option>
            </select>
          </div>

          <div class="action-controls">
            <button 
              [class]="'action-btn ' + action.buttonClass"
              [disabled]="!action.enabled || action.loading"
              (click)="executeAction(action)">
              <span *ngIf="action.loading" class="loading-spinner"></span>
              {{ action.loading ? 'Processing...' : action.buttonText }}
            </button>
          </div>
        </div>
      </div>

      <ng-template #noActions>
        <div class="no-actions">
          <div class="no-actions-icon">⏸️</div>
          <p>No actions available at this time</p>
          <small>{{ getNoActionsMessage() }}</small>
        </div>
      </ng-template>

      <div class="emergency-actions" *ngIf="showEmergencyActions()">
        <h4>Emergency Actions</h4>
        <div class="emergency-warning">
          ⚠️ These actions have serious consequences and should only be used in emergencies
        </div>
        
        <button 
          class="action-btn danger"
          [disabled]="isActionLoading('CANCEL_SALE')"
          (click)="executeEmergencyAction('CANCEL_SALE')">
          <span *ngIf="isActionLoading('CANCEL_SALE')" class="loading-spinner"></span>
          {{ isActionLoading('CANCEL_SALE') ? 'Processing...' : 'Initiate Sale Cancellation' }}
        </button>
      </div>

      <div class="action-history" *ngIf="recentActions.length > 0">
        <h4>Recent Actions</h4>
        <div class="history-list">
          <div 
            *ngFor="let historyItem of recentActions"
            class="history-item">
            <span class="history-action">{{ historyItem.action }}</span>
            <span class="history-time">{{ formatTime(historyItem.timestamp) }}</span>
            <span class="history-status" [class]="historyItem.status">
              {{ historyItem.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './participant-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantActionsComponent {
  @Input() escrowAddress = '';
  @Input() userRoles: string[] = [];
  @Input() currentPhase: EscrowPhase | null = null;
  @Input() escrowDetails: any = null;
  @Output() actionExecuted = new EventEmitter<string>();

  availableActions: ParticipantAction[] = [];
  recentActions: { action: string; timestamp: number; status: string }[] = [];

  private readonly actionDefinitions: { [key: string]: Partial<ParticipantAction> } = {
    'INITIALIZE_BUYERS': {
      label: 'Initialize Buyers',
      description: 'Set up buyers and their share percentages for this escrow',
      buttonText: 'Initialize Buyers',
      buttonClass: 'primary',
      requiredPhase: [0],
      requiredRole: ['Seller'],
      requiresInput: false
    },
    'DEPOSIT_EARNEST': {
      label: 'Deposit Earnest Money',
      description: 'Deposit your required earnest money amount in USDC',
      buttonText: 'Deposit Earnest',
      buttonClass: 'primary',
      requiredPhase: [0, 1],
      requiredRole: ['Buyer'],
      requiresInput: true,
      inputType: 'number',
      inputLabel: 'Amount (USDC)'
    },
    'UPDATE_INSPECTION': {
      label: 'Update Inspection Status',
      description: 'Record the result of the property inspection',
      buttonText: 'Update Inspection',
      buttonClass: 'primary',
      requiredPhase: [1],
      requiredRole: ['Inspector'],
      requiresInput: true,
      inputType: 'boolean',
      inputLabel: 'Inspection Result'
    },
    'APPROVE_TRANSACTION': {
      label: 'Approve Transaction',
      description: 'Give your approval to proceed with the transaction',
      buttonText: 'Approve',
      buttonClass: 'success',
      requiredPhase: [1],
      requiredRole: ['Buyer', 'Seller', 'Lender'],
      requiresInput: false
    },
    'DEPOSIT_FULL_PRICE': {
      label: 'Deposit Remaining Funds',
      description: 'Deposit the remaining amount to fully fund the property purchase',
      buttonText: 'Deposit Funds',
      buttonClass: 'primary',
      requiredPhase: [2],
      requiredRole: ['Lender'],
      requiresInput: true,
      inputType: 'number',
      inputLabel: 'Amount (USDC)'
    },
    'INITIATE_FINALIZE': {
      label: 'Initiate Sale Finalization',
      description: 'Start the 24-hour timelock to finalize the property sale',
      buttonText: 'Initiate Finalization',
      buttonClass: 'success',
      requiredPhase: [3],
      requiredRole: ['Buyer', 'Seller', 'Lender'],
      requiresInput: false
    },
    'FINALIZE_SALE': {
      label: 'Finalize Sale',
      description: 'Complete the property sale after the timelock period',
      buttonText: 'Finalize Sale',
      buttonClass: 'success',
      requiredPhase: [3],
      requiredRole: ['Buyer', 'Seller', 'Lender'],
      requiresInput: false
    }
  };

  constructor(
    private contractService: ContractService,
    private web3Service: Web3Service,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateAvailableActions();
  }

  ngOnChanges(): void {
    this.updateAvailableActions();
  }

  private updateAvailableActions(): void {
    this.availableActions = [];

    if (!this.currentPhase || !this.userRoles.length) {
      return;
    }

    for (const [actionId, actionDef] of Object.entries(this.actionDefinitions)) {
      const action: ParticipantAction = {
        id: actionId,
        label: actionDef.label || actionId,
        description: actionDef.description || '',
        buttonText: actionDef.buttonText || 'Execute',
        buttonClass: actionDef.buttonClass || 'primary',
        requiredPhase: actionDef.requiredPhase || [],
        requiredRole: actionDef.requiredRole || [],
        enabled: this.isActionEnabled(actionId, actionDef),
        loading: false,
        requiresInput: actionDef.requiresInput,
        inputType: actionDef.inputType,
        inputLabel: actionDef.inputLabel,
        inputValue: this.getDefaultInputValue(actionDef.inputType)
      };

      if (this.shouldShowAction(action)) {
        this.availableActions.push(action);
      }
    }

    this.cdr.detectChanges();
  }

  private isActionEnabled(actionId: string, actionDef: Partial<ParticipantAction>): boolean {
    if (!this.currentPhase) return false;

    // Check phase requirement
    const phaseMatch = actionDef.requiredPhase?.includes(this.currentPhase.id) ?? false;
    if (!phaseMatch) return false;

    // Check role requirement
    const roleMatch = actionDef.requiredRole?.some(role => this.userRoles.includes(role)) ?? false;
    if (!roleMatch) return false;

    // Special logic for specific actions
    switch (actionId) {
      case 'APPROVE_TRANSACTION':
        return !this.isUserAlreadyApproved();
      case 'DEPOSIT_EARNEST':
        return !this.hasUserDepositedEarnest();
      case 'FINALIZE_SALE':
        return this.isTimelockReady('FINALIZE_SALE');
      case 'INITIATE_FINALIZE':
        return !this.isTimelockActive('FINALIZE_SALE');
      default:
        return true;
    }
  }

  private shouldShowAction(action: ParticipantAction): boolean {
    // Show if enabled, or if it's a key action that should be visible but disabled
    const alwaysShow = ['APPROVE_TRANSACTION', 'DEPOSIT_EARNEST', 'UPDATE_INSPECTION'];
    return action.enabled || alwaysShow.includes(action.id);
  }

  private isUserAlreadyApproved(): boolean {
    // This would check if the current user has already approved
    return false; // Placeholder
  }

  private hasUserDepositedEarnest(): boolean {
    // This would check if the current user has already deposited earnest money
    return false; // Placeholder
  }

  private isTimelockActive(actionType: string): boolean {
    return this.escrowDetails?.timelocks?.[actionType]?.isPending ?? false;
  }

  private isTimelockReady(actionType: string): boolean {
    const timelock = this.escrowDetails?.timelocks?.[actionType];
    return timelock?.isPending && timelock?.timeRemaining <= 0;
  }

  private getDefaultInputValue(inputType?: string): any {
    switch (inputType) {
      case 'number':
        return 0;
      case 'boolean':
        return '';
      default:
        return '';
    }
  }

  async executeAction(action: ParticipantAction): Promise<void> {
    if (!action.enabled || action.loading) return;

    action.loading = true;
    this.cdr.detectChanges();

    try {
      let result: any;

      switch (action.id) {
        case 'INITIALIZE_BUYERS':
          result = await this.contractService.initializeBuyers(this.escrowAddress, [], []);
          break;
        
        case 'DEPOSIT_EARNEST':
          result = await this.contractService.depositEarnest(
            this.escrowAddress, 
            Number(action.inputValue)
          );
          break;
        
        case 'UPDATE_INSPECTION':
          result = await this.contractService.updateInspectionStatus(
            this.escrowAddress, 
            Boolean(action.inputValue)
          );
          break;
        
        case 'APPROVE_TRANSACTION':
          const userRole = this.getUserPrimaryRole();
          result = await this.contractService.approveByRole(this.escrowAddress, userRole);
          break;
        
        case 'DEPOSIT_FULL_PRICE':
          result = await this.contractService.depositFullPrice(
            this.escrowAddress, 
            Number(action.inputValue)
          );
          break;
        
        case 'INITIATE_FINALIZE':
          result = await this.contractService.initiateFinalizeSale(this.escrowAddress);
          break;
        
        case 'FINALIZE_SALE':
          result = await this.contractService.finalizeSale(this.escrowAddress);
          break;
        
        default:
          throw new Error(`Unknown action: ${action.id}`);
      }

      this.addToHistory(action.label, 'success');
      this.actionExecuted.emit(action.id);
      
      // Reset input after successful execution
      if (action.requiresInput) {
        action.inputValue = this.getDefaultInputValue(action.inputType);
      }

    } catch (error: any) {
      console.error(`Error executing action ${action.id}:`, error);
      this.addToHistory(action.label, 'failed');
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Transaction failed';
      alert(`Action failed: ${errorMessage}`);
    } finally {
      action.loading = false;
      this.updateAvailableActions();
    }
  }

  async executeEmergencyAction(actionType: string): Promise<void> {
    if (this.isActionLoading(actionType)) return;

    const confirmed = confirm('Are you sure you want to cancel this sale? This action cannot be undone.');
    if (!confirmed) return;

    this.setActionLoading(actionType, true);

    try {
      await this.contractService.initiateCancelSale(this.escrowAddress);
      this.addToHistory('Cancel Sale', 'success');
      this.actionExecuted.emit('CANCEL_SALE');
    } catch (error: any) {
      console.error('Error cancelling sale:', error);
      this.addToHistory('Cancel Sale', 'failed');
      alert(`Failed to cancel sale: ${error?.message || 'Unknown error'}`);
    } finally {
      this.setActionLoading(actionType, false);
    }
  }

  private getUserPrimaryRole(): string {
    const rolePriority = ['Seller', 'Buyer', 'Inspector', 'Lender'];
    return rolePriority.find(role => this.userRoles.includes(role)) || 'Observer';
  }

  private addToHistory(action: string, status: string): void {
    this.recentActions.unshift({
      action,
      timestamp: Date.now(),
      status
    });
    
    // Keep only the last 5 actions
    this.recentActions = this.recentActions.slice(0, 5);
    this.cdr.detectChanges();
  }

  showEmergencyActions(): boolean {
    return !!(this.currentPhase && this.currentPhase.id < 4 && 
           this.userRoles.some(role => ['Seller', 'Buyer'].includes(role)));
  }

  private actionLoadingStates: { [key: string]: boolean } = {};

  isActionLoading(actionType: string): boolean {
    return this.actionLoadingStates[actionType] || false;
  }

  private setActionLoading(actionType: string, loading: boolean): void {
    this.actionLoadingStates[actionType] = loading;
    this.cdr.detectChanges();
  }

  getInputPlaceholder(action: ParticipantAction): string {
    switch (action.id) {
      case 'DEPOSIT_EARNEST':
        return 'Enter earnest amount in USDC';
      case 'DEPOSIT_FULL_PRICE':
        return 'Enter remaining amount in USDC';
      default:
        return '';
    }
  }

  getNoActionsMessage(): string {
    if (!this.currentPhase) {
      return 'Loading transaction status...';
    }

    if (this.currentPhase.id === 4) {
      return 'Transaction completed successfully';
    }

    if (this.currentPhase.id === 5) {
      return 'Transaction was cancelled';
    }

    if (this.userRoles.includes('Observer')) {
      return 'You are observing this transaction';
    }

    return 'Waiting for other participants to complete their actions';
  }

  formatTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}