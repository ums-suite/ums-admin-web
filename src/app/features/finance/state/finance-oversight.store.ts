import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { HttpErrorResponse } from '@angular/common/http';
import { toUmsApiError } from '@ums/shared';
import { FinanceApi } from '../finance.api';
import type { InvoiceDto, PaymentDto, RefundPaymentRequest } from '../finance.types';

interface FinanceOversightState {
  readonly currentInvoice: InvoiceDto | null;
  readonly currentPayment: PaymentDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly forbidden: boolean;
}

const initialState: FinanceOversightState = {
  currentInvoice: null,
  currentPayment: null,
  isLoading: false,
  error: null,
  forbidden: false,
};

/**
 * ADMIN-24: Invoice/Payment oversight + Refund processing. `GET /invoices/{id}` and
 * `GET /payments/{id}` are both ownership-gated with no staff-permission bypass (confirmed real
 * gap, see `finance.types.ts`'s own doc) -- an Accountant looking up another owner's record gets a
 * real `403`, surfaced here (`forbidden`) as an explicit, explained state, mirroring
 * `admission-applications.store.ts`'s identical handling of Admission's own analogous gap. Refund
 * (`POST /payments/{id}/refund`) is the one action here confirmed to work for staff regardless of
 * ownership.
 */
export const FinanceOversightStore = signalStore(
  { providedIn: 'root' },
  withState<FinanceOversightState>(initialState),
  withMethods((store, api = inject(FinanceApi)) => ({
    loadInvoice(id: string): void {
      patchState(store, { isLoading: true, error: null, forbidden: false });
      api.getInvoiceById(id).subscribe({
        next: (invoice) => patchState(store, { currentInvoice: invoice, isLoading: false }),
        error: (e: unknown) => {
          const forbidden = e instanceof HttpErrorResponse && e.status === 403;
          patchState(store, {
            isLoading: false,
            forbidden,
            error: forbidden ? null : toUmsApiError(e).message,
          });
        },
      });
    },
    loadPayment(id: string): void {
      patchState(store, { isLoading: true, error: null, forbidden: false });
      api.getPaymentById(id).subscribe({
        next: (payment) => patchState(store, { currentPayment: payment, isLoading: false }),
        error: (e: unknown) => {
          const forbidden = e instanceof HttpErrorResponse && e.status === 403;
          patchState(store, {
            isLoading: false,
            forbidden,
            error: forbidden ? null : toUmsApiError(e).message,
          });
        },
      });
    },
    refundPayment: (paymentId: string, request: RefundPaymentRequest) =>
      api.refundPayment(paymentId, request),
  })),
);
