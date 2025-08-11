import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { WalletService, WalletState } from '../../services/wallet.service';
import { NetworkService, Network } from '../../services/network.service';
import { Web3Service, TokenBalance } from '../../services/web3.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  walletState: WalletState | null = null;
  currentNetwork: Network | null = null;
  supportedNetworks: Network[] = [];
  tokenBalances: TokenBalance[] = [];
  
  isConnecting = false;
  showNetworkMenu = false;

  constructor(
    private walletService: WalletService,
    private networkService: NetworkService,
    private web3Service: Web3Service
  ) {}

  ngOnInit(): void {
    this.subscribeToServices();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToServices(): void {
    // Subscribe to wallet state
    this.walletService.walletState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.walletState = state;
        this.isConnecting = state.isLoading;
      });

    // Subscribe to network changes
    this.networkService.currentNetwork$
      .pipe(takeUntil(this.destroy$))
      .subscribe(network => {
        this.currentNetwork = network;
      });

    // Subscribe to supported networks
    this.networkService.supportedNetworks$
      .pipe(takeUntil(this.destroy$))
      .subscribe(networks => {
        this.supportedNetworks = networks;
      });

    // Subscribe to token balances
    this.web3Service.tokenBalances$
      .pipe(takeUntil(this.destroy$))
      .subscribe(balances => {
        this.tokenBalances = balances;
      });
  }

  async connectWallet(): Promise<void> {
    if (this.isConnecting) return;

    try {
      await this.walletService.connect();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      // Error handling could be enhanced with toast notifications
    }
  }

  disconnectWallet(): void {
    this.walletService.disconnect();
  }

  async switchNetwork(chainId: number): Promise<void> {
    if (!this.walletState?.isConnected || this.isConnecting) return;

    try {
      await this.networkService.switchNetwork(chainId);
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      // Error handling could be enhanced with toast notifications
    }
  }

  get isWalletConnected(): boolean {
    return this.walletState?.isConnected || false;
  }

  get formattedAddress(): string {
    if (!this.walletState?.account) return '';
    return this.walletService.formatAddress(this.walletState.account);
  }

  get formattedBalance(): string {
    if (!this.walletState?.balance) return '0.00';
    const balance = parseFloat(this.walletState.balance);
    return balance.toFixed(4);
  }

  get currentNetworkSymbol(): string {
    return this.currentNetwork?.symbol || 'ETH';
  }

  get currentNetworkName(): string {
    return this.currentNetwork?.displayName || 'Unknown Network';
  }

  get isNetworkSupported(): boolean {
    if (!this.walletState?.chainId) return false;
    return this.networkService.isNetworkSupported(this.walletState.chainId);
  }

  get networkStatusClass(): string {
    if (!this.isWalletConnected) return 'disconnected';
    return this.isNetworkSupported ? 'supported' : 'unsupported';
  }

  get usdcBalance(): string {
    const usdcToken = this.tokenBalances.find(token => token.symbol === 'USDC');
    return usdcToken ? usdcToken.formatted : '0.00';
  }

  openNetworkExplorer(): void {
    if (!this.walletState?.account || !this.currentNetwork) return;
    
    const explorerUrl = this.networkService.getNetworkExplorerUrl(undefined, this.walletState.account);
    if (explorerUrl) {
      window.open(explorerUrl, '_blank');
    }
  }

  copyAddress(): void {
    if (!this.walletState?.account) return;
    
    navigator.clipboard.writeText(this.walletState.account).then(() => {
      // Could show a toast notification here
      console.log('Address copied to clipboard');
    });
  }

  get mainnetNetworks(): Network[] {
    return this.supportedNetworks.filter(network => !network.isTestnet);
  }

  get testnetNetworks(): Network[] {
    return this.supportedNetworks.filter(network => network.isTestnet);
  }

  get mainnetNetworkNames(): string {
    return this.mainnetNetworks.map(n => n.displayName).join(', ');
  }

  // Helper method for debugging - can be removed in production
  get walletStateForDebug(): any {
    return {
      isConnected: this.walletState?.isConnected,
      account: this.walletState?.account,
      chainId: this.walletState?.chainId,
      balance: this.walletState?.balance,
      isLoading: this.walletState?.isLoading,
      error: this.walletState?.error
    };
  }
}
