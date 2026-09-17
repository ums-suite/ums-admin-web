import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FinanceOversightComponent } from './finance-oversight.component';

describe('FinanceOversightComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const refund = {
    id: 'refund-1',
    paymentId: 'pay-1',
    amount: 100,
    currency: 'BDT',
    status: 'Succeeded',
    method: 'GatewayRouted',
    gatewayRefundReference: 'ref-1',
    createdAt: '2026-01-03T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceOversightComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('surfaces a 403 invoice lookup as the explained forbidden state', () => {
    const fixture = TestBed.createComponent(FinanceOversightComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupInvoiceId'].set('inv-1');
    fixture.componentInstance['loadInvoice']();

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/finance/invoices/inv-1`)
      .flush({ title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.componentInstance['store'].forbidden()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('ownership-gated');
  });

  it('renders the loaded invoice/payment summaries and the gated refund section once permitted', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['finance.payment.refund'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(FinanceOversightComponent);
    fixture.detectChanges();

    fixture.componentInstance['lookupInvoiceId'].set('inv-1');
    fixture.componentInstance['loadInvoice']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/invoices/inv-1`).flush({
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
    });

    fixture.componentInstance['lookupPaymentId'].set('pay-1');
    fixture.componentInstance['loadPayment']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/payments/pay-1`).flush({
      id: 'pay-1',
      invoiceId: 'inv-1',
      ownerId: 'user-1',
      amount: 500,
      currency: 'BDT',
      status: 'Successful',
      gatewayName: 'SSLCommerz',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('ApplicationFee');
    expect(fixture.nativeElement.textContent).toContain('SSLCommerz');
    expect(fixture.nativeElement.textContent).toContain('Process Refund');
  });

  it('does not submit a refund without a payment id or a positive amount', () => {
    const fixture = TestBed.createComponent(FinanceOversightComponent);
    fixture.detectChanges();
    fixture.componentInstance['refundAmount'].set('0');
    fixture.componentInstance['submitRefund']();
    expect(confirmation.current()).toBeNull();
  });

  it('processes a refund end to end with an audit-linked success toast', () => {
    const fixture = TestBed.createComponent(FinanceOversightComponent);
    fixture.detectChanges();
    fixture.componentInstance['refundPaymentId'].set('pay-1');
    fixture.componentInstance['refundAmount'].set('100');

    fixture.componentInstance['submitRefund']();
    expect(confirmation.current()?.title).toBe('Refund payment');
    confirmation.confirm('customer requested');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/payments/pay-1/refund`);
    expect(req.request.body).toEqual({ amount: 100, reason: 'customer requested' });
    req.flush(refund);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });
});
