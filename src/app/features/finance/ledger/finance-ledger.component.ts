import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsDateRangePickerComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  type DataTableColumn,
} from '@ums/design-system';
import { FreshnessLabelComponent } from '../../../shared/freshness/freshness-label.component';
import { FinanceLedgerStore } from '../state/finance-ledger.store';
import type { LedgerEntryDto } from '../finance.types';

const COLUMNS: readonly DataTableColumn<LedgerEntryDto>[] = [
  { id: 'entryType', header: 'Entry type', accessor: (r) => r.entryType, sortable: true },
  { id: 'referenceType', header: 'Reference type', accessor: (r) => r.referenceType },
  { id: 'referenceId', header: 'Reference id', accessor: (r) => r.referenceId },
  { id: 'amount', header: 'Amount', accessor: (r) => r.amount, numeric: true, sortable: true },
  { id: 'currency', header: 'Currency', accessor: (r) => r.currency },
  { id: 'description', header: 'Description', accessor: (r) => r.description },
  { id: 'occurredAt', header: 'Occurred at', accessor: (r) => r.occurredAt, sortable: true },
];

/**
 * ADMIN-24: read-only Ledger inspection (requirement-spec.md §3.8) -- `LedgerEntry` is append-only
 * by design (confirmed at the DB/application/API layers, see `finance.types.ts`'s own doc); this
 * screen has no edit/delete affordance of any kind and should never grow one.
 *
 * Reuses design-decisions.md's "Audit-Log Read-Consistency/Freshness-Snapshot Pattern" vocabulary
 * (the shared {@link FreshnessLabelComponent}) even though this screen's own source ticket is
 * ADMIN-24, not ADMIN-34 -- a Ledger query is exactly as investigative/point-in-time as an Audit Log
 * query, and this app's own "trust signal" vocabulary is meant to stay consistent across both.
 */
@Component({
  selector: 'app-finance-ledger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsDateRangePickerComponent,
    FreshnessLabelComponent,
  ],
  templateUrl: './finance-ledger.component.html',
  styleUrl: './finance-ledger.component.scss',
})
export class FinanceLedgerComponent {
  protected readonly store = inject(FinanceLedgerStore);
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: LedgerEntryDto): string => row.id;

  protected readonly referenceType = signal('');
  protected readonly referenceId = signal('');
  protected readonly entryType = signal('');
  protected readonly occurredFrom = signal<string | null>(null);
  protected readonly occurredTo = signal<string | null>(null);

  protected runQuery(): void {
    this.store.query({
      referenceType: this.referenceType().trim() || undefined,
      referenceId: this.referenceId().trim() || undefined,
      entryType: this.entryType().trim() || undefined,
      occurredFrom: this.occurredFrom() ?? undefined,
      occurredTo: this.occurredTo() ?? undefined,
      skip: 0,
      take: 50,
    });
  }
}
