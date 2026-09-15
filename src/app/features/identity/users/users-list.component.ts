import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsModalComponent,
  UmsSelectComponent,
  UmsTabBarComponent,
  type SelectOption,
  type TabBarItem,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { FreshnessLabelComponent } from '../../../shared/freshness/freshness-label.component';
import { IdentityApi } from '../identity.api';
import type { ProvisionUserRequest, RoleDto, UserDto } from '../identity.types';
import { IdentityUsersStore } from '../state/identity-users.store';

const TABS: readonly TabBarItem[] = [{ label: 'Users' }, { label: 'My Sessions' }];

/**
 * ADMIN-10: User account management (create, deactivate/reactivate, ScopeGrant/Role assignment)
 * and this admin's own active-Sessions view. Uses a plain semantic table (not the shared
 * virtualized `UmsDataTableComponent`) deliberately -- that component has no per-row action-slot
 * support today, and this screen's core interactions (Deactivate, Assign Role) are inline row
 * actions; the shared DataTable is reserved for genuinely large, read-oriented lists
 * (requirement-spec.md §2: "datasets exceeding a few thousand rows" -- the Student roster and
 * ADMIN-34's Audit Log, not this screen).
 *
 * FLAGGED GAPS (see `identity.types.ts`/`identity.api.ts` for the full detail):
 * - "Force password reset" is NOT implemented -- no such admin endpoint exists in ums-core today
 *   (only self-service forgot/reset-by-token). No UI stub is shown for it.
 * - "View active Sessions ... individual/everywhere revoke" is scoped to THIS admin's own
 *   sessions (the "My Sessions" tab) -- ums-core has no endpoint for an admin to view/revoke
 *   ANOTHER user's sessions.
 * - Role-assignment history shown per user reflects only assignments made in this browser
 *   session (no endpoint exists to list a user's existing assignments) -- labeled as such.
 */
@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlicePipe,
    UmsTabBarComponent,
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsModalComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
    FreshnessLabelComponent,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  protected readonly store = inject(IdentityUsersStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly tabs = TABS;

  private readonly identityApi = inject(IdentityApi);
  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly selectedTabIndex = signal(0);
  protected readonly createModalOpen = signal(false);
  protected readonly assignRoleModalOpen = signal(false);
  protected readonly assignRoleTargetUser = signal<UserDto | null>(null);
  protected readonly roles = signal<readonly RoleDto[]>([]);

  protected readonly newUser = signal<Partial<ProvisionUserRequest>>({});
  protected readonly assignRoleForm = signal<{ roleId: string; organizationNodeId: string }>({
    roleId: '',
    organizationNodeId: '',
  });

  protected readonly roleOptions = signal<readonly SelectOption[]>([]);

  ngOnInit(): void {
    this.store.loadUsers();
  }

  protected onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    if (index === 1) {
      this.store.loadSessions();
    }
  }

  protected openCreateModal(): void {
    this.newUser.set({});
    this.createModalOpen.set(true);
  }

  protected submitCreateUser(): void {
    const request = this.newUser();
    if (
      !request.username ||
      !request.email ||
      !request.givenName ||
      !request.familyName ||
      !request.password
    ) {
      return;
    }
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Create user account',
        description: `Provision a new account for ${request.username}.`,
        reasonLabel: 'Reason for creating this account',
        perform: () =>
          this.store
            .createUser(request as ProvisionUserRequest)
            .pipe(
              switchMap((user) =>
                confirmLatestAuditEntry(this.auditApi, 'User', user.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: user, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `User "${outcome.result.username}" created (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not create user: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) {
          this.createModalOpen.set(false);
        }
      });
  }

  protected deactivateOrReactivate(user: UserDto): void {
    const nextStatus: 'Active' | 'Suspended' = user.status === 'Active' ? 'Suspended' : 'Active';
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: nextStatus === 'Suspended' ? 'Deactivate user' : 'Reactivate user',
        description: `${user.username} will be marked ${nextStatus}.`,
        perform: () =>
          this.store
            .changeUserStatus(user.id, nextStatus)
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'User', updated.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: updated, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `${outcome.result.username} is now ${outcome.result.status} (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) =>
          `Status change applied, but could not be fully confirmed: ${error.message}`,
      })
      .subscribe();
  }

  protected openAssignRoleModal(user: UserDto): void {
    this.assignRoleTargetUser.set(user);
    this.assignRoleForm.set({ roleId: '', organizationNodeId: '' });
    this.identityApi.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.roleOptions.set(roles.map((r) => ({ value: r.id, label: r.name })));
      },
      error: () => this.roleOptions.set([]),
    });
    this.assignRoleModalOpen.set(true);
  }

  protected submitAssignRole(): void {
    const user = this.assignRoleTargetUser();
    const form = this.assignRoleForm();
    if (!user || !form.roleId) return;

    this.store
      .assignRole(user.id, {
        roleId: form.roleId,
        organizationNodeId: form.organizationNodeId || null,
      })
      .subscribe(() => this.assignRoleModalOpen.set(false));
  }
}
