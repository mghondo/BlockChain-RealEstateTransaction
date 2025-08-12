import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/properties',
    pathMatch: 'full'
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
    loadComponent: () => import('./components/property-list/property-list.component')
      .then(m => m.PropertyListComponent) // Reuse property list with different mode
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
    path: '**',
    redirectTo: '/properties'
  }
];
