import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { AuditApiService, toUmsApiError } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsToastService,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { VersionConflictBannerComponent } from '../../../shared/conflict/version-conflict-banner.component';
import { FacultyLeaveRequestsStore } from '../state/faculty-leave-requests.store';
import type { LeaveRequestDto } from '../faculty.types';

/**
 * ADMIN-26: the confirmed real, two-stage LeaveRequest approval chain (Department Head -> Authorized
 * Authority), requirement-spec.md §3.7. Every approve/reject call carries the request's real
 * `version` for optimistic concurrency (design-decisions.md's platform-wide conflict-UX pattern) --
 * a second reviewer acting on the same request after it was already decided gets a `409`, rendered
 * via the shared `VersionConflictBannerComponent` with a reload that re-fetches the whole list, per
 * edge-cases.md's "concurrent grade-batch review" resolution applied to this analogous case (an
 * already-actioned row visibly reflects its real state on the next refresh, never staying
 * actionable indefinitely).
 *
 * A request already `RoutedDirectlyToAuthority` (the requester is themself the Department Head)
 * skips straight to the Authority stage while still `Submitted` -- this screen reflects that real
 * routing rather than always showing a Department Head step first.
 */
@Component({
  selector: 'app-faculty-leave-requests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
    VersionConflictBannerComponent,
  ],
  templateUrl: './faculty-leave-requests.component.html',
  styleUrl: './faculty-leave-requests.component.scss',
})
export class FacultyLeaveRequestsComponent {
  protected readonly store = inject(FacultyLeaveRequestsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(UmsToastService);

  protected readonly facultyMemberId = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('facultyMemberId') ?? '',
  );
  protected readonly conflict = signal(false);

  constructor() {
    const initial = this.facultyMemberId();
    if (initial) this.store.loadByFacultyMember(initial);
  }

  protected loadRequests(): void {
    const id = this.facultyMemberId().trim();
    if (id) {
      this.conflict.set(false);
      this.store.loadByFacultyMember(id);
    }
  }

  protected reloadAfterConflict(): void {
    this.conflict.set(false);
    this.loadRequests();
  }

  /** A request awaiting Department Head review -- only when not routed directly to Authority. */
  protected isAwaitingDepartmentHead(request: LeaveRequestDto): boolean {
    return request.status === 'Submitted' && !request.routedDirectlyToAuthority;
  }

  /** A request awaiting Authority review -- either DeptHeadApproved, or routed directly there. */
  protected isAwaitingAuthority(request: LeaveRequestDto): boolean {
    return (
      request.status === 'DeptHeadApproved' ||
      (request.status === 'Submitted' && request.routedDirectlyToAuthority)
    );
  }

  protected approveByDepartmentHead(request: LeaveRequestDto): void {
    this.runDecision(request, 'Approve (Department Head)', () =>
      this.store.approveByDepartmentHead(request.id, { version: request.version }),
    );
  }

  protected rejectByDepartmentHead(request: LeaveRequestDto): void {
    this.runDecision(request, 'Reject (Department Head)', (reason) =>
      this.store.rejectByDepartmentHead(request.id, { reason, version: request.version }),
    );
  }

  protected approveByAuthority(request: LeaveRequestDto): void {
    this.runDecision(request, 'Approve (Authority)', () =>
      this.store.approveByAuthority(request.id, { version: request.version }),
    );
  }

  protected rejectByAuthority(request: LeaveRequestDto): void {
    this.runDecision(request, 'Reject (Authority)', (reason) =>
      this.store.rejectByAuthority(request.id, { reason, version: request.version }),
    );
  }

  private runDecision(
    request: LeaveRequestDto,
    title: string,
    perform: (reason: string) => Observable<LeaveRequestDto>,
  ): void {
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title,
        description: `Leave request ${request.id} (${request.startDate} to ${request.endDate}) will be ${title.toLowerCase()}d.`,
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return perform(reason).pipe(
            switchMap((updated) =>
              confirmLatestAuditEntry(this.auditApi, 'LeaveRequest', updated.id, sinceIso).pipe(
                switchMap((auditEntryId) => of({ updated, auditEntryId })),
              ),
            ),
            catchError((error: unknown) => {
              if (error instanceof HttpErrorResponse && error.status === 409) {
                this.conflict.set(true);
              } else {
                this.toast.show(`Could not record decision: ${toUmsApiError(error).message}`, {
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
        this.store.replaceRequest(outcome.updated);
        this.toast.show(`${title} recorded (audit entry ${outcome.auditEntryId}).`, {
          variant: 'success',
        });
      });
  }
}
