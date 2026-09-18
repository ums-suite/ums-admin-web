import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { LibraryCirculationStore } from '../state/library-circulation.store';
import type { FineDto, LoanDto, ReservationDto } from '../library.types';

const LOAN_COLUMNS: readonly DataTableColumn<LoanDto>[] = [
  { id: 'id', header: 'Loan', accessor: (r) => r.id },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
  { id: 'isOverdue', header: 'Overdue', accessor: (r) => (r.isOverdue ? 'Yes' : 'No') },
  { id: 'dueAt', header: 'Due', accessor: (r) => r.dueAt },
];
const RESERVATION_COLUMNS: readonly DataTableColumn<ReservationDto>[] = [
  { id: 'id', header: 'Reservation', accessor: (r) => r.id },
  { id: 'bookId', header: 'Book', accessor: (r) => r.bookId },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];
const FINE_COLUMNS: readonly DataTableColumn<FineDto>[] = [
  { id: 'id', header: 'Fine', accessor: (r) => r.id },
  { id: 'reason', header: 'Reason', accessor: (r) => r.reason },
  { id: 'amount', header: 'Amount', accessor: (r) => r.amount, numeric: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];

/**
 * ADMIN-29: Loan issue/renew/return + review-flags, Reservation submit, Fine settle/waive.
 *
 * **No cancel/fulfil/claim endpoint exists for Reservations** -- "claiming" an offered
 * reservation is just issuing a loan against the reserved copy id (the issue service detects and
 * claims it internally); this screen surfaces that as guidance text rather than a fabricated
 * "claim" button. `isOverdue` is always the value fetched on `LoanDto`, computed server-side.
 * Fine waiver reuses the shared confirmation-with-reason + audit-linked success pattern
 * (requirement-spec.md §8 invariant #5); settling a fine creates a real Finance Invoice, whose id
 * this screen surfaces once returned.
 */
@Component({
  selector: 'app-library-circulation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './library-circulation.component.html',
  styleUrl: './library-circulation.component.scss',
})
export class LibraryCirculationComponent {
  protected readonly store = inject(LibraryCirculationStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly loanColumns = LOAN_COLUMNS;
  protected readonly reservationColumns = RESERVATION_COLUMNS;
  protected readonly fineColumns = FINE_COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly borrowerTypeOptions: readonly SelectOption[] = [
    { value: 'Student', label: 'Student' },
    { value: 'Faculty', label: 'Faculty' },
  ];

  protected readonly issueCopyId = signal('');
  protected readonly issueBorrowerId = signal('');
  protected readonly issueBorrowerType = signal('Student');

  protected readonly flagsLoanId = signal('');
  protected readonly reserveBookId = signal('');

  protected readonly waiveFineId = signal('');

  protected submitIssueLoan(): void {
    const bookCopyId = this.issueCopyId().trim();
    const borrowerId = this.issueBorrowerId().trim();
    if (!bookCopyId || !borrowerId) return;
    this.store
      .issueLoan({
        BookCopyId: bookCopyId,
        BorrowerId: borrowerId,
        BorrowerType: this.issueBorrowerType(),
      })
      .subscribe(() => this.issueCopyId.set(''));
  }

  protected loadMyLoans(): void {
    this.store.loadMyLoans();
  }

  protected renew(id: string): void {
    this.store.renewLoan(id).subscribe();
  }

  protected returnLoan(id: string): void {
    this.store.returnLoan(id).subscribe();
  }

  protected loadReviewFlags(): void {
    const id = this.flagsLoanId().trim();
    if (id) this.store.loadReviewFlags(id);
  }

  protected currentFlags() {
    return this.store.reviewFlagsByLoanId()[this.flagsLoanId().trim()] ?? [];
  }

  protected submitReservation(): void {
    const bookId = this.reserveBookId().trim();
    if (!bookId) return;
    this.store.reserveBook({ BookId: bookId }).subscribe(() => this.reserveBookId.set(''));
  }

  protected loadMyReservations(): void {
    this.store.loadMyReservations();
  }

  protected loadMyFines(): void {
    this.store.loadMyFines();
  }

  protected settle(id: string): void {
    this.store.settleFine(id).subscribe();
  }

  protected waive(): void {
    const id = this.waiveFineId().trim();
    if (!id) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Waive fine',
        description: `Fine ${id} will be fully waived. This forgives the borrower's obligation and requires a reason.`,
        reasonLabel: 'Reason for waiver (mandatory)',
        perform: (reason) =>
          this.store
            .waiveFine(id, { Reason: reason })
            .pipe(
              switchMap((fine) =>
                confirmLatestAuditEntry(this.auditApi, 'Fine', fine.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: fine, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Fine waived (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not waive fine: ${error.message}`,
      })
      .subscribe(() => this.waiveFineId.set(''));
  }
}
