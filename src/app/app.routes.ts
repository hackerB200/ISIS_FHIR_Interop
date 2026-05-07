import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'soignants', pathMatch: 'full' },
  { path: 'soignants',    loadComponent: () => import('./pages/soignants/soignants.component').then(m => m.SoignantsComponent) },
  { path: 'recrutement',  loadComponent: () => import('./pages/recrutement/recrutement.component').then(m => m.RecrutementComponent) },
  { path: 'recrutement/:id', loadComponent: () => import('./pages/recrutement/recrutement.component').then(m => m.RecrutementComponent) },
  { path: 'rdv',          loadComponent: () => import('./pages/rdv-rpps/rdv-rpps.component').then(m => m.RdvRppsComponent) },
  { path: '**', redirectTo: 'soignants' }
];
