import { Routes } from '@angular/router';
import { loginGuard } from './guards/login-guard';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'register',
    canActivate: [loginGuard],
    loadComponent: () => import('./components/register/register').then((x) => x.Register),
  },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./components/login/login').then((x) => x.Login),
  },
  {
    path: 'chat',
    //canActivate: [authGuard],
    loadComponent: () => import('./components/chat/chat').then((x) => x.Chat),
  },
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  { path: '**', redirectTo: 'chat' },
];
