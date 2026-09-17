import { Injectable, inject } from '@angular/core';
import { IdentityApiService } from '@ums/shared';
import { Observable } from 'rxjs';
import type {
  AssignRoleRequest,
  ChangeUserStatusRequestBody,
  CreateRoleRequest,
  PermissionCatalogEntryDto,
  ProvisionUserRequest,
  RoleDto,
  SessionDto,
  UpdateRolePermissionsRequest,
  UserDto,
  UserListPage,
  UserRoleAssignmentDto,
} from './identity.types';

/**
 * ADMIN-10/ADMIN-11: typed wrapper over `@ums/shared`'s generated `IdentityApiService` (every
 * generated method returns `Observable<any>` -- see `identity.types.ts`'s own doc). Every route
 * below is confirmed real against `ums-core`'s `UMS.Modules.Identity.Api` source.
 */
@Injectable({ providedIn: 'root' })
export class IdentityApi {
  private readonly api = inject(IdentityApiService);

  listUsers(skip: number, take: number): Observable<UserListPage> {
    return this.api.apiV1IdentityUsersGet(skip, take) as Observable<UserListPage>;
  }

  getUser(id: string): Observable<UserDto> {
    return this.api.apiV1IdentityUsersIdGet(id) as Observable<UserDto>;
  }

  /** See `ProvisionUserRequest`'s own doc for the confirmed AllowAnonymous/no-delivery gap. */
  createUser(request: ProvisionUserRequest): Observable<UserDto> {
    return this.api.apiV1IdentityUsersPost(request) as Observable<UserDto>;
  }

  changeUserStatus(id: string, body: ChangeUserStatusRequestBody): Observable<UserDto> {
    return this.api.apiV1IdentityUsersIdStatusPatch(id, body) as Observable<UserDto>;
  }

  /** Self-service only -- confirmed no admin endpoint exists to list/revoke ANOTHER user's sessions. */
  listMySessions(): Observable<readonly SessionDto[]> {
    return this.api.apiV1IdentitySessionsGet() as Observable<readonly SessionDto[]>;
  }

  revokeMySession(sessionId: string): Observable<unknown> {
    return this.api.apiV1IdentitySessionsIdDelete(sessionId);
  }

  listRoles(): Observable<readonly RoleDto[]> {
    return this.api.apiV1IdentityRolesGet() as Observable<readonly RoleDto[]>;
  }

  createRole(request: CreateRoleRequest): Observable<RoleDto> {
    return this.api.apiV1IdentityRolesPost(request) as Observable<RoleDto>;
  }

  updateRolePermissions(id: string, request: UpdateRolePermissionsRequest): Observable<RoleDto> {
    return this.api.apiV1IdentityRolesIdPermissionsPatch(id, request) as Observable<RoleDto>;
  }

  listPermissionCatalog(): Observable<readonly PermissionCatalogEntryDto[]> {
    return this.api.apiV1IdentityPermissionsGet() as Observable<
      readonly PermissionCatalogEntryDto[]
    >;
  }

  /** ScopeGrant assignment -- see `AssignRoleRequest`'s own doc. */
  assignRole(userId: string, request: AssignRoleRequest): Observable<UserRoleAssignmentDto> {
    return this.api.apiV1IdentityUsersUserIdRolesPost(
      userId,
      request,
    ) as Observable<UserRoleAssignmentDto>;
  }

  revokeRoleAssignment(userId: string, assignmentId: string): Observable<unknown> {
    return this.api.apiV1IdentityUsersUserIdRolesAssignmentIdDelete(userId, assignmentId);
  }
}
