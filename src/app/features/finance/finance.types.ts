/**
 * ADMIN-24/ADMIN-25: hand-typed DTOs against `ums-core`'s real Finance module source
 * (`UMS.Modules.Finance.Application.{FeeStructures,Invoices,Payments,Ledger,Reconciliation}`) --
 * `@ums/shared` has no generated Finance client (same confirmed gap as every other non-Identity/
 * Audit/Organization module in this app).
 *
 * **CONFIRMED SEVERE BACKEND GAPS for "Invoice/Payment/PaymentTransaction oversight"** (read
 * directly off `InvoiceEndpoints.cs`/`PaymentEndpoints.cs`, not guessed):
 * - `finance.invoice.read`/`finance.payment.read` are DECLARED in `FinancePermissionManifest.cs`
 *   ("Accountant/Admin batch access") but are NOT WIRED to any endpoint. There is no batch-list
 *   endpoint for either Invoice or Payment at all.
 * - `GET /invoices/{id}` and `GET /payments/{id}` are both gated only by a live session, with
 *   OWNERSHIP checked inside the service layer (`InvoiceService.GetByIdAsync`/
 *   `PaymentService.GetByIdAsync`) -- unlike Library/Hostel's own dual-path `OwnershipGuard`,
 *   neither has a staff-permission bypass. An Accountant/Admin looking up another owner's
 *   Invoice/Payment by id gets a real `403`, the same confirmed gap already documented for
 *   Admission's own `GET /applications/{id}` (see `admission.api.ts`'s own doc) -- this screen
 *   surfaces that 403 as an explicit, explained state, never a generic error.
 * - `PaymentTransaction` has NO independent DTO/endpoint anywhere -- `PaymentDto.gatewayName` is
 *   the only transaction-shaped field ums-core exposes; transaction id, gateway session/transaction
 *   reference, attempt number, and failure reason are never serialized to any response.
 *
 * **Refund is the one real exception**: `POST /payments/{id}/refund`
 * (`FinancePermissions.PaymentRefund`) is explicitly documented as "Accountant/Admin only ... not
 * ownership-scoped (a Payment's own owner never refunds their own money -- this is an operator
 * action)" -- it works for staff regardless of who owns the Payment, unlike the two GETs above.
 *
 * **Ledger is genuinely append-only and fully readable**: confirmed at the database level (a real
 * migration `REVOKE UPDATE, DELETE, TRUNCATE ON finance.ledger_entries FROM finance_service`), the
 * application layer (`ILedgerEntryRepository` has only `Add`/`ListAsync`), and the API (exactly one
 * `GET` route, no write route of any kind exists).
 *
 * **Reconciliation has NO read/query endpoint at all** (ADMIN-25's own defining gap) -- see
 * `finance.api.ts`'s own doc for the full explanation; `finance-reconciliation.component.ts` is
 * built as an explicit "not yet available" screen rather than inventing one.
 */

// ---- FeeStructure -- the one entity here with a real, unfiltered LIST endpoint ----

export type FeeApplicabilityType = 'Program' | 'AdmissionCampaign' | 'Service';
export type FeeStructureStatus = 'Active' | 'Deprecated';

export interface FeeStructureDto {
  readonly id: string;
  readonly feeType: string;
  readonly applicabilityType: FeeApplicabilityType | string;
  readonly applicabilityReferenceId: string | null;
  readonly applicabilityServiceName: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly versionNumber: number;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly status: FeeStructureStatus | string;
  readonly createdAt: string;
}

export interface CreateFeeStructureRequest {
  readonly feeType: string;
  readonly applicabilityType: FeeApplicabilityType | string;
  readonly applicabilityReferenceId: string | null;
  readonly applicabilityServiceName: string | null;
  readonly amount: number;
  readonly currency: string | null;
  readonly effectiveFrom: string | null;
}

export interface PublishNewFeeStructureVersionRequest {
  readonly amount: number;
  readonly currency: string | null;
  readonly effectiveFrom: string | null;
}

// ---- Invoice ----

export type InvoiceStatus = 'Open' | 'Paid' | 'Voided';

export interface InvoiceDto {
  readonly id: string;
  readonly sourceModule: string;
  readonly sourceReferenceId: string;
  readonly feeType: string;
  readonly ownerId: string;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: InvoiceStatus | string;
  readonly createdAt: string;
  readonly paidAt: string | null;
}

// ---- Payment / Refund (PaymentTransaction has no independent DTO -- see class doc) ----

export type PaymentStatus = 'Initiated' | 'Pending' | 'Successful' | 'Failed' | 'Reconciled';

export interface PaymentDto {
  readonly id: string;
  readonly invoiceId: string;
  readonly ownerId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus | string;
  readonly gatewayName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type RefundStatus = 'Succeeded' | 'Failed';
export type RefundMethod = 'GatewayRouted' | 'ManuallySettled';

export interface RefundDto {
  readonly id: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: RefundStatus | string;
  readonly method: RefundMethod | string;
  readonly gatewayRefundReference: string | null;
  readonly createdAt: string;
}

/** `reason` is optional/audit-only -- it has no domain effect on the refund itself. */
export interface RefundPaymentRequest {
  readonly amount: number;
  readonly reason: string | null;
}

// ---- LedgerEntry (read-only, append-only by construction) ----

export type LedgerEntryType =
  'InvoiceRaised' | 'PaymentPosted' | 'RefundPosted' | 'ReconciliationCorrection';

export interface LedgerEntryDto {
  readonly id: string;
  readonly entryType: LedgerEntryType | string;
  readonly referenceType: string;
  readonly referenceId: string;
  readonly amount: number;
  readonly currency: string;
  readonly description: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

export interface LedgerEntryListPage {
  readonly items: readonly LedgerEntryDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}

export interface LedgerEntryQuery {
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly entryType?: string;
  readonly occurredFrom?: string;
  readonly occurredTo?: string;
  readonly skip?: number;
  readonly take?: number;
}
