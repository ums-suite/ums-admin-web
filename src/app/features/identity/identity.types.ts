/**
 * ADMIN-10/ADMIN-11: hand-typed DTOs against `ums-core`'s real Identity module source
 * (`UMS.Modules.Identity.Api`) -- `@ums/shared`'s generated `IdentityApiService` covers these
 * routes but every method's RESPONSE type is `Observable<any>` (no `.Produces<T>()` in
 * ums-core's OpenAPI doc), so the response DTOs below are hand-typed and this feature's own thin
 * wrapper (`identity.api.ts`) is the one place that risk is contained, matching `AuthService`'s
 * own established pattern.
 *
 * REQUEST body types (`ProvisionUserRequest`, `CreateRoleRequest`, `UpdateRolePermissionsRequest`,
 * `AssignRoleRequest`) are re-exported from `@ums/shared` rather than redefined here -- the
 * generated client DOES type its request bodies, and `IdentityApiService`'s own method
 * signatures require exactly those types (a locally-redefined shape with e.g. optional `?`
 * fields instead of `| null` fails to type-check against the generated method).
 *
 * FLAGGED GAP: `@ums/shared`'s generated `CreateRoleRequest`/`UpdateRolePermissionsRequest`
 * types have no `requiresMfa` field, even though ums-core's real C# records
 * (`CreateRoleRequest(string Name, string? Description, IReadOnlyCollection<string> Permissions,
 * bool RequiresMfa = false)`) do -- the OpenAPI schema this client was generated from appears to
 * have dropped the default-valued property. This app's Role forms (ADMIN-11) therefore cannot
 * set `RequiresMfa` through the typed client today; flagged for a `client:generate` re-run once
 * the contract is regenerated, not silently worked around with an untyped `as any` request body.
 */
export type {
  AssignRoleRequest,
  CreateRoleRequest,
  ProvisionUserRequest,
  UpdateRolePermissionsRequest,
} from '@ums/shared';

export interface UserDto {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly mobile: string | null;
  readonly universityId: string | null;
  readonly status: 'Active' | 'Suspended' | string;
  readonly createdAt: string;
}

export interface UserListPage {
  readonly items: readonly UserDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}

/** The confirmed real deactivate/reactivate mechanism -- `Status` is `"Active"` or `"Suspended"`. */
export interface ChangeUserStatusRequestBody {
  readonly status: 'Active' | 'Suspended';
}

export interface SessionDto {
  readonly id: string;
  readonly userAgent: string | null;
  readonly createdFromIp: string | null;
  readonly createdAt: string;
  readonly lastUsedAt: string;
  readonly status: string;
  readonly isCurrent: boolean;
}

export interface RoleDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly permissions: readonly string[];
  readonly requiresMfa: boolean;
  readonly createdAt: string;
}

export interface PermissionCatalogEntryDto {
  readonly key: string;
  readonly owningModule: string;
  readonly description: string;
  readonly registeredAt: string;
}

export interface UserRoleAssignmentDto {
  readonly assignmentId: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly organizationNodeId: string | null;
  readonly assignedAt: string;
}
