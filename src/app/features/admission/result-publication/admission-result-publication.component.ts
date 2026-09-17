import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { AuditApiService, toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsStepperComponent,
  UmsToastService,
  type StepperStep,
} from '@ums/design-system';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { PermissionRevokedBannerComponent } from '../../../shared/result-publication/permission-revoked-banner.component';
import { ResultPublicationWizard } from '../../../shared/result-publication/result-publication-wizard';
import type { ResultPublicationStepDefinition } from '../../../shared/result-publication/result-publication-wizard.types';
import { AdmissionResultPublicationStore } from '../state/admission-result-publication.store';
import { AdmissionApi } from '../admission.api';
import type { AdmissionResultDto } from '../admission.types';

interface WizardContext {
  readonly campaignId: string;
  readonly result: AdmissionResultDto | null;
}

/**
 * ADMIN-20: Admission Result Publication control -- requirement-spec.md §7's "deliberately slow,
 * multi-step confirmation screen requiring an elevated permission and a reason," NEVER a side
 * effect of any other screen (§3.4). Built on the shared {@link ResultPublicationWizard} state
 * machine (ADMIN-20/ADMIN-23 shared foundation) implementing edge-cases.md's mid-flow
 * role-revocation resolution: every step transition re-checks `admission.result.publish` live
 * before rendering the next step actionable, and any `403` anywhere renders the shared
 * {@link PermissionRevokedBannerComponent} terminal state, never a generic error toast.
 *
 * **This screen CAN bootstrap the wizard from the campaign's real current status** (`GET
 * /results/by-campaign/{campaignId}`, confirmed real) -- the one advantage Admission's own
 * ResultPublication-shaped entity has over Academic's (ADMIN-23 has no equivalent read endpoint,
 * see that component's own doc for how it works around the gap instead). `Calculate -> Lock ->
 * Approve -> Publish` maps onto the real, confirmed `AdmissionResultStatus` sequence
 * (`Draft -> Calculated -> Verified -> Approved -> Publishing -> Published`); a campaign already at
 * `Publishing`/`Published`/`Archived` has no further wizard step -- `Published` additionally offers
 * the real `reenter-for-correction` escape hatch as a separate, explicitly-labelled action outside
 * the linear wizard.
 *
 * Every step submission is preceded by the shared confirmation-with-reason prompt and only reports
 * success once the resulting audit entry is confirmed (design-decisions.md's Confirmation-with-
 * Reason + Audit-Linked Success Pattern) -- built by hand here, like `student-records.component.ts`'s
 * own status-change flow, rather than via `AuditedActionService.confirmAndRun`, because this screen
 * needs to inspect the wizard's own resulting status (revoked/error/completed) rather than
 * `confirmAndRun`'s one-size-fits-all success/error toast.
 */
