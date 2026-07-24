import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [{ path: '', component: AppShellComponent, children: [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPageComponent) },
  { path: 'scanner', loadComponent: () => import('./features/scanner/scanner.page').then((m) => m.ScannerPageComponent) },
  { path: 'indicator-validation', loadComponent: () => import('./features/indicator-validation/indicator-validation.page').then((m) => m.IndicatorValidationPageComponent) },
  { path: 'watchlist', loadComponent: () => import('./features/watchlist/watchlist.page').then((m) => m.WatchlistPageComponent) },
  { path: 'journal', loadComponent: () => import('./features/journal/journal.page').then((m) => m.JournalPageComponent) },
  { path: 'settings', loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPageComponent) }
] }, { path: '**', redirectTo: '' }];
