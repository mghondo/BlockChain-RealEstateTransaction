import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./components/landing-page/landing-page.component')
      .then(m => m.LandingPageComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/escrow-dashboard/escrow-dashboard.component')
      .then(m => m.EscrowDashboardComponent)
  },
  {
    path: 'escrow/:address',
    loadComponent: () => import('./components/escrow-detail/escrow-detail.component')
      .then(m => m.EscrowDetailComponent)
  },
  {
    path: 'escrow/:address/actions',
    loadComponent: () => import('./components/escrow-detail/escrow-detail.component')
      .then(m => m.EscrowDetailComponent) // Same component, could add query param for focus on actions
  },
  {
    path: 'properties',
    loadComponent: () => import('./components/property-list/property-list.component')
      .then(m => m.PropertyListComponent)
  },
  {
    path: 'property/:address',
    loadComponent: () => import('./components/property-detail/property-detail.component')
      .then(m => m.PropertyDetailComponent)
  },
  {
    path: 'invest/:address',
    loadComponent: () => import('./components/investment-wizard/investment-wizard-page.component')
      .then(m => m.InvestmentWizardPageComponent)
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./components/portfolio-dashboard/portfolio-dashboard.component')
      .then(m => m.PortfolioDashboardComponent)
  },
  {
    path: 'transactions',
    loadComponent: () => import('./components/transaction-tracker/transaction-tracker.component')
      .then(m => m.TransactionTrackerComponent)
  },
  {
    path: 'bridge',
    loadComponent: () => import('./components/crosschain-bridge/crosschain-bridge.component')
      .then(m => m.CrossChainBridgeComponent)
  },
  {
    path: 'kyc',
    loadComponent: () => import('./components/kyc-status/kyc-status.component')
      .then(m => m.KYCStatusComponent)
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];
