/**
 * ADMIN-29: hand-typed DTOs against `ums-core`'s real Library module (`UMS.Modules.Library`) --
 * `@ums/shared` has no generated Library client (same confirmed gap as every other non-Identity/
 * Audit/Organization module). Route shapes given in tickets.md are followed exactly, including
 * the PascalCase request bodies (`CreateLoanRequest`/`CreateReservationRequest`/
 * `WaiveFineRequest`) -- `Book`/`Author`/`Category`/`Loan`/`Reservation`/`Fine` field names beyond
 * those explicitly enumerated are this app's own best-effort guess (flagged inline), not
 * independently read off a C# response record.
 *
 * **CONFIRMED SEVERE GAPS, not invented workarounds**:
 * - `IsOverdue` is computed server-side at READ time, never a stored status -- this app never
 *   derives it client-side from a due date, always trusting the field on the fetched `LoanDto`.
 * - No cancel endpoint and no fulfil/claim endpoint exists for Reservations -- fulfillment is a
 *   background worker reacting to `LoanReturned`; "claiming" an offered reservation is just
 *   calling `POST /loans` with the reserved copy id (the issue service detects and claims it
 *   internally, per tickets.md's own note) -- this screen surfaces that as guidance text, not a
 *   fabricated "claim" button.
 * - No staff-wide `GET /fines` list endpoint exists, only `/me` -- a librarian-facing fine
 *   oversight list has nothing to build against, flagged explicitly rather than invented.
 */

export type BookCopyStatus = 'Available' | 'Reserved' | 'OnLoan' | 'Lost' | 'Withdrawn';
export type CopyType = 'Physical' | 'Digital';
export type LoanStatus = 'Active' | 'Returned' | 'LostWriteOff';
export type ReservationStatus = 'Queued' | 'Offered' | 'Claimed' | 'Expired';
export type FineStatus = 'Accruing' | 'PendingSettlement' | 'Paid' | 'Waived';
export type FineReason = 'Overdue' | 'LostReplacement';
export type BorrowerType = 'Student' | 'Faculty';

// ---- Catalog ----

/** ASSUMED shape beyond id/title -- not enumerated in tickets.md. */
export interface BookDto {
  readonly id: string;
  readonly title: string;
  readonly isbn: string | null;
  readonly authorId: string;
  readonly categoryId: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface CreateBookRequest {
  readonly title: string;
  readonly isbn: string | null;
  readonly authorId: string;
  readonly categoryId: string;
}

export type UpdateBookRequest = CreateBookRequest;

export interface BookListPage {
  readonly items: readonly BookDto[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface BookQuery {
  readonly q?: string;
  readonly categoryId?: string;
  readonly authorId?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface BookCopyDto {
  readonly id: string;
  readonly bookId: string;
  readonly accessionNumber: string;
  readonly condition: string | null;
  readonly copyType: CopyType | string;
  readonly status: BookCopyStatus | string;
}

/** BookId comes from the route, never the body -- confirmed real (tickets.md). */
export interface CreateBookCopyRequest {
  readonly accessionNumber: string;
  readonly condition?: string | null;
  readonly copyType: CopyType | string;
}

export interface AuthorDto {
  readonly id: string;
  readonly name: string;
}

export interface CreateAuthorRequest {
  readonly name: string;
}

export interface CategoryDto {
  readonly id: string;
  readonly name: string;
}

export interface CreateCategoryRequest {
  readonly name: string;
}

// ---- Loans ----

export interface LoanDto {
  readonly id: string;
  readonly bookCopyId: string;
  readonly borrowerId: string;
  readonly borrowerType: BorrowerType | string;
  readonly status: LoanStatus | string;
  /** Computed server-side at read time -- never derive this client-side. See class doc. */
  readonly isOverdue: boolean;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly returnedAt: string | null;
}

export interface CreateLoanRequest {
  readonly BookCopyId: string;
  readonly BorrowerId: string;
  readonly BorrowerType: BorrowerType | string;
}

/** ASSUMED shape -- a read-only officer view, exact fields not enumerated in tickets.md. */
export interface LoanReviewFlagDto {
  readonly id: string;
  readonly flag: string;
  readonly detail: string | null;
  readonly raisedAt: string;
}

// ---- Reservations -- no cancel/fulfil/claim endpoint exists, see class doc ----

export interface CreateReservationRequest {
  readonly BookId: string;
}

/** ASSUMED shape beyond bookId/status -- not enumerated in tickets.md. */
export interface ReservationDto {
  readonly id: string;
  readonly bookId: string;
  readonly status: ReservationStatus | string;
  readonly createdAt: string;
}

// ---- Fines ----

/** ASSUMED shape beyond reason/amount/status -- not enumerated in tickets.md. */
export interface FineDto {
  readonly id: string;
  readonly loanId: string | null;
  readonly borrowerId: string;
  readonly reason: FineReason | string;
  readonly amount: number;
  readonly currency: string;
  readonly status: FineStatus | string;
  /** Populated by `settle` -- a real Finance Invoice created via the shared `IInvoiceRequester`. */
  readonly invoiceId: string | null;
}

export interface WaiveFineRequest {
  readonly Reason: string;
}
