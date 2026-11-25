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

/**
 * Keeps half-finished accounts on the way to being finished: an unverified
 * email goes to verification, and a signed-in customer who has not
 * completed the mandatory first-time form goes to it. Guests, staff and
 * pending applicants pass.
 */
export const profileGateGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (!auth.isLoggedIn()) {
    return true;
  }
  if (auth.needsEmailVerification()) {
    return router.createUrlTree(['/auth/verify-email']);
  }
  const profile = auth.profile();
  if (
    profile &&
    profile.role === 'customer' &&
    profile.profile_complete !== true &&
    profile.merchant_application_status !== 'pending'
  ) {
    return router.createUrlTree(['/auth/welcome']);
  }
  return true;
};
