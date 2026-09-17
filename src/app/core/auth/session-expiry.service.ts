import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '@ums/shared';
import { AUTH_ROUTES, RETURN_URL_QUERY_PARAM } from './auth-routes.constants';

/**
 * Redirects to login the instant `@ums/shared`'s `TokenStorageService.sessionExpired$` fires --
 * i.e. a genuine refresh failure (expired/reused/revoked refresh token), never a deliberate
 * logout this app already knows about (ADMIN-4).
 *
 * This is also the concrete mechanism behind requirement-spec.md §8 invariant #6 ("Session state
 * reacts to platform-wide SSO events... takes effect in this app's next action, not only on next
 * full reload"): a "log out everywhere" triggered from another app, or a Super Admin revoking a
 * session, invalidates the refresh token server-side; the *next* API call this app makes (any
 * sensitive action, or the mid-session permission re-validation ADMIN-5 performs) 401s, the
 * resulting refresh attempt fails, and `sessionExpired$` fires here -- no polling, no page
 * reload required.
 *
 * Provided at root and injected once from `App` (purely so its constructor runs at bootstrap) so
 * the subscription is live for the whole app session, not re-created per route.
 */
@Injectable({ providedIn: 'root' })
export class SessionExpiryService {
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);

  constructor() {
    this.tokenStorage.sessionExpired$.subscribe(() => {
      void this.router.navigate([AUTH_ROUTES.login], {
        queryParams: { [RETURN_URL_QUERY_PARAM]: this.router.url },
      });
    });
  }
}
