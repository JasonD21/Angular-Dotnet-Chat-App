import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If the user is already authenticated, prevent access to the login/register pages
  if (authService.isAuthenticated()) {
    router.navigate(['/']); // Redirect to home (or dashboard)
    return false;
  }

  return true;
};
