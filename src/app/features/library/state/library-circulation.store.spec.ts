import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { LibraryCirculationStore } from './library-circulation.store';

describe('LibraryCirculationStore', () => {
  let store: InstanceType<typeof LibraryCirculationStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const loan = {
    id: 'loan-1',
    bookCopyId: 'copy-1',
    borrowerId: 's-1',
    borrowerType: 'Student',
    status: 'Active',
    isOverdue: false,
    issuedAt: '2026-01-01T00:00:00Z',
    dueAt: '2026-01-15T00:00:00Z',
    returnedAt: null,
  };
  const fine = {
    id: 'fine-1',
    loanId: 'loan-1',
    borrowerId: 's-1',
    reason: 'Overdue',
    amount: 50,
    currency: 'BDT',
    status: 'Accruing',
    invoiceId: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(LibraryCirculationStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('issues a loan with the PascalCase body', () => {
    store
      .issueLoan({ BookCopyId: 'copy-1', BorrowerId: 's-1', BorrowerType: 'Student' })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/library/loans`);
    expect(req.request.body).toEqual({
      BookCopyId: 'copy-1',
      BorrowerId: 's-1',
      BorrowerType: 'Student',
    });
    req.flush(loan);
    expect(store.myLoans()).toEqual([loan]);
  });

  it('trusts isOverdue as fetched, never re-deriving it client-side', () => {
    store.loadMyLoans();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/loans/me`)
      .flush([{ ...loan, isOverdue: true }]);
    expect(store.myLoans()[0].isOverdue).toBeTrue();
  });

  it('renews a loan in place', () => {
    store.loadMyLoans();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/library/loans/me`).flush([loan]);
    store.renewLoan('loan-1').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/loans/loan-1/renew`)
      .flush({ ...loan, dueAt: '2026-02-01T00:00:00Z' });
    expect(store.myLoans()[0].dueAt).toBe('2026-02-01T00:00:00Z');
  });

  it('reserves a book with the PascalCase BookId-only body', () => {
    store.reserveBook({ BookId: 'book-1' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/library/reservations`);
    expect(req.request.body).toEqual({ BookId: 'book-1' });
    req.flush({
      id: 'res-1',
      bookId: 'book-1',
      status: 'Queued',
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(store.myReservations().length).toBe(1);
  });

  it('settles a fine, capturing the resulting invoiceId', () => {
    store.loadMyFines();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/library/fines/me`).flush([fine]);
    store.settleFine('fine-1').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/fines/fine-1/settle`)
      .flush({ ...fine, status: 'PendingSettlement', invoiceId: 'inv-1' });
    expect(store.myFines()[0].invoiceId).toBe('inv-1');
  });

  it('waives a fine with the PascalCase Reason body', () => {
    store.waiveFine('fine-1', { Reason: 'Hardship case' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/library/fines/fine-1/waive`);
    expect(req.request.body).toEqual({ Reason: 'Hardship case' });
    req.flush({ ...fine, status: 'Waived' });
  });

  it('surfaces an error message when loading my loans fails', () => {
    store.loadMyLoans();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/loans/me`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
