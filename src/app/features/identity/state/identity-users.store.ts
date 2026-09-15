import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { IdentityApi } from '../identity.api';
import type {
  AssignRoleRequest,
  ProvisionUserRequest,
  SessionDto,
  UserDto,
  UserRoleAssignmentDto,
} from '../identity.types';

interface IdentityUsersState {
  readonly users: readonly UserDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sessions: readonly SessionDto[];
  readonly sessionsLoading: boolean;
  readonly sessionsError: string | null;
  /**
   * FLAGGED GAP: ums-core has no endpoint to list a user's EXISTING role assignments -- only
   * assign (POST, returns the new assignment) and revoke-by-id (DELETE) exist. This map only
   * ever reflects assignments made THIS browser session via {@link assignRole}; it is NOT an
   * authoritative view of the user's real role assignments and is labeled as such in the UI.
   */
  readonly roleAssignmentsByUser: Readonly<Record<string, readonly UserRoleAssignmentDto[]>>;
}

const initialState: IdentityUsersState = {
  users: [],
  totalCount: 0,
  skip: 0,
  take: 20,
  isLoading: false,
  error: null,
  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
  roleAssignmentsByUser: {},
};

/**
 * ADMIN-10/ADMIN-11's real implementation of the identity feature area.
 *
 * Split across two chained `withMethods` calls deliberately: `@ngrx/signals`'s `withMethods`
 * factory only sees methods from features composed BEFORE it, never sibling methods defined in
 * the SAME call -- `createUser`/`changeUserStatus`/`revokeSession` all need to call
 * `loadUsers`/`loadSessions` after their own mutation succeeds, so those two base loaders are
 * their own earlier `withMethods` block.
 */
export const IdentityUsersStore = signalStore(
  { providedIn: 'root' },
  withState<IdentityUsersState>(initialState),
  withMethods((store, api = inject(IdentityApi)) => ({
    loadUsers(skip = store.skip(), take = store.take()): void {
      patchState(store, { isLoading: true, error: null });
      api.listUsers(skip, take).subscribe({
        next: (page) =>
          patchState(store, {
            users: page.items,
            totalCount: page.totalCount,
            skip: page.skip,
            take: page.take,
            isLoading: false,
          }),
        error: (error: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(error).message }),
      });
    },

    loadSessions(): void {
      patchState(store, { sessionsLoading: true, sessionsError: null });
      api.listMySessions().subscribe({
        next: (sessions) => patchState(store, { sessions, sessionsLoading: false }),
        error: (error: unknown) =>
          patchState(store, {
            sessionsLoading: false,
            sessionsError: toUmsApiError(error).message,
          }),
      });
    },
  })),
  withMethods((store, api = inject(IdentityApi)) => ({
    createUser: (request: ProvisionUserRequest) =>
      api.createUser(request).pipe(tap(() => store.loadUsers())),

    changeUserStatus: (id: string, status: 'Active' | 'Suspended') =>
      api.changeUserStatus(id, { status }).pipe(tap(() => store.loadUsers())),

    revokeSession: (sessionId: string) =>
      api.revokeMySession(sessionId).pipe(tap(() => store.loadSessions())),

    assignRole: (userId: string, request: AssignRoleRequest) =>
      api.assignRole(userId, request).pipe(
        tap((assignment) => {
          const current = store.roleAssignmentsByUser()[userId] ?? [];
          patchState(store, {
            roleAssignmentsByUser: {
              ...store.roleAssignmentsByUser(),
              [userId]: [...current, assignment],
            },
          });
        }),
      ),

    revokeRoleAssignment: (userId: string, assignmentId: string) =>
      api.revokeRoleAssignment(userId, assignmentId).pipe(
        tap(() => {
          const current = store.roleAssignmentsByUser()[userId] ?? [];
          patchState(store, {
            roleAssignmentsByUser: {
              ...store.roleAssignmentsByUser(),
              [userId]: current.filter((a) => a.assignmentId !== assignmentId),
            },
          });
        }),
      ),

    assignmentsFor(userId: string): readonly UserRoleAssignmentDto[] {
      return store.roleAssignmentsByUser()[userId] ?? [];
    },
  })),
);
