import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
import { STUDENT_LEGAL_TRANSITIONS, type StudentStatusConflict } from '../student.types';
import { StudentRecordsStore } from '../state/student-records.store';

/**
 * ADMIN-15: Student search/CRUD (requirement-spec.md §3.6). No search/list or admin-create
 * endpoint exists in `ums-core`'s Student module (see `student.types.ts`'s own doc) -- this screen
 * is lookup-by-id plus the one real write path that DOES exist: the status lifecycle transition
 * (`POST /students/{id}/status`), which also covers "record transfer between programs/departments"
 * via the confirmed real `Transferred` terminal status (there is no separate Department/Program
 * reassignment endpoint to build against).
 *
 * Status changes reuse the shared `ConfirmationService` (reason prompt) and `UmsToastService`
 * (named, audit-linked success toast) -- the same two primitives `AuditedActionService` itself
 * composes -- but drive the mutation manually rather than via `confirmAndRun`, so this component
 * can specifically detect the documented `409` version-conflict shape (`StudentStatusConflict`,
 * not a generic `UmsApiError`) and render the shared `VersionConflictBannerComponent`
 * (design-decisions.md's platform-wide "reject-and-reload" pattern) instead of a generic error
 * toast. See {@link submitStatusChange}'s own doc for why.
 */
@Component({
  selector: 'app-student-records',
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
  templateUrl: './student-records.component.html',
  styleUrl: './student-records.component.scss',
})
export class StudentRecordsComponent {
  protected readonly store = inject(StudentRecordsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(UmsToastService);
  private readonly router = inject(Router);

  protected readonly lookupStudentId = signal('');
  protected readonly newStatus = signal('');
  protected readonly conflict = signal<StudentStatusConflict | null>(null);

  protected readonly statusOptions = computed<readonly SelectOption[]>(() => {
    const current = this.store.currentStudent();
    if (!current) return [];
    return (STUDENT_LEGAL_TRANSITIONS[current.status] ?? []).map((status) => ({
      value: status,
      label: status === 'Transferred' ? 'Transferred (record transfer)' : status,
    }));
  });

  protected loadStudent(): void {
    const id = this.lookupStudentId().trim();
    if (!id) return;
    this.conflict.set(null);
    this.newStatus.set('');
    this.store.loadStudent(id);
  }

  protected reloadAfterConflict(): void {
    const currentFromConflict = this.conflict()?.currentState;
    if (currentFromConflict) {
      this.lookupStudentId.set(currentFromConflict.id);
      this.store.loadStudent(currentFromConflict.id);
    }
    this.conflict.set(null);
    this.newStatus.set('');
  }

  protected goToBulkImport(): void {
    this.router.navigate(['/student/bulk-import']);
  }

  /**
   * Deliberately NOT built on the shared `AuditedActionService.confirmAndRun` -- that helper
   * swallows every failure into a generic error toast (by design, so its Observable never
   * errors), which would make it impossible to distinguish the documented `409`
   * {@link StudentStatusConflict} shape from any other failure. This replicates
   * `confirmAndRun`'s own "reason -> mutate -> confirm the audit write -> named success toast"
   * sequence by hand, using the same two primitives it composes ({@link ConfirmationService},
   * {@link UmsToastService}), specifically so the `409` path can render the shared
   * `VersionConflictBannerComponent` instead.
   */
  protected submitStatusChange(): void {
    const student = this.store.currentStudent();
    const status = this.newStatus();
    if (!student || !status) return;
    this.conflict.set(null);
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title: status === 'Transferred' ? 'Transfer student record' : 'Change academic status',
        description: `${student.givenName} ${student.familyName} will move from ${student.status} to ${status}.`,
        reasonLabel: 'Reason (recorded to StudentStatusHistory)',
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return this.store
            .changeStatus(student.id, { status, reason, version: student.version })
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'Student', updated.id, sinceIso).pipe(
                  switchMap((auditEntryId) => of({ updated, auditEntryId })),
                ),
              ),
              catchError((error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 409) {
                  this.conflict.set(error.error as StudentStatusConflict);
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
        this.newStatus.set('');
        this.toast.show(
          `${outcome.updated.givenName} ${outcome.updated.familyName} is now ${outcome.updated.status} (audit entry ${outcome.auditEntryId}).`,
          { variant: 'success' },
        );
      });
  }
}
