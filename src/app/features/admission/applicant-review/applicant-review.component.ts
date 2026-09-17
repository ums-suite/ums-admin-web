import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { AdmissionApplicationsStore } from '../state/admission-applications.store';

/**
 * ADMIN-14: Applicant Review workspace (requirement-spec.md §3.4, §7 key screen) -- a single
 * split-pane screen: application lookup + detail on the left/center, document review and decision
 * actions on the right, so an officer never round-trips between a list and a detail view.
 *
 * **Application/applicant SEARCH is not built** because no such endpoint exists anywhere in
 * `ums-core`'s Admission module (confirmed, see `admission.api.ts`'s own doc) -- lookup is by
 * Application id only. **The detail pane itself is expected to 403 for a staff caller** today
 * (Admission's `OwnershipGuard` has no staff-permission bypass, unlike Library/Hostel's own dual-
 * path guard) -- this is rendered as an explicit, explained state, never a generic error, and the
 * decision actions below (which ARE permission-gated, not ownership-gated) stay usable by
 * application/document id even when the detail fetch itself is blocked.
 */
@Component({
  selector: 'app-applicant-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './applicant-review.component.html',
  styleUrl: './applicant-review.component.scss',
})
export class ApplicantReviewComponent {
  protected readonly store = inject(AdmissionApplicationsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly lookupApplicationId = signal('');
  protected readonly actionApplicationId = signal('');
  protected readonly actionDocumentId = signal('');

  protected loadApplication(): void {
    const id = this.lookupApplicationId().trim();
    if (!id) return;
    this.actionApplicationId.set(id);
    this.store.loadApplication(id);
  }

  protected approveDocument(): void {
    const applicationId = this.actionApplicationId().trim();
    const documentId = this.actionDocumentId().trim();
    if (!applicationId || !documentId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Approve application document',
        description: `Document ${documentId} on application ${applicationId} will be marked approved.`,
        perform: () =>
          this.store
            .approveDocument(applicationId, documentId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'ApplicationDocument',
                  documentId,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: documentId, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) => `Document approved (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not approve document: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) this.reloadIfLoaded(applicationId);
      });
  }

  protected requestResubmission(): void {
    const applicationId = this.actionApplicationId().trim();
    const documentId = this.actionDocumentId().trim();
    if (!applicationId || !documentId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Request document resubmission',
        description: `The applicant will be asked to resubmit document ${documentId}.`,
        reasonLabel: 'Reason for requesting resubmission',
        perform: (reason) =>
          this.store
            .requestDocumentResubmission(applicationId, documentId, reason)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'ApplicationDocument',
                  documentId,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: documentId, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) =>
          `Resubmission requested (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not request resubmission: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) this.reloadIfLoaded(applicationId);
      });
  }

  protected declineApplication(): void {
    const applicationId = this.actionApplicationId().trim();
    if (!applicationId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Decline application',
        description: `Application ${applicationId} will be marked declined.`,
        reasonLabel: 'Reason for declining',
        perform: () =>
          this.store
            .declineApplication(applicationId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(this.auditApi, 'Application', applicationId, sinceIso).pipe(
                  map((auditEntryId) => ({ result: applicationId, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Application declined (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not decline application: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) this.reloadIfLoaded(applicationId);
      });
  }

  private reloadIfLoaded(applicationId: string): void {
    if (this.store.currentApplication()?.id === applicationId) {
      this.store.loadApplication(applicationId);
    }
  }
}
