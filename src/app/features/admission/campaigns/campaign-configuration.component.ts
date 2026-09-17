import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsDatePickerComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AdmissionCampaignsStore } from '../state/admission-campaigns.store';

/**
 * ADMIN-13: Admissions campaign configuration (requirement-spec.md §3.4 -- "eligibility rules,
 * dates, fee structure, seat targets per Program"). `ums-core`'s Admission module has no campaign
 * list/browse endpoint (see `admission.api.ts`'s doc) -- this screen creates a campaign, then
 * configures the just-created (or a known-id) campaign in place, which is the one real workflow
 * the confirmed backend surface supports.
 *
 * "Fee structure" here is the two confirmed real `ApplicationFeeType`/`ConfirmationFeeType`
 * string fields `AdmissionCampaign` actually carries -- these reference Finance's own
 * `FeeStructure` catalog by type name, not a full fee-amount editor (that catalog is ADMIN-24's
 * own screen, out of this ticket's scope).
 */
@Component({
  selector: 'app-campaign-configuration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsDatePickerComponent,
    HasPermissionDirective,
  ],
  templateUrl: './campaign-configuration.component.html',
  styleUrl: './campaign-configuration.component.scss',
})
export class CampaignConfigurationComponent {
  protected readonly store = inject(AdmissionCampaignsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  protected readonly lookupCampaignId = signal('');

  protected readonly newName = signal('');
  protected readonly newProgramIds = signal('');
  protected readonly newWindowStart = signal<string | null>(null);
  protected readonly newWindowEnd = signal<string | null>(null);
  protected readonly newApplicationFeeType = signal('');
  protected readonly newConfirmationFeeType = signal('');

  protected readonly ruleProgramId = signal('');
  protected readonly ruleMinimumScore = signal('');
  protected readonly ruleIsGpaScale = signal(false);
  protected readonly ruleRequiredBoard = signal('');

  protected readonly quotaProgramId = signal('');
  protected readonly quotaValue = signal('');

  protected readonly requiredDocumentType = signal('');

  protected loadCampaign(): void {
    const id = this.lookupCampaignId().trim();
    if (!id) return;
    this.store.loadCampaign(id);
  }

  protected submitCreateCampaign(): void {
    const name = this.newName().trim();
    const programIds = this.newProgramIds()
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const start = this.newWindowStart();
    const end = this.newWindowEnd();
    const applicationFeeType = this.newApplicationFeeType().trim();
    const confirmationFeeType = this.newConfirmationFeeType().trim();
    if (
      !name ||
      programIds.length === 0 ||
      !start ||
      !end ||
      !applicationFeeType ||
      !confirmationFeeType
    ) {
      return;
    }

    this.store
      .createCampaign({
        name,
        programIds,
        applicationWindowStart: start,
        applicationWindowEnd: end,
        applicationFeeType,
        confirmationFeeType,
      })
      .subscribe(() => {
        this.newName.set('');
        this.newProgramIds.set('');
        this.newWindowStart.set(null);
        this.newWindowEnd.set(null);
        this.newApplicationFeeType.set('');
        this.newConfirmationFeeType.set('');
      });
  }

  protected submitEligibilityRule(): void {
    const campaign = this.store.currentCampaign();
    const programId = this.ruleProgramId().trim();
    const minimumScoreText = this.ruleMinimumScore().trim();
    if (!campaign || !programId || !minimumScoreText) return;

    this.store
      .addEligibilityRule(campaign.id, {
        programId,
        minimumScore: Number(minimumScoreText),
        isGpaScale: this.ruleIsGpaScale(),
        requiredBoard: this.ruleRequiredBoard().trim() || null,
      })
      .subscribe(() => {
        this.ruleProgramId.set('');
        this.ruleMinimumScore.set('');
        this.ruleRequiredBoard.set('');
      });
  }

  protected submitSeatQuota(): void {
    const campaign = this.store.currentCampaign();
    const programId = this.quotaProgramId().trim();
    const quotaText = this.quotaValue().trim();
    if (!campaign || !programId || !quotaText) return;

    this.store.addSeatQuota(campaign.id, { programId, quota: Number(quotaText) }).subscribe(() => {
      this.quotaProgramId.set('');
      this.quotaValue.set('');
    });
  }

  protected submitRequiredDocumentType(): void {
    const campaign = this.store.currentCampaign();
    const documentType = this.requiredDocumentType().trim();
    if (!campaign || !documentType) return;

    this.store
      .addRequiredDocumentType(campaign.id, { documentType })
      .subscribe(() => this.requiredDocumentType.set(''));
  }
}
