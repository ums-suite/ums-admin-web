import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  CreateFeeStructureRequest,
  FeeStructureDto,
  InvoiceDto,
  LedgerEntryListPage,
  LedgerEntryQuery,
  PaymentDto,
  PublishNewFeeStructureVersionRequest,
  RefundDto,
  RefundPaymentRequest,
} from './finance.types';

/**
 * ADMIN-24/ADMIN-25: hand-rolled thin client for `ums-core`'s Finance module -- see
 * `finance.types.ts`'s own doc for the confirmed severe gaps (no Invoice/Payment batch list, both
 * GET-by-id calls ownership-gated with no staff bypass, no Reconciliation read endpoint at all).
 * Every route below is confirmed real against `UMS.Modules.Finance.Api.Endpoints.*` source.
 */
@Injectable({ providedIn: 'root' })
export class FinanceApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/finance`;
  }

  // ---- FeeStructure ----

  listFeeStructures(): Observable<readonly FeeStructureDto[]> {
    return this.http.get<readonly FeeStructureDto[]>(`${this.baseUrl}/fee-structures`);
  }

  createFeeStructure(request: CreateFeeStructureRequest): Observable<FeeStructureDto> {
    return this.http.post<FeeStructureDto>(`${this.baseUrl}/fee-structures`, request);
  }

  publishNewFeeStructureVersion(
    feeStructureId: string,
    request: PublishNewFeeStructureVersionRequest,
  ): Observable<FeeStructureDto> {
    return this.http.post<FeeStructureDto>(
      `${this.baseUrl}/fee-structures/${feeStructureId}/new-version`,
      request,
    );
  }

  // ---- Invoice -- GET is ownership-gated with no staff bypass, see finance.types.ts's own doc ----

  getInvoiceById(id: string): Observable<InvoiceDto> {
    return this.http.get<InvoiceDto>(`${this.baseUrl}/invoices/${id}`);
  }

  // ---- Payment / Refund ----

  getPaymentById(id: string): Observable<PaymentDto> {
    return this.http.get<PaymentDto>(`${this.baseUrl}/payments/${id}`);
  }

  /** Not ownership-scoped -- the one real staff-facing oversight action, see finance.types.ts's own doc. */
  refundPayment(paymentId: string, request: RefundPaymentRequest): Observable<RefundDto> {
    return this.http.post<RefundDto>(`${this.baseUrl}/payments/${paymentId}/refund`, request);
  }

  // ---- LedgerEntry -- read-only, append-only, the one fully-working oversight surface ----

  listLedgerEntries(query: LedgerEntryQuery): Observable<LedgerEntryListPage> {
    let params = new HttpParams();
    if (query.referenceType) params = params.set('referenceType', query.referenceType);
    if (query.referenceId) params = params.set('referenceId', query.referenceId);
    if (query.entryType) params = params.set('entryType', query.entryType);
    if (query.occurredFrom) params = params.set('occurredFrom', query.occurredFrom);
    if (query.occurredTo) params = params.set('occurredTo', query.occurredTo);
    if (query.skip !== undefined) params = params.set('skip', query.skip);
    if (query.take !== undefined) params = params.set('take', query.take);
    return this.http.get<LedgerEntryListPage>(`${this.baseUrl}/ledger-entries`, { params });
  }
}
