import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, map, of, switchMap } from 'rxjs';
import { AuditApiService, toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  UmsStepperComponent,
  UmsToastService,
  type SelectOption,
  type StepperStep,
} from '@ums/design-system';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { PermissionRevokedBannerComponent } from '../../../shared/result-publication/permission-revoked-banner.component';
import { VersionConflictBannerComponent } from '../../../shared/conflict/version-conflict-banner.component';
import { ResultPublicationWizard } from '../../../shared/result-publication/result-publication-wizard';
import type { ResultPublicationStepDefinition } from '../../../shared/result-publication/result-publication-wizard.types';
import { AcademicResultPublicationStore } from '../state/academic-result-publication.store';
import { AcademicApi } from '../academic.api';
import type { ResultPublicationDto } from '../academic.types';

interface WizardContext {
  readonly courseOfferingId: string;
  readonly result: ResultPublicationDto | null;
}

const START_STAGE_OPTIONS: readonly SelectOption[] = [
  { value: '0', label: 'Lock (Department Head review)' },
  { value: '1', label: 'Approve (Registrar)' },
  { value: '2', label: 'Publish' },
  { value: '3', label: 'Archive' },
];

/**
 * ADMIN-23: Academic ResultPublication approval/publish control, mirroring ADMIN-20's Admission
 * Result Publication pattern -- the same shared {@link ResultPublicationWizard}, live per-step
 * re-authorization, and explicit "permission revoked" terminal state on any `403`.
 *
 * **Cannot bootstrap from a real current-status GET, unlike ADMIN-20.** `ums-core`'s
 * `ResultPublicationEndpoints.cs` has no `GET` route at all for this entity (confirmed by direct
 * source read) -- every one of its five routes is a `POST` transition that happens to return the
 * DTO. This screen therefore asks the admin to pick a starting stage themselves, exactly like every
 * other confirmed no-read-endpoint gap in this app asks for an id from "another channel" (here, the
 * Audit Log, which already records every prior transition against this CourseOffering). Getting the
 * starting stage wrong is not unsafe -- the wrong stage simply 409s with the batch's real current
 * status named in the error, rendered below via the shared {@link VersionConflictBannerComponent}
 * (design-decisions.md's platform-wide conflict-UX pattern), reused here for the concurrent-
 * reviewer-race edge case (`ResultPublicationService`'s own doc: "whichever commits first wins; the
 * loser gets an explicit, named rejection identifying the current authoritative state").
 *
 * The `Reject` alternative to `Lock` (sends the batch back to Faculty, staying `Calculated`) is a
 * standalone action outside the linear wizard, mirroring ADMIN-20's `reenterForCorrection`.
 */
