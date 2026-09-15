/**
 * ADMIN-5 RBAC-scoped rendering engine -- shared shapes.
 *
 * A `ScopeGrant` binds one Role assignment to an optional organization node
 * (`University`/`Campus`/`Faculty`/`Department`/`Program`, ADR-0006) so the same Role scopes
 * differently per person -- mirrors ums-core's real `UserRoleAssignmentDto` shape
 * (`AssignmentId`, `RoleId`, `RoleName`, `OrganizationNodeId`, `AssignedAt`) confirmed against
 * `Identity.Api`'s `RoleEndpoints.cs`/`UserEndpoints.cs` source. `organizationNodeId: null` means
 * the grant is unscoped (global) for that role, per `AssignRoleRequest`'s own `OrganizationNodeId`
 * being optional.
 */
export interface ScopeGrant {
  readonly assignmentId: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly organizationNodeId: string | null;
}

/**
 * `'server'` -- resolved from a real, successful backend response.
 * `'unavailable'` -- the resolution call failed (network error, or -- expected until the backend
 * gap below is closed -- a 404 because the endpoint doesn't exist yet). Every consumer MUST treat
 * `'unavailable'` as "grant nothing" (fail-closed), never as "grant everything."
 * `'unloaded'` -- {@link PermissionsService.load} has never been called yet (pre-session-start).
 */
export type PermissionSessionSource = 'server' | 'unavailable' | 'unloaded';

export interface PermissionSession {
  readonly grantedPermissions: readonly string[];
  readonly scopeGrants: readonly ScopeGrant[];
  readonly loadedAt: Date | null;
  readonly source: PermissionSessionSource;
}

export const EMPTY_PERMISSION_SESSION: PermissionSession = {
  grantedPermissions: [],
  scopeGrants: [],
  loadedAt: null,
  source: 'unloaded',
};

/**
 * KNOWN, FLAGGED BACKEND GAP (confirmed by reading `ums-core`'s real Identity module source,
 * `UMS.Modules.Identity.Api`): there is no `GET /api/v1/identity/me` or equivalent
 * "my effective permissions + scope grants" endpoint today. The JWT this app receives carries
 * only `sub`/`sid`/`roles` (Role NAMES, no permission strings, no scope grants --
 * `JwtTokenService.IssueAccessToken`); `GET /identity/roles` (which WOULD let a client
 * cross-reference role names to permission sets) is itself gated behind
 * `IdentityPermissions.RoleManage`, which most staff roles (a Librarian, a Hostel Officer) will
 * never hold -- so that cross-reference approach cannot work for the majority of this app's
 * actual users, only for Super-Admin-like accounts.
 *
 * {@link PERMISSIONS_ME_ENDPOINT} is therefore this app's own INTERIM/ASSUMED addition, calling
 * out exactly the endpoint ums-core needs to add: `GET /api/v1/identity/me/permissions` ->
 * `{ permissions: string[]; scopeGrants: ScopeGrantDto[] }`, resolved server-side from the
 * caller's actual role assignments (mirroring how every other permission check in ums-core
 * already works via `IPermissionResolver.CheckAsync`, just exposed for a client to read instead
 * of only being enforced per-call). Flagged prominently in this app's PR as a required backend
 * addition -- until it exists, {@link PermissionsService} degrades to a fail-closed, zero-grant
 * session (see its own class doc) rather than pretending success.
 */
export const PERMISSIONS_ME_ENDPOINT = '/api/v1/identity/me/permissions';
