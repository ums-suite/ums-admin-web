import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsModalComponent,
  UmsTextareaComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import type { PermissionCatalogEntryDto, RoleDto } from '../identity.types';
import { IdentityRolesStore } from '../state/identity-roles.store';

interface PermissionGroup {
  readonly owningModule: string;
  readonly entries: readonly PermissionCatalogEntryDto[];
}

/**
 * ADMIN-11: Role & Permission-bundle administration -- "compose a Role from Permission strings,
 * never edit a hard-coded list" (requirement-spec.md §3.2). Every checkbox rendered here comes
 * from the live `GET /api/v1/identity/permissions` catalog (`IdentityRolesStore.permissionCatalog`),
 * grouped by `owningModule`, never a literal array baked into this component.
 *
 * ScopeGrant assignment (binding a Role to an org node) is ADMIN-10's Users screen -- confirmed
 * real as the optional `organizationNodeId` on `AssignRoleRequest`, a per-USER action, not a
 * per-Role one, so it lives there rather than being duplicated here.
 *
 * FLAGGED GAPS:
 * - `RequiresMfa` is shown read-only per role (from the real `RoleDto`) but cannot be SET through
 *   this UI -- `@ums/shared`'s generated `CreateRoleRequest`/`UpdateRolePermissionsRequest` types
 *   are missing that field even though ums-core's real DTOs have it (see `identity.types.ts`).
 * - Per-user MFA-ENROLLMENT status has no standalone query endpoint in ums-core (confirmed --
 *   only inferable transiently during a login attempt via `LoginRequiresMfa`/`MfaEnrolled`); this
 *   screen therefore only surfaces MFA POLICY (which roles require it), never a per-user
 *   enrollment table, and says so explicitly rather than showing fabricated data.
 * - No native checkbox component exists in `@ums/design-system` today -- this screen uses plain
 *   `<input type="checkbox">` elements, token-styled, rather than inventing a one-off library
 *   component here.
 */
@Component({
  selector: 'app-roles-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsModalComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsTextareaComponent,
    HasPermissionDirective,
  ],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.scss',
})
export class RolesListComponent implements OnInit {
  protected readonly store = inject(IdentityRolesStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  protected readonly createModalOpen = signal(false);
  protected readonly editModalOpen = signal(false);
  protected readonly editingRole = signal<RoleDto | null>(null);

  protected readonly newRoleName = signal('');
  protected readonly newRoleDescription = signal('');
  protected readonly selectedPermissions = signal<ReadonlySet<string>>(new Set());

  protected readonly permissionGroups = computed<readonly PermissionGroup[]>(() => {
    const byModule = new Map<string, PermissionCatalogEntryDto[]>();
    for (const entry of this.store.permissionCatalog()) {
      const list = byModule.get(entry.owningModule) ?? [];
      list.push(entry);
      byModule.set(entry.owningModule, list);
    }
    return Array.from(byModule.entries()).map(([owningModule, entries]) => ({
      owningModule,
      entries,
    }));
  });

  ngOnInit(): void {
    this.store.loadRoles();
    this.store.loadPermissionCatalog();
  }

  protected openCreateModal(): void {
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.selectedPermissions.set(new Set());
    this.createModalOpen.set(true);
  }

  protected openEditModal(role: RoleDto): void {
    this.editingRole.set(role);
    this.selectedPermissions.set(new Set(role.permissions));
    this.editModalOpen.set(true);
  }

  protected togglePermission(key: string): void {
    const current = new Set(this.selectedPermissions());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedPermissions.set(current);
  }

  protected submitCreateRole(): void {
    const name = this.newRoleName().trim();
    if (!name) return;
    this.store
      .createRole({
        name,
        description: this.newRoleDescription().trim() || null,
        permissions: Array.from(this.selectedPermissions()),
      })
      .subscribe(() => this.createModalOpen.set(false));
  }

  protected submitEditPermissions(): void {
    const role = this.editingRole();
    if (!role) return;
    this.store
      .updateRolePermissions(role.id, { permissions: Array.from(this.selectedPermissions()) })
      .subscribe(() => this.editModalOpen.set(false));
  }
}
