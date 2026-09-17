import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { AuditApiService, toUmsApiError } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  UmsToastService,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { VersionConflictBannerComponent } from '../../../shared/conflict/version-conflict-banner.component';
import { FacultyMembersStore } from '../state/faculty-members.store';
import type { FacultyVersionConflict } from '../faculty.types';

const EMPLOYMENT_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'FullTime', label: 'Full Time' },
  { value: 'PartTime', label: 'Part Time' },
  { value: 'Adjunct', label: 'Adjunct' },
  { value: 'Visiting', label: 'Visiting' },
];

const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: 'Active', label: 'Active' },
  { value: 'OnLeave', label: 'On Leave' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Separated', label: 'Separated' },
];

/**
 * ADMIN-26: Employee/FacultyMember profile, employment history (flagged absent -- there is no
 * `EmploymentHistory` sub-entity in ums-core, only the member's own current-state fields, see
 * `faculty.types.ts`'s own doc), and Designation assignment via the full employment-details edit
 * (`designationId` is a plain field on this same edit form -- there is no separate assignment
 * endpoint). Employment-details/status-change mutations reuse the shared version-conflict banner
 * pattern (design-decisions.md), mirroring `student-records.component.ts`'s own precedent for why
 * this is driven by hand rather than `AuditedActionService.confirmAndRun`: this screen needs to
 * distinguish the documented `409` conflict shape from every other failure.
 *
 * Attendance oversight has no backend read surface at all (only `POST /academic/attendance` exists,
 * confirmed no GET/list) -- flagged explicitly below rather than building a screen with nothing to
 * show.
 */
@Component({
  selector: 'app-faculty-members',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
    VersionConflictBannerComponent,
  ],
  templateUrl: './faculty-members.component.html',
  styleUrl: './faculty-members.component.scss',
})
export class FacultyMembersComponent {
  protected readonly store = inject(FacultyMembersStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  private readonly auditApi = inject(AuditApiService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(UmsToastService);
  private readonly router = inject(Router);

  protected readonly lookupMemberId = signal('');
  protected readonly lookupDepartmentId = signal('');
  protected readonly conflict = signal<FacultyVersionConflict | null>(null);

  protected readonly editDesignationId = signal('');
  protected readonly editEmploymentType = signal('FullTime');
  protected readonly editIsDepartmentHead = signal(false);
  protected readonly editContactEmail = signal('');
  protected readonly editContactPhone = signal('');

  protected readonly newStatus = signal('Active');

  protected loadMember(): void {
    const id = this.lookupMemberId().trim();
    if (id) {
      this.conflict.set(null);
      this.store.loadMember(id);
    }
  }

  protected loadMembersByDepartment(): void {
    const departmentId = this.lookupDepartmentId().trim();
    if (departmentId) this.store.loadMembersByDepartment(departmentId);
  }

  protected reloadAfterConflict(): void {
    const currentFromConflict = this.conflict()?.currentState;
    if (currentFromConflict) {
      this.lookupMemberId.set(currentFromConflict.id);
      this.store.loadMember(currentFromConflict.id);
    }
    this.conflict.set(null);
  }

  protected goToCourseAssignments(memberId: string): void {
    this.router.navigate(['/faculty/course-assignments'], {
      queryParams: { facultyMemberId: memberId },
    });
  }

  protected goToLeaveRequests(memberId: string): void {
    this.router.navigate(['/faculty/leave-requests'], {
      queryParams: { facultyMemberId: memberId },
    });
  }

  protected submitEmploymentUpdate(): void {
    const member = this.store.currentMember();
    if (!member) return;
    this.conflict.set(null);
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title: 'Update employment details',
        description: `Employment details for ${member.employeeId} will be updated, including Designation assignment.`,
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return this.store
            .updateEmploymentDetails(member.id, {
              departmentId: member.departmentId,
              designationId: this.editDesignationId().trim() || member.designationId,
              employmentType: this.editEmploymentType(),
              isDepartmentHead: this.editIsDepartmentHead(),
              contactEmail: this.editContactEmail().trim() || null,
              contactPhone: this.editContactPhone().trim() || null,
              version: member.version,
            })
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'FacultyMember', updated.id, sinceIso).pipe(
                  switchMap((auditEntryId) => of({ updated, auditEntryId })),
                ),
              ),
              catchError((error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 409) {
                  this.conflict.set(error.error as FacultyVersionConflict);
                } else {
                  this.toast.show(
                    `Could not update employment details: ${toUmsApiError(error).message}`,
                    {
                      variant: 'danger',
                    },
                  );
                }
                return of(null);
              }),
            );
        }),
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        this.toast.show(`Employment details updated (audit entry ${outcome.auditEntryId}).`, {
          variant: 'success',
        });
      });
  }

  protected submitStatusChange(): void {
    const member = this.store.currentMember();
    if (!member) return;
    this.conflict.set(null);
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title: 'Change faculty member status',
        description: `${member.employeeId} will move from ${member.status} to ${this.newStatus()}.`,
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return this.store
            .changeStatus(member.id, { status: this.newStatus(), version: member.version })
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'FacultyMember', updated.id, sinceIso).pipe(
                  switchMap((auditEntryId) => of({ updated, auditEntryId })),
                ),
              ),
              catchError((error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 409) {
                  this.conflict.set(error.error as FacultyVersionConflict);
                } else {
                  this.toast.show(`Could not change status: ${toUmsApiError(error).message}`, {
                    variant: 'danger',
                  });
                }
                return of(null);
              }),
            );
        }),
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        this.toast.show(
          `${outcome.updated.employeeId} is now ${outcome.updated.status} (audit entry ${outcome.auditEntryId}).`,
          { variant: 'success' },
        );
      });
  }
}
