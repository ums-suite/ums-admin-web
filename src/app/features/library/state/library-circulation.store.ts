import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { LibraryApi } from '../library.api';
import type {
  CreateLoanRequest,
  CreateReservationRequest,
  FineDto,
  LoanDto,
  LoanReviewFlagDto,
  ReservationDto,
  WaiveFineRequest,
} from '../library.types';

interface LibraryCirculationState {
  readonly myLoans: readonly LoanDto[];
  readonly reviewFlagsByLoanId: Readonly<Record<string, readonly LoanReviewFlagDto[]>>;
  readonly myReservations: readonly ReservationDto[];
  readonly myFines: readonly FineDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: LibraryCirculationState = {
  myLoans: [],
  reviewFlagsByLoanId: {},
  myReservations: [],
  myFines: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-29: Loan issue/renew/return, Reservation submit (no cancel/claim endpoint -- see
 * `library.types.ts`'s own doc), and Fine settle/waive. `isOverdue` is always trusted as-fetched
 * from `LoanDto`, never re-derived from a due date client-side.
 */
export const LibraryCirculationStore = signalStore(
  { providedIn: 'root' },
  withState<LibraryCirculationState>(initialState),
  withMethods((store, api = inject(LibraryApi)) => ({
    issueLoan: (request: CreateLoanRequest) =>
      api
        .createLoan(request)
        .pipe(tap((loan) => patchState(store, { myLoans: [loan, ...store.myLoans()] }))),
    loadMyLoans(): void {
      patchState(store, { isLoading: true, error: null });
      api.myLoans().subscribe({
        next: (myLoans) => patchState(store, { myLoans, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    renewLoan: (id: string) =>
      api
        .renewLoan(id)
        .pipe(
          tap((loan) =>
            patchState(store, { myLoans: store.myLoans().map((l) => (l.id === id ? loan : l)) }),
          ),
        ),
    returnLoan: (id: string) =>
      api
        .returnLoan(id)
        .pipe(
          tap((loan) =>
            patchState(store, { myLoans: store.myLoans().map((l) => (l.id === id ? loan : l)) }),
          ),
        ),
    loadReviewFlags(loanId: string): void {
      api.getLoanReviewFlags(loanId).subscribe({
        next: (flags) =>
          patchState(store, {
            reviewFlagsByLoanId: { ...store.reviewFlagsByLoanId(), [loanId]: flags },
          }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },

    reserveBook: (request: CreateReservationRequest) =>
      api
        .createReservation(request)
        .pipe(tap((r) => patchState(store, { myReservations: [r, ...store.myReservations()] }))),
    loadMyReservations(): void {
      patchState(store, { isLoading: true, error: null });
      api.myReservations().subscribe({
        next: (myReservations) => patchState(store, { myReservations, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },

    loadMyFines(): void {
      patchState(store, { isLoading: true, error: null });
      api.myFines().subscribe({
        next: (myFines) => patchState(store, { myFines, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    settleFine: (id: string) =>
      api
        .settleFine(id)
        .pipe(
          tap((fine) =>
            patchState(store, { myFines: store.myFines().map((f) => (f.id === id ? fine : f)) }),
          ),
        ),
    waiveFine: (id: string, request: WaiveFineRequest) =>
      api
        .waiveFine(id, request)
        .pipe(
          tap((fine) =>
            patchState(store, { myFines: store.myFines().map((f) => (f.id === id ? fine : f)) }),
          ),
        ),
  })),
);
