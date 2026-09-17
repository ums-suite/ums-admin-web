import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ApplicantReviewComponent } from './applicant-review.component';

describe('ApplicantReviewComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const application = {
    id: 'a1',
    applicantId: 'ap1',
    campaignId: 'c1',
    status: 'Submitted',
    applicationNumber: 'APP-1',
    programChoices: [{ programId: 'p1', rank: 1 }],
    documents: [
      {
        id: 'd1',
        documentType: 'Transcript',
        fileReference: 'https://x/1',
        status: 'Pending',
        rejectionReason: null,
      },
    ],
    applicationFeeInvoiceId: null,
    isApplicationFeePaid: false,
    confirmationFeeInvoiceId: null,
    isConfirmationFeePaid: false,
    assignedTestSlotId: null,
    rollNumber: null,
    admitCardDocumentId: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicantReviewComponent],
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

  it('loads an application by id and renders its documents', () => {
    const fixture = TestBed.createComponent(ApplicantReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupApplicationId'].set('a1');
    fixture.componentInstance['loadApplication']();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1`).flush(application);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Transcript');
    expect(fixture.componentInstance['actionApplicationId']()).toBe('a1');
  });

  it('surfaces a 403 as the explained forbidden state, not a generic error', () => {
    const fixture = TestBed.createComponent(ApplicantReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupApplicationId'].set('a1');
    fixture.componentInstance['loadApplication']();

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1`)
      .flush({ title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.componentInstance['store'].forbidden()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('OwnershipGuard');
  });

  it('approves a document end to end and shows the audit-linked success toast', () => {
    const fixture = TestBed.createComponent(ApplicantReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance['actionApplicationId'].set('a1');
    fixture.componentInstance['actionDocumentId'].set('d1');

    fixture.componentInstance['approveDocument']();
    expect(confirmation.current()?.title).toBe('Approve application document');
    confirmation.confirm('Looks valid');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1/documents/d1/approve`)
      .flush({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('does not act without an application id', () => {
    const fixture = TestBed.createComponent(ApplicantReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance['declineApplication']();
    expect(confirmation.current()).toBeNull();
  });

  it('declines an application end to end', () => {
    const fixture = TestBed.createComponent(ApplicantReviewComponent);
    fixture.detectChanges();
    fixture.componentInstance['actionApplicationId'].set('a1');

    fixture.componentInstance['declineApplication']();
    confirmation.confirm('Ineligible');

    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1/decline`).flush({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
  });
});
