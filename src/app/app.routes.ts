import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component')
        .then(m => m.RegisterComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent),
    canActivate: [publicGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/components/layout/layout.component')
        .then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent),
      },
      {
        path: 'matches',
        loadComponent: () =>
          import('./features/matches/matches.component')
            .then(m => m.MatchesComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component')
            .then(m => m.ProfileComponent),
      },
      {
        path: 'chat/:matchId',
        loadComponent: () =>
          import('./features/chat/chat.component')
            .then(m => m.ChatComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];