import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AUTH_ROUTES } from '../auth-routes.constants';
import { PermissionsService } from './permissions.service';

/**
 * ADMIN-5: route-level enforcement of design-decisions.md's RBAC-Scoped-Rendering pattern --
 * "re-validated ... at each module/route entry", never a session-start-only permission snapshot
 * (the exact gap edge-cases.md's "permissions change mid-session" case names). Apply to every
 * module's top-level route (`features/identity/**`, `features/organization/**`, etc.) with the
 * permission string(s) that module requires; a caller who fails the check is redirected to
 * {@link AUTH_ROUTES.forbidden} rather than seeing a route that only fails once they try to act
 * inside it.
 *
 * `required` as an array is evaluated as "any of" (`hasAnyPermission`) -- a route reachable by
 * more than one permission (e.g. either a module's own `.read` or a broader `.manage`).
 */
export function permissionGuard(required: string | readonly string[]): CanActivateFn {
  return () => {
    const permissions = inject(PermissionsService);
    const router = inject(Router);

    return permissions
      .revalidate(required)
      .pipe(map((granted) => granted || router.createUrlTree([AUTH_ROUTES.forbidden])));
  };
}
