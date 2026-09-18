import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { LibraryCirculationComponent } from './library-circulation.component';

describe('LibraryCirculationComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryCirculationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('does not issue a loan without required fields', () => {
    const fixture = TestBed.createComponent(LibraryCirculationComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitIssueLoan']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/library/loans`);
  });

  it('issues a loan with the PascalCase body', () => {
    const fixture = TestBed.createComponent(LibraryCirculationComponent);
    fixture.detectChanges();
    fixture.componentInstance['issueCopyId'].set('copy-1');
    fixture.componentInstance['issueBorrowerId'].set('s-1');
    fixture.componentInstance['submitIssueLoan']();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/library/loans`);
    expect(req.request.body).toEqual({
      BookCopyId: 'copy-1',
      BorrowerId: 's-1',
      BorrowerType: 'Student',
    });
    req.flush({
      id: 'loan-1',
      bookCopyId: 'copy-1',
      borrowerId: 's-1',
      borrowerType: 'Student',
      status: 'Active',
      isOverdue: false,
      issuedAt: '2026-01-01T00:00:00Z',
      dueAt: '2026-01-15T00:00:00Z',
      returnedAt: null,
    });
  });

  it('waives a fine end to end with a mandatory reason and audit-linked success', () => {
    const fixture = TestBed.createComponent(LibraryCirculationComponent);
    fixture.detectChanges();
    fixture.componentInstance['waiveFineId'].set('fine-1');
    fixture.componentInstance['waive']();
    expect(confirmation.current()?.title).toBe('Waive fine');
    confirmation.confirm('financial hardship');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/library/fines/fine-1/waive`);
    expect(req.request.body).toEqual({ Reason: 'financial hardship' });
    req.flush({ ...fine, status: 'Waived' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('settles a fine and surfaces the resulting invoice id', () => {
    const fixture = TestBed.createComponent(LibraryCirculationComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadMyFines']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/library/fines/me`).flush([fine]);

    fixture.componentInstance['settle']('fine-1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/fines/fine-1/settle`)
      .flush({ ...fine, status: 'PendingSettlement', invoiceId: 'inv-1' });
    expect(fixture.componentInstance['store'].myFines()[0].invoiceId).toBe('inv-1');
  });
});
