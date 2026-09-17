import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { FinanceApi } from '../finance.api';
import type {
  CreateFeeStructureRequest,
  FeeStructureDto,
  PublishNewFeeStructureVersionRequest,
} from '../finance.types';

interface FinanceFeeStructuresState {
  readonly feeStructures: readonly FeeStructureDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: FinanceFeeStructuresState = {
  feeStructures: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-24: FeeStructure configuration per Program/Campaign/Service -- the one Finance entity with
 * a real, unfiltered `GET /fee-structures` list endpoint (no server-side filtering by type/
 * applicability/status; any such filtering happens client-side over the full list, see
 * `finance-fee-structures.component.ts`'s own doc).
 */
export const FinanceFeeStructuresStore = signalStore(
  { providedIn: 'root' },
  withState<FinanceFeeStructuresState>(initialState),
  withMethods((store, api = inject(FinanceApi)) => ({
    loadFeeStructures(): void {
      patchState(store, { isLoading: true, error: null });
      api.listFeeStructures().subscribe({
        next: (feeStructures) => patchState(store, { feeStructures, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createFeeStructure: (request: CreateFeeStructureRequest) =>
      api
        .createFeeStructure(request)
        .pipe(
          tap((feeStructure) =>
            patchState(store, { feeStructures: [feeStructure, ...store.feeStructures()] }),
          ),
        ),
    publishNewVersion: (feeStructureId: string, request: PublishNewFeeStructureVersionRequest) =>
      api
        .publishNewFeeStructureVersion(feeStructureId, request)
        .pipe(
          tap((feeStructure) =>
            patchState(store, { feeStructures: [feeStructure, ...store.feeStructures()] }),
          ),
        ),
  })),
);
