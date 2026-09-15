import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@ums/shared';
import { APP_CONFIG } from '../../config/app-config';
import {
  EMPTY_PERMISSION_SESSION,
  PERMISSIONS_ME_ENDPOINT,
  type PermissionSession,
  type ScopeGrant,
} from './permission.types';

interface RawScopeGrant {
  readonly assignmentId?: string;
  readonly roleId?: string;
  readonly roleName?: string;
  readonly organizationNodeId?: string | null;
}

interface RawPermissionsMeResponse {
  readonly permissions?: readonly string[];
  readonly scopeGrants?: readonly RawScopeGrant[];
}

/**
 * ADMIN-5: the single shared `core/auth/permissions/` primitive design-decisions.md's
 * "RBAC-Scoped-Rendering Enforcement Pattern" mandates every one of the 15 module feature areas
 * consume identically -- the caller's permission/`ScopeGrant` set is fetched at session start
 * (`load()`, called once from a route guard or app initializer at login) AND re-validated at
 * every module/route entry and immediately before any sensitive-action control renders as
 * available (`revalidate()`, used by {@link import('./permission.guard').permissionGuard} and by
 * feature code immediately before opening a sensitive-action confirmation).
 *
 * **Fail-closed by design.** `PERMISSIONS_ME_ENDPOINT` does not exist in `ums-core` today (see
 * that constant's own doc for the confirmed gap) -- until it's added, every {@link load}/
 * {@link revalidate} call resolves to a `source: 'unavailable'`, zero-permission,
 * zero-scope-grant session rather than throwing or silently granting access. This is the
 * deliberately safe interpretation of requirement-spec.md §8 invariant #1 ("absent, not
 * disabled") under a genuine data-source gap: when this app cannot prove the caller has a
 * permission, it renders as if they don't, never the reverse. Real per-request enforcement stays
 * server-side regardless (ADR-0006) -- this client-side gate is always a UX courtesy layered on
 * top, per design-decisions.md's own "Why."
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private readonly _session = signal<PermissionSession>(EMPTY_PERMISSION_SESSION);
  readonly session = this._session.asReadonly();

  readonly grantedPermissions = computed(() => this._session().grantedPermissions);
  readonly scopeGrants = computed(() => this._session().scopeGrants);
  readonly isDegraded = computed(() => this._session().source === 'unavailable');

  /**
   * Fetches a fresh session from the server, replacing whatever was previously cached, and
   * returns the resolved session. Never errors -- a failed fetch resolves to the fail-closed
   * session described in this class's own doc; callers that need to know whether the fetch
   * actually succeeded should inspect the returned session's `source`.
   */
  load(): Observable<PermissionSession> {
    return this.fetchFromServer().pipe(
      tap((session) => this._session.set(session)),
      catchError(() => {
        const failClosed: PermissionSession = {
          grantedPermissions: [],
          scopeGrants: [],
          loadedAt: new Date(),
          source: 'unavailable',
        };
        this._session.set(failClosed);
        return of(failClosed);
      }),
    );
  }

  /**
   * Re-validates against the server (never trusts the in-memory cache) and reports whether the
   * (possibly now-changed) session grants `required` -- the mechanism behind ADMIN-5's
   * "re-validated ... immediately before any sensitive-action control renders as available" and
   * edge-cases.md's "Super Admin revokes a role mid-flow" resolution (every step transition in an
   * elevated multi-step flow re-checks live, rather than trusting a session-start snapshot).
   */
  revalidate(required: string | readonly string[]): Observable<boolean> {
    return this.load().pipe(
      map((session) =>
        Array.isArray(required)
          ? hasAnyPermission(session.grantedPermissions, required)
          : hasPermission(session.grantedPermissions, required as string),
      ),
    );
  }

  /** Synchronous check against the currently-cached session -- for template-level rendering gates. */
  hasPermission(required: string): boolean {
    return hasPermission(this._session().grantedPermissions, required);
  }

  hasAnyPermission(required: readonly string[]): boolean {
    return hasAnyPermission(this._session().grantedPermissions, required);
  }

  hasAllPermissions(required: readonly string[]): boolean {
    return hasAllPermissions(this._session().grantedPermissions, required);
  }

  private fetchFromServer(): Observable<PermissionSession> {
    const url = `${this.appConfig.apiBaseUrl}${PERMISSIONS_ME_ENDPOINT}`;
    return this.http.get<RawPermissionsMeResponse>(url).pipe(
      map((body) => ({
        grantedPermissions: body.permissions ?? [],
        scopeGrants: (body.scopeGrants ?? []).map(toScopeGrant),
        loadedAt: new Date(),
        source: 'server' as const,
      })),
    );
  }
}

function toScopeGrant(raw: RawScopeGrant): ScopeGrant {
  return {
    assignmentId: raw.assignmentId ?? '',
    roleId: raw.roleId ?? '',
    roleName: raw.roleName ?? '',
    organizationNodeId: raw.organizationNodeId ?? null,
  };
}
