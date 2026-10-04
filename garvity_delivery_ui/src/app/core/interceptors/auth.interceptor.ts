import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  const isApiRequest = request.url.startsWith(apiBaseUrl) || request.url.startsWith('/api/');
  const isCurrentUserRequest = request.url === environment.currentUserUrl;
  const isAuthPublicRequest = request.url.includes('/api/auth/login') || request.url.includes('/api/auth/register');
  const authenticatedRequest = token && isApiRequest && !isAuthPublicRequest
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isCurrentUserRequest) {
        authService.logout();

        const currentUrl = router.url || '/';
        const currentPath = currentUrl.split('?')[0];

        if (currentPath !== '/login' && !isAuthPublicRequest) {
          void router.navigate(['/login'], {
            queryParams: {
              returnUrl: currentUrl === '/' ? '/tabs/home' : currentUrl,
            },
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
