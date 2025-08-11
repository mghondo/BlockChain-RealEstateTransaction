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
    path: '**',
    redirectTo: '/properties'
  }
];
