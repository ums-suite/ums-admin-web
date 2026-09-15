import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { IdentityApi } from '../identity.api';
import type {
  CreateRoleRequest,
  PermissionCatalogEntryDto,
  RoleDto,
  UpdateRolePermissionsRequest,
} from '../identity.types';

interface IdentityRolesState {
  readonly roles: readonly RoleDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly permissionCatalog: readonly PermissionCatalogEntryDto[];
  readonly catalogLoading: boolean;
  readonly catalogError: string | null;
}

const initialState: IdentityRolesState = {
  roles: [],
  isLoading: false,
  error: null,
  permissionCatalog: [],
  catalogLoading: false,
  catalogError: null,
};

/**
 * ADMIN-11: Role & Permission-bundle administration -- "compose a Role from Permission strings,
 * never edit a hard-coded list" (requirement-spec.md §3.2) is implemented directly: the
 * permission catalog comes from the real `GET /api/v1/identity/permissions` endpoint, and a
 * Role's `permissions` field is always a subset of that live catalog, never a client-side literal
 * list.
 */
export const IdentityRolesStore = signalStore(
  { providedIn: 'root' },
  withState<IdentityRolesState>(initialState),
  withMethods((store, api = inject(IdentityApi)) => ({
    loadRoles(): void {
      patchState(store, { isLoading: true, error: null });
      api.listRoles().subscribe({
        next: (roles) => patchState(store, { roles, isLoading: false }),
        error: (error: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(error).message }),
      });
    },

    loadPermissionCatalog(): void {
      patchState(store, { catalogLoading: true, catalogError: null });
      api.listPermissionCatalog().subscribe({
        next: (permissionCatalog) =>
          patchState(store, { permissionCatalog, catalogLoading: false }),
        error: (error: unknown) =>
          patchState(store, { catalogLoading: false, catalogError: toUmsApiError(error).message }),
      });
    },
  })),
  withMethods((store, api = inject(IdentityApi)) => ({
    createRole: (request: CreateRoleRequest) =>
      api.createRole(request).pipe(tap(() => store.loadRoles())),

    updateRolePermissions: (id: string, request: UpdateRolePermissionsRequest) =>
      api.updateRolePermissions(id, request).pipe(tap(() => store.loadRoles())),
  })),
);
