import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const restaurantOwnerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getCachedUser();

  if (user?.role === 'RESTAURANT_OWNER') {
    return true;
  }

  return router.createUrlTree(['/tabs/home']);
};