@Component({
  selector: 'app-admission-result-publication',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsStepperComponent,
    HasPermissionDirective,
    PermissionRevokedBannerComponent,
  ],
  templateUrl: './admission-result-publication.component.html',
  styleUrl: './admission-result-publication.component.scss',
})
export class AdmissionResultPublicationComponent {
  protected readonly store = inject(AdmissionResultPublicationStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly api = inject(AdmissionApi);
  private readonly permissions = inject(PermissionsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auditApi = inject(AuditApiService);
  private readonly toast = inject(UmsToastService);
  private readonly router = inject(Router);

  protected readonly lookupCampaignId = signal('');
  protected readonly wizard = signal<ResultPublicationWizard<WizardContext> | null>(null);

  protected readonly stepperSteps = computed<readonly StepperStep[]>(() => {
    const wizard = this.wizard();
    if (!wizard) return [];
    return wizard.steps.map((step) => ({ label: step.label, description: step.description }));
  });

  protected loadCurrentResult(): void {
    const campaignId = this.lookupCampaignId().trim();
    if (!campaignId) return;
    this.wizard.set(null);
    this.store.loadResultByCampaign(campaignId);
  }

  protected startWizard(): void {
    const campaignId = this.lookupCampaignId().trim();
    if (!campaignId) return;
    const current = this.store.currentResult();
    const startIndex = stepIndexForStatus(current?.status ?? 'Draft');
    if (startIndex === null) return;

    const allSteps = buildSteps(this.api);
    const wizard = new ResultPublicationWizard<WizardContext>(
      allSteps.slice(startIndex),
      { campaignId, result: current },
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
          `This is a deliberately slow, elevated-permission step in Admission Result Publication.`,
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
                'AdmissionResult',
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

  protected reenterForCorrection(): void {
    const current = this.store.currentResult();
    if (!current) return;
    const sinceIso = new Date().toISOString();

    this.confirmation
      .requestReason({
        title: 'Reenter Admission Result for correction',
        description: `Admission Result ${current.id} will be reverted from Published to Verified for correction. It will need to be re-approved and re-published.`,
        reasonLabel: 'Reason for correction',
      })
      .pipe(
        switchMap((reason) => {
          if (reason === null) return of(null);
          return this.api.reenterAdmissionResultForCorrection(current.id).pipe(
            switchMap((updated) =>
              confirmLatestAuditEntry(this.auditApi, 'AdmissionResult', updated.id, sinceIso).pipe(
                map((auditEntryId) => ({ updated, auditEntryId })),
              ),
            ),
            catchError((error: unknown) => {
              this.toast.show(`Could not reenter for correction: ${toUmsApiError(error).message}`, {
                variant: 'danger',
              });
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        this.store.setCurrentResult(outcome.updated);
        this.wizard.set(null);
        this.toast.show(`Reentered for correction (audit entry ${outcome.auditEntryId}).`, {
          variant: 'success',
        });
      });
  }

  protected leaveRevokedFlow(): void {
    this.wizard.set(null);
    this.router.navigate(['/dashboard']);
  }
}

/** `Publishing`/`Published`/`Archived` have no further wizard step -- `null` signals "not applicable." */
function stepIndexForStatus(status: string): number | null {
  switch (status) {
    case 'Draft':
      return 0;
    case 'Calculated':
      return 1;
    case 'Verified':
      return 2;
    case 'Approved':
      return 3;
    default:
      return null;
  }
}

/** Every step but `calculate` requires an already-known `AdmissionResult` id from the prior step's response. */
function requireResultId(ctx: WizardContext, stepLabel: string): Observable<string> {
  return ctx.result
    ? of(ctx.result.id)
    : throwError(() => new Error(`Cannot ${stepLabel} before Calculate has run.`));
}

function buildSteps(api: AdmissionApi): readonly ResultPublicationStepDefinition<WizardContext>[] {
  return [
    {
      id: 'calculate',
      label: 'Calculate Result',
      description: "Computes outcomes from the campaign's approved Merit List.",
      requiredPermission: PERMISSION_KEYS.admission.resultPublish,
      action: (ctx) =>
        api
          .calculateAdmissionResult(ctx.campaignId)
          .pipe(map((result) => ({ campaignId: ctx.campaignId, result }))),
    },
    {
      id: 'lock',
      label: 'Lock',
      description: 'Department Head review lock -- the batch can no longer be recalculated.',
      requiredPermission: PERMISSION_KEYS.admission.resultPublish,
      action: (ctx) =>
        requireResultId(ctx, 'lock').pipe(
          switchMap((resultId) => api.lockAdmissionResult(resultId)),
          map((result) => ({ campaignId: ctx.campaignId, result })),
        ),
    },
    {
      id: 'approve',
      label: 'Approve',
      description: 'Registrar/authorized-authority approval.',
      requiredPermission: PERMISSION_KEYS.admission.resultPublish,
      action: (ctx) =>
        requireResultId(ctx, 'approve').pipe(
          switchMap((resultId) => api.approveAdmissionResult(resultId)),
          map((result) => ({ campaignId: ctx.campaignId, result })),
        ),
    },
    {
      id: 'publish',
      label: 'Publish',
      description:
        'Starts publishing -- the batch becomes visible to applicants once the write-through cache job completes.',
      requiredPermission: PERMISSION_KEYS.admission.resultPublish,
      action: (ctx) =>
        requireResultId(ctx, 'publish').pipe(
          switchMap((resultId) => api.publishAdmissionResult(resultId)),
          map((result) => ({ campaignId: ctx.campaignId, result })),
        ),
    },
  ];
}
