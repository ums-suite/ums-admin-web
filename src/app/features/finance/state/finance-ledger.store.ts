import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { FinanceApi } from '../finance.api';
import type { LedgerEntryDto, LedgerEntryQuery } from '../finance.types';

interface FinanceLedgerState {
  readonly entries: readonly LedgerEntryDto[];
  readonly totalCount: number;
  readonly lastQueriedAt: Date | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: FinanceLedgerState = {
  entries: [],
  totalCount: 0,
  lastQueriedAt: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-24: read-only Ledger inspection -- `LedgerEntry` is append-only by design (glossary; no
 * write endpoint of any kind exists, confirmed at the DB/application/API layers, see
 * `finance.types.ts`'s own doc), so this store never attempts a mutation.
 */
export const FinanceLedgerStore = signalStore(
  { providedIn: 'root' },
  withState<FinanceLedgerState>(initialState),
  withMethods((store, api = inject(FinanceApi)) => ({
    query(query: LedgerEntryQuery): void {
      patchState(store, { isLoading: true, error: null });
      api.listLedgerEntries(query).subscribe({
        next: (page) =>
          patchState(store, {
            entries: page.items,
            totalCount: page.totalCount,
            lastQueriedAt: new Date(),
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
  })),
);
