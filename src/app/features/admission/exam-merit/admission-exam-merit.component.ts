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
import { AdmissionExamMeritStore } from '../state/admission-exam-merit.store';

/**
 * ADMIN-19: ExamAttempt monitoring during a live admission-test window + MeritList generation,
 * review, and approval workflow (requirement-spec.md §3.4).
 *
 * **ExamAttempt "monitoring" is honestly an id-based lookup workspace, not a live grid.** `ums-core`
 * has no list/monitor endpoint for attempts under one AdmissionTest/exam window (confirmed --
 * see `admission.types.ts`'s own doc) -- only single-attempt `GET /exams/attempts/{id}`. This
 * mirrors every other confirmed no-list gap already established across this app (Student search,
 * Application search): a Registrar monitoring a live window looks up a specific attempt (e.g. one
 * an invigilator flagged) by id, reviews its integrity flags, and can record a subjective score.
 *
 * **MeritList generation blocks entirely unless every in-scope ExamAttempt is fully evaluated** --
 * a real `409 merit_list.evaluation_incomplete` from ums-core, surfaced here as an explicit error,
 * never silently retried or hidden. "Review" is simply an authorized read before Approve; there is
 * no per-entry flag/reject sub-workflow in the backend to build UI against.
 */
@Component({
  selector: 'app-admission-exam-merit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './admission-exam-merit.component.html',
  styleUrl: './admission-exam-merit.component.scss',
})
export class AdmissionExamMeritComponent {
  protected readonly store = inject(AdmissionExamMeritStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly lookupAttemptId = signal('');
  protected readonly subjectiveScoreValue = signal('');
  protected readonly reviewFlagId = signal('');

  protected readonly lookupCampaignId = signal('');
  protected readonly promoteApplicantId = signal('');
  protected readonly promoteProgramId = signal('');

  protected loadExamAttempt(): void {
    const id = this.lookupAttemptId().trim();
    if (id) this.store.loadExamAttempt(id);
  }

  protected recordSubjectiveScore(): void {
    const attempt = this.store.currentAttempt();
    const scoreText = this.subjectiveScoreValue().trim();
    if (!attempt || !scoreText) return;
    const subjectiveScore = Number(scoreText);
    if (!Number.isFinite(subjectiveScore)) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Record subjective score',
        description: `Attempt ${attempt.id} will be recorded with a subjective score of ${subjectiveScore}.`,
        perform: () =>
          this.store
            .recordSubjectiveScore(attempt.id, { subjectiveScore })
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'ExamAttempt', updated.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: updated, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `Subjective score recorded (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not record subjective score: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) this.subjectiveScoreValue.set('');
      });
  }

  protected reviewIntegrityFlag(outcome: 'Cleared' | 'Confirmed'): void {
    const attempt = this.store.currentAttempt();
    const flagId = this.reviewFlagId().trim();
    if (!attempt || !flagId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: outcome === 'Cleared' ? 'Clear integrity flag' : 'Confirm integrity flag',
        description: `Integrity flag ${flagId} on attempt ${attempt.id} will be marked ${outcome}.`,
        reasonLabel: 'Review notes',
        perform: (reason) =>
          this.store
            .reviewIntegrityFlag(attempt.id, flagId, { outcome, reviewNotes: reason })
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'ExamAttempt', updated.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: updated, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcomeResult) =>
          `Integrity flag ${outcome.toLowerCase()} (audit entry ${outcomeResult.auditEntryId}).`,
        errorMessage: (error) => `Could not review integrity flag: ${error.message}`,
      })
      .subscribe((result) => {
        if (result) this.reviewFlagId.set('');
      });
  }

  protected loadMeritList(): void {
    const campaignId = this.lookupCampaignId().trim();
    if (campaignId) this.store.loadMeritListByCampaign(campaignId);
  }

  protected generateMeritList(): void {
    const campaignId = this.lookupCampaignId().trim();
    if (!campaignId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Generate merit list',
        description: `A merit list will be generated for campaign ${campaignId}. This requires every in-scope exam attempt to already be evaluated.`,
        perform: () =>
          this.store
            .generateMeritList(campaignId)
            .pipe(
              switchMap((meritList) =>
                confirmLatestAuditEntry(this.auditApi, 'MeritList', meritList.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: meritList, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Merit list generated (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not generate merit list: ${error.message}`,
      })
      .subscribe();
  }

  protected approveMeritList(): void {
    const meritList = this.store.currentMeritList();
    if (!meritList) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Approve merit list',
        description: `Merit list ${meritList.id} (campaign ${meritList.campaignId}) will be approved. This is an elevated, admission-outcome-affecting decision.`,
        perform: () =>
          this.store
            .approveMeritList(meritList.id)
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'MeritList', updated.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: updated, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Merit list approved (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not approve merit list: ${error.message}`,
      })
      .subscribe();
  }

  protected promoteWaitlisted(): void {
    const campaignId = this.lookupCampaignId().trim();
    const applicantId = this.promoteApplicantId().trim();
    const programId = this.promoteProgramId().trim();
    if (!campaignId || !applicantId || !programId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Promote waitlisted applicant',
        description: `Applicant ${applicantId} will be promoted from the waitlist for program ${programId}.`,
        perform: () =>
          this.store
            .promoteWaitlisted(campaignId, { applicantId, programId })
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'AdmissionResult',
                  applicantId,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: applicantId, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) => `Applicant promoted (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not promote applicant: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) {
          this.promoteApplicantId.set('');
          this.promoteProgramId.set('');
        }
      });
  }
}
