import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FinanceLedgerStore } from './finance-ledger.store';

describe('FinanceLedgerStore', () => {
  let store: InstanceType<typeof FinanceLedgerStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const page = {
    items: [
      {
        id: 'entry-1',
        entryType: 'PaymentPosted',
        referenceType: 'Payment',
        referenceId: 'pay-1',
        amount: 500,
        currency: 'BDT',
        description: 'Payment posted',
        correlationId: 'corr-1',
        occurredAt: '2026-01-01T00:00:00Z',
      },
    ],
    totalCount: 1,
    skip: 0,
    take: 50,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(FinanceLedgerStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('queries ledger entries and records a lastQueriedAt freshness timestamp', () => {
    const before = Date.now();
    store.query({ referenceType: 'Payment', referenceId: 'pay-1', skip: 0, take: 50 });
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/finance/ledger-entries` &&
        r.params.get('referenceType') === 'Payment' &&
        r.params.get('referenceId') === 'pay-1',
    );
    req.flush(page);

    expect(store.entries()).toEqual(page.items);
    expect(store.totalCount()).toBe(1);
    const lastQueriedAt = store.lastQueriedAt();
    expect(lastQueriedAt).not.toBeNull();
    expect(lastQueriedAt?.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('surfaces an error on a failed query', () => {
    store.query({});
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/finance/ledger-entries`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });

  it('omits undefined filters from the request params', () => {
    store.query({});
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/ledger-entries`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(page);
  });
});
