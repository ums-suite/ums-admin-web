import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsModalComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { OrganizationStore } from '../state/organization.store';

/**
 * ADMIN-12: Designation catalog (requirement-spec.md §3.3) -- a flat, campus-independent list of
 * job/role titles (e.g. "Lecturer", "Registrar") consumed elsewhere by Faculty/HR's Designation
 * assignment (ADMIN-26, out of this ticket's scope). `ums-core`'s Organization module source
 * confirms no deactivate/delete endpoint for a Designation, so this screen is list + create only.
 */
@Component({
  selector: 'app-organization-designations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlicePipe,
    UmsButtonComponent,
    UmsModalComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './organization-designations.component.html',
  styleUrl: './organization-designations.component.scss',
})
export class OrganizationDesignationsComponent implements OnInit {
  protected readonly store = inject(OrganizationStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  protected readonly createModalOpen = signal(false);
  protected readonly createTitle = signal('');

  ngOnInit(): void {
    this.store.loadDesignations();
  }

  protected openCreateModal(): void {
    this.createTitle.set('');
    this.createModalOpen.set(true);
  }

  protected submitCreate(): void {
    const title = this.createTitle().trim();
    if (!title) return;
    this.store
      .createDesignation({ title, translations: null })
      .subscribe(() => this.createModalOpen.set(false));
  }
}
