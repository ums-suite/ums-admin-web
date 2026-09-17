import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { AcademicGradingStore } from '../state/academic-grading.store';
import type { AssessmentScoreDto } from '../academic.types';

/**
 * ADMIN-22: the Grade-correction workflow -- requirement-spec.md §8 invariant #3's single most
 * important instance ("Grade and result corrections never use a raw edit control"). This screen's
 * ONLY control for changing a published Grade is `POST /grades/{id}/correct`
 * (`CorrectGradeRequest`), which mandates a reason server-side and is additionally gated here by
 * the shared confirmation-with-reason dialog -- there is no separate raw-edit form anywhere in this
 * app, and per `AcademicGradingStore`'s own doc, no `GET` endpoint exists to build one against even
 * if it were tempting to.
 *
 * A correction re-enters the batch's `ResultPublication` at `Verified` server-side -- it will need
 * a fresh Approve + Publish to become visible again. That re-approval chain is
 * `AcademicResultPublicationComponent`'s own screen (ADMIN-23), linked from here rather than
 * duplicated, since Grade has no independent approval status of its own (see `academic.types.ts`).
 *
 * **The "Department Head on leave" delegate/escalation edge case** (edge-cases.md) has no backend
 * mechanism to build against: Faculty's own `LeaveRequest` approval chain has no delegate/escalation
 * concept (confirmed by direct source read), and Academic's `academic.grade.correct`/
 * `academic.result.approve` permissions are plain permission strings with no per-request delegate
 * routing. The honest interim path, surfaced in this screen's own template, is Identity's Role &
 * Permission-bundle administration (ADMIN-11) -- temporarily granting the relevant permission to a
 * covering staff member's Role/ScopeGrant, then revoking it once the absence ends.
 */
@Component({
  selector: 'app-academic-grading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent, HasPermissionDirective],
  templateUrl: './academic-grading.component.html',
  styleUrl: './academic-grading.component.scss',
})
export class AcademicGradingComponent {
  protected readonly store = inject(AcademicGradingStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);
  private readonly router = inject(Router);

  protected readonly gradeId = signal('');
  protected readonly draftScores = signal<readonly AssessmentScoreDto[]>([]);
  protected readonly assessmentIdInput = signal('');
  protected readonly scoreInput = signal('');

  protected addDraftScore(): void {
    const assessmentId = this.assessmentIdInput().trim();
    const score = Number(this.scoreInput());
    if (!assessmentId || !Number.isFinite(score)) return;
    this.draftScores.update((scores) => [...scores, { assessmentId, score }]);
    this.assessmentIdInput.set('');
    this.scoreInput.set('');
  }

  protected removeDraftScore(index: number): void {
    this.draftScores.update((scores) => scores.filter((_, i) => i !== index));
  }

  protected submitCorrection(): void {
    const id = this.gradeId().trim();
    const scores = this.draftScores();
    if (!id || scores.length === 0) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Correct grade',
        description: `Grade ${id} will be corrected with ${scores.length} assessment score(s). This is never a raw edit -- a reason is required and this re-enters the batch for re-approval.`,
        reasonLabel: 'Reason for correction (mandatory)',
        perform: (reason) =>
          this.store
            .correctGrade(id, { scores, reason })
            .pipe(
              switchMap((grade) =>
                confirmLatestAuditEntry(this.auditApi, 'Grade', grade.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: grade, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `Grade corrected (audit entry ${outcome.auditEntryId}). Its batch now needs re-approval and re-publishing.`,
        errorMessage: (error) => `Could not correct grade: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) {
          this.draftScores.set([]);
        }
      });
  }

  protected goToResultPublication(): void {
    this.router.navigate(['/academic/result-publication']);
  }

  protected goToRoleManagement(): void {
    this.router.navigate(['/identity/roles']);
  }
}
