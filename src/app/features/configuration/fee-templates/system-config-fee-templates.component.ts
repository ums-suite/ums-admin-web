import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { FinanceApi } from '../../finance/finance.api';
import type { CreateFeeStructureRequest, FeeApplicabilityType } from '../../finance/finance.types';

interface FeeStructureTemplate {
  readonly label: string;
  readonly draft: Omit<CreateFeeStructureRequest, 'applicabilityReferenceId'>;
}

/**
 * ADMIN-35: Fee-structure "templates" -- this concept **does not exist server-side**.
 * `FeeStructure` has no template/family wrapper (its own domain doc: "no parent aggregate...
 * each row IS one version"). This is the honest, zero-new-backend-call implementation: a
 * client-side-only "save as template" convenience that stores a `CreateFeeStructureRequest`
 * draft in this component's own memory (not persisted server-side, not even to `localStorage` --
 * it is explicitly a same-session convenience, not a durable record), then re-applies it by
 * looping the EXISTING `FinanceApi.createFeeStructure` (ADMIN-24) once per target Program/
 * Campaign id. No new backend-shaped entity is ever invented.
 */
@Component({
  selector: 'app-system-config-fee-templates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './system-config-fee-templates.component.html',
  styleUrl: './system-config-fee-templates.component.scss',
})
export class SystemConfigFeeTemplatesComponent {
  protected readonly permissionKeys = PERMISSION_KEYS;
  private readonly financeApi = inject(FinanceApi);

  protected readonly applicabilityOptions: readonly SelectOption[] = [
    { value: 'Program', label: 'Program' },
    { value: 'AdmissionCampaign', label: 'Admission Campaign' },
  ];

  protected readonly templates = signal<readonly FeeStructureTemplate[]>([]);

  protected readonly draftLabel = signal('');
  protected readonly draftFeeType = signal('');
  protected readonly draftApplicabilityType = signal<FeeApplicabilityType | string>('Program');
  protected readonly draftAmount = signal('');
  protected readonly draftCurrency = signal('BDT');
  protected readonly draftEffectiveFrom = signal<string | null>(null);

  protected readonly applyTargetIdsByLabel = signal<Record<string, string>>({});
  protected readonly applyResultsByLabel = signal<Record<string, string>>({});

  protected saveTemplate(): void {
    const label = this.draftLabel().trim();
    const feeType = this.draftFeeType().trim();
    const amount = Number(this.draftAmount());
    if (!label || !feeType || !Number.isFinite(amount)) return;

    this.templates.update((templates) => [
      ...templates,
      {
        label,
        draft: {
          feeType,
          applicabilityType: this.draftApplicabilityType(),
          applicabilityServiceName: null,
          amount,
          currency: this.draftCurrency().trim() || null,
          effectiveFrom: this.draftEffectiveFrom(),
        },
      },
    ]);
    this.draftLabel.set('');
    this.draftFeeType.set('');
    this.draftAmount.set('');
  }

  protected removeTemplate(label: string): void {
    this.templates.update((templates) => templates.filter((t) => t.label !== label));
  }

  protected setApplyTargets(label: string, value: string): void {
    this.applyTargetIdsByLabel.update((map) => ({ ...map, [label]: value }));
  }

  /** Loops the existing FinanceApi.createFeeStructure once per target id -- zero new backend calls. */
  protected applyTemplate(template: FeeStructureTemplate): void {
    const targetIds = (this.applyTargetIdsByLabel()[template.label] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (targetIds.length === 0) return;

    const calls = targetIds.map((targetId) =>
      this.financeApi.createFeeStructure({ ...template.draft, applicabilityReferenceId: targetId }),
    );

    forkJoin(calls).subscribe({
      next: (created) =>
        this.applyResultsByLabel.update((map) => ({
          ...map,
          [template.label]: `Created ${created.length} fee structure(s).`,
        })),
      error: (e: unknown) =>
        this.applyResultsByLabel.update((map) => ({
          ...map,
          [template.label]: `Failed: ${toUmsApiError(e).message}`,
        })),
    });
  }
}
