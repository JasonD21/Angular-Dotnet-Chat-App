import { Routes } from '@angular/router';
import { loginGuard } from './guards/login-guard';

export const routes: Routes = [
  {
    path: 'register',
    canActivate: [loginGuard],
    loadComponent: () => import('./register/register').then((x) => x.Register),
  },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./login/login').then((x) => x.Login),
  },
];
