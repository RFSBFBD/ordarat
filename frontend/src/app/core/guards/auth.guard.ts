import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

/**
 * Requires a signed-in user. Redirects to the login page and preserves
 * the intended destination in `returnUrl`.
 */
export const authGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Requires a signed-in user whose SERVER-SIDE role matches one of the
 * allowed roles. Used to isolate admin / merchant / branch dashboards.
 */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return async (_route, state): Promise<boolean | UrlTree> => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.whenReady();

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const role = auth.role();
    if (role && roles.includes(role)) {
      return true;
    }

    // Signed in but the role does not match (or the API could not confirm it).
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url, denied: '1' },
    });
  };
}