@Component({
  selector: 'app-academic-result-publication',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    UmsStepperComponent,
    HasPermissionDirective,
    PermissionRevokedBannerComponent,
    VersionConflictBannerComponent,
  ],
  templateUrl: './academic-result-publication.component.html',
  styleUrl: './academic-result-publication.component.scss',
})
export class AcademicResultPublicationComponent {
  protected readonly store = inject(AcademicResultPublicationStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly startStageOptions = START_STAGE_OPTIONS;

  private readonly api = inject(AcademicApi);
  private readonly permissions = inject(PermissionsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auditApi = inject(AuditApiService);
  private readonly toast = inject(UmsToastService);
  private readonly router = inject(Router);

  protected readonly courseOfferingId = signal('');
  protected readonly startStageIndex = signal('0');
  protected readonly wizard = signal<ResultPublicationWizard<WizardContext> | null>(null);

  protected readonly stepperSteps = computed<readonly StepperStep[]>(() => {
    const wizard = this.wizard();
    if (!wizard) return [];
    return wizard.steps.map((step) => ({ label: step.label, description: step.description }));
  });

  protected startWizard(): void {
    const courseOfferingId = this.courseOfferingId().trim();
    if (!courseOfferingId) return;
    const startIndex = Number(this.startStageIndex());
    const allSteps = buildSteps(this.api);
    const wizard = new ResultPublicationWizard<WizardContext>(
      allSteps.slice(startIndex),
      { courseOfferingId, result: this.store.currentResult() },
      { revalidate: (permission) => this.permissions.revalidate(permission) },
    );
    this.wizard.set(wizard);
    wizard.authorizeCurrentStep().subscribe();
  }

  protected confirmAndSubmitCurrentStep(): void {
    const wizard = this.wizard();
    if (!wizard) return;
    const step = wizard.currentStep();
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title: `Confirm: ${step.label}`,
        description:
          step.description ??
          'This is a deliberately slow, elevated-permission step in Academic Result Publication.',
        reasonLabel: 'Reason (recorded for audit purposes)',
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return wizard.submitCurrentStep().pipe(
            switchMap((context) => {
              const result = context?.result;
              if (!result) return of(null);
              return confirmLatestAuditEntry(
                this.auditApi,
                'ResultPublication',
                result.id,
                sinceIso,
              ).pipe(
                map((auditEntryId) => ({ result, auditEntryId })),
                catchError(() => {
                  this.toast.show(
                    `${step.label} completed, but its audit entry could not be confirmed yet -- check the Audit Log.`,
                    { variant: 'warning' },
                  );
                  return EMPTY;
                }),
              );
            }),
          );
        }),
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        this.store.setCurrentResult(outcome.result);
        this.toast.show(`${step.label} completed (audit entry ${outcome.auditEntryId}).`, {
          variant: 'success',
        });
      });
  }

  protected reloadAfterConflict(): void {
    this.wizard.set(null);
  }

  protected rejectToFaculty(): void {
    const courseOfferingId = this.courseOfferingId().trim();
    if (!courseOfferingId) return;
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title: 'Reject grade batch to Faculty',
        description: `CourseOffering ${courseOfferingId}'s grade batch will be sent back to Faculty for re-entry. Only legal while still Calculated (not yet Locked).`,
        reasonLabel: 'Reason for rejection',
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return this.api.rejectResultPublication(courseOfferingId, { reason }).pipe(
            switchMap((result) =>
              confirmLatestAuditEntry(this.auditApi, 'ResultPublication', result.id, sinceIso).pipe(
                map((auditEntryId) => ({ result, auditEntryId })),
              ),
            ),
            catchError((error: unknown) => {
              this.toast.show(`Could not reject: ${toUmsApiError(error).message}`, {
                variant: 'danger',
              });
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        this.store.setCurrentResult(outcome.result);
        this.wizard.set(null);
        this.toast.show(`Batch rejected to Faculty (audit entry ${outcome.auditEntryId}).`, {
          variant: 'success',
        });
      });
  }

  protected leaveRevokedFlow(): void {
    this.wizard.set(null);
    this.router.navigate(['/dashboard']);
  }
}

function buildSteps(api: AcademicApi): readonly ResultPublicationStepDefinition<WizardContext>[] {
  return [
    {
      id: 'lock',
      label: 'Lock',
      description:
        'Department Head review lock -- the batch can no longer be recalculated by Faculty.',
      requiredPermission: PERMISSION_KEYS.academic.gradeLock,
      action: (ctx) =>
        api
          .lockResultPublication(ctx.courseOfferingId)
          .pipe(map((result) => ({ courseOfferingId: ctx.courseOfferingId, result }))),
    },
    {
      id: 'approve',
      label: 'Approve',
      description: 'Registrar/authorized-authority approval.',
      requiredPermission: PERMISSION_KEYS.academic.resultApprove,
      action: (ctx) =>
        api
          .approveResultPublication(ctx.courseOfferingId)
          .pipe(map((result) => ({ courseOfferingId: ctx.courseOfferingId, result }))),
    },
    {
      id: 'publish',
      label: 'Publish',
      description: 'Publishes the batch -- grades become visible to Students from this point.',
      requiredPermission: PERMISSION_KEYS.academic.resultPublish,
      action: (ctx) =>
        api
          .publishResultPublication(ctx.courseOfferingId)
          .pipe(map((result) => ({ courseOfferingId: ctx.courseOfferingId, result }))),
    },
    {
      id: 'archive',
      label: 'Archive',
      description: 'Archives the batch -- a terminal state.',
      requiredPermission: PERMISSION_KEYS.academic.resultPublish,
      action: (ctx) =>
        api
          .archiveResultPublication(ctx.courseOfferingId)
          .pipe(map((result) => ({ courseOfferingId: ctx.courseOfferingId, result }))),
    },
  ];
}
