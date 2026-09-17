import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FinanceOversightStore } from './finance-oversight.store';

describe('FinanceOversightStore', () => {
  let store: InstanceType<typeof FinanceOversightStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const invoice = {
    id: 'inv-1',
    sourceModule: 'Admission',
    sourceReferenceId: 'app-1',
    feeType: 'ApplicationFee',
    ownerId: 'user-1',
    totalAmount: 500,
    currency: 'BDT',
    status: 'Paid',
    createdAt: '2026-01-01T00:00:00Z',
    paidAt: '2026-01-02T00:00:00Z',
  };

  const payment = {
    id: 'pay-1',
    invoiceId: 'inv-1',
    ownerId: 'user-1',
    amount: 500,
    currency: 'BDT',
    status: 'Successful',
    gatewayName: 'SSLCommerz',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(FinanceOversightStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads an invoice by id', () => {
    store.loadInvoice('inv-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/invoices/inv-1`).flush(invoice);
    expect(store.currentInvoice()).toEqual(invoice);
  });

  it('surfaces the confirmed 403 ownership gap as an explicit forbidden state, not a generic error', () => {
    store.loadInvoice('not-mine');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/finance/invoices/not-mine`)
      .flush({ title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(store.forbidden()).toBeTrue();
    expect(store.error()).toBeNull();
  });

  it('loads a payment by id', () => {
    store.loadPayment('pay-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/payments/pay-1`).flush(payment);
    expect(store.currentPayment()).toEqual(payment);
  });

  it('surfaces a non-403 payment lookup failure as a real error, not forbidden', () => {
    store.loadPayment('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/finance/payments/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.forbidden()).toBeFalse();
    expect(store.error()).toBeTruthy();
  });

  it('refunds a payment', () => {
    let result: unknown;
    store
      .refundPayment('pay-1', { amount: 100, reason: 'partial refund' })
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/payments/pay-1/refund`);
    expect(req.request.body).toEqual({ amount: 100, reason: 'partial refund' });
    req.flush({
      id: 'refund-1',
      paymentId: 'pay-1',
      amount: 100,
      currency: 'BDT',
      status: 'Succeeded',
      method: 'GatewayRouted',
      gatewayRefundReference: 'ref-1',
      createdAt: '2026-01-03T00:00:00Z',
    });
    expect((result as { status: string }).status).toBe('Succeeded');
  });
});
