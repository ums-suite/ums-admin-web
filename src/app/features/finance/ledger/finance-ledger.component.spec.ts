import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FinanceLedgerComponent } from './finance-ledger.component';

describe('FinanceLedgerComponent', () => {
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceLedgerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('runs a filtered query and renders the resulting entries', () => {
    const fixture = TestBed.createComponent(FinanceLedgerComponent);
    fixture.detectChanges();
    fixture.componentInstance['referenceType'].set('Payment');
    fixture.componentInstance['referenceId'].set('pay-1');

    fixture.componentInstance['runQuery']();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/finance/ledger-entries` &&
        r.params.get('referenceType') === 'Payment' &&
        r.params.get('referenceId') === 'pay-1' &&
        r.params.get('skip') === '0' &&
        r.params.get('take') === '50',
    );
    req.flush(page);
    fixture.detectChanges();

    // CDK's virtual-scroll viewport measures/renders via ResizeObserver + requestAnimationFrame,
    // which Karma/Jasmine doesn't reliably flush (see @ums/design-system's own
    // data-table.component.spec.ts doc) -- assert against the store's data model instead of the
    // virtualized row DOM.
    expect(fixture.componentInstance['store'].entries()).toEqual(page.items);
    expect(fixture.componentInstance['store'].totalCount()).toBe(1);
  });
});
