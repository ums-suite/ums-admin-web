import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsDatePickerComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { FinanceFeeStructuresStore } from '../state/finance-fee-structures.store';
import type { FeeStructureDto } from '../finance.types';

const COLUMNS: readonly DataTableColumn<FeeStructureDto>[] = [
  {
    id: 'feeType',
    header: 'Fee type',
    accessor: (r) => r.feeType,
    sortable: true,
    filterable: true,
  },
  {
    id: 'applicability',
    header: 'Applicability',
    accessor: (r) => r.applicabilityReferenceId ?? r.applicabilityServiceName,
    formatter: (r) =>
      `${r.applicabilityType}: ${r.applicabilityReferenceId ?? r.applicabilityServiceName}`,
  },
  { id: 'amount', header: 'Amount', accessor: (r) => r.amount, numeric: true, sortable: true },
  { id: 'currency', header: 'Currency', accessor: (r) => r.currency },
  { id: 'version', header: 'Version', accessor: (r) => r.versionNumber, numeric: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true, filterable: true },
];

/**
 * ADMIN-24: FeeStructure configuration per Program/Campaign/Service (requirement-spec.md §3.8).
 * The one Finance entity with a real, unfiltered `GET /fee-structures` list -- rendered here with
 * the shared virtualized `UmsDataTableComponent` (client-side sort/filter over the full list, since
 * `ums-core` supports no server-side filtering for this endpoint).
 *
 * Each row IS one version (publishing a new version deprecates the prior Active row server-side);
 * there is no update/delete of an existing version, only create-initial and publish-next-version.
 */
@Component({
  selector: 'app-finance-fee-structures',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    UmsDatePickerComponent,
    HasPermissionDirective,
  ],
  templateUrl: './finance-fee-structures.component.html',
  styleUrl: './finance-fee-structures.component.scss',
})
export class FinanceFeeStructuresComponent {
  protected readonly store = inject(FinanceFeeStructuresStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: FeeStructureDto): string => row.id;
  protected readonly applicabilityOptions: readonly SelectOption[] = [
    { value: 'Program', label: 'Program' },
    { value: 'AdmissionCampaign', label: 'Admission Campaign' },
    { value: 'Service', label: 'Service' },
  ];

  protected readonly newFeeType = signal('');
  protected readonly newApplicabilityType = signal('Program');
  protected readonly newApplicabilityReferenceId = signal('');
  protected readonly newApplicabilityServiceName = signal('');
  protected readonly newAmount = signal('');
  protected readonly newCurrency = signal('BDT');
  protected readonly newEffectiveFrom = signal<string | null>(null);

  protected readonly versionFeeStructureId = signal('');
  protected readonly versionAmount = signal('');
  protected readonly versionEffectiveFrom = signal<string | null>(null);

  protected loadFeeStructures(): void {
    this.store.loadFeeStructures();
  }

  protected submitCreate(): void {
    const feeType = this.newFeeType().trim();
    const amount = Number(this.newAmount());
    const applicabilityType = this.newApplicabilityType();
    const applicabilityReferenceId =
      applicabilityType === 'Service' ? null : this.newApplicabilityReferenceId().trim() || null;
    const applicabilityServiceName =
      applicabilityType === 'Service' ? this.newApplicabilityServiceName().trim() || null : null;
    if (!feeType || !Number.isFinite(amount)) return;
    if (applicabilityType !== 'Service' && !applicabilityReferenceId) return;
    if (applicabilityType === 'Service' && !applicabilityServiceName) return;

    this.store
      .createFeeStructure({
        feeType,
        applicabilityType,
        applicabilityReferenceId,
        applicabilityServiceName,
        amount,
        currency: this.newCurrency().trim() || null,
        effectiveFrom: this.newEffectiveFrom(),
      })
      .subscribe(() => {
        this.newFeeType.set('');
        this.newApplicabilityReferenceId.set('');
        this.newApplicabilityServiceName.set('');
        this.newAmount.set('');
      });
  }

  protected submitNewVersion(): void {
    const feeStructureId = this.versionFeeStructureId().trim();
    const amount = Number(this.versionAmount());
    if (!feeStructureId || !Number.isFinite(amount)) return;

    this.store
      .publishNewVersion(feeStructureId, {
        amount,
        currency: null,
        effectiveFrom: this.versionEffectiveFrom(),
      })
      .subscribe(() => {
        this.versionFeeStructureId.set('');
        this.versionAmount.set('');
      });
  }
}
