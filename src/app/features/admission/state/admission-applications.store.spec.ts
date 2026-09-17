import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AdmissionApplicationsStore } from './admission-applications.store';

describe('AdmissionApplicationsStore', () => {
  let store: InstanceType<typeof AdmissionApplicationsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const application = {
    id: 'a1',
    applicantId: 'ap1',
    campaignId: 'c1',
    status: 'Submitted',
    applicationNumber: 'APP-1',
    programChoices: [],
    documents: [],
    applicationFeeInvoiceId: null,
    isApplicationFeePaid: false,
    confirmationFeeInvoiceId: null,
    isConfirmationFeePaid: false,
    assignedTestSlotId: null,
    rollNumber: null,
    admitCardDocumentId: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(AdmissionApplicationsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads an application by id', () => {
    store.loadApplication('a1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1`).flush(application);
    expect(store.currentApplication()).toEqual(application);
    expect(store.forbidden()).toBeFalse();
  });

  it('marks forbidden=true on a 403 without treating it as a generic error state', () => {
    store.loadApplication('a1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1`)
      .flush({ title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(store.forbidden()).toBeTrue();
    expect(store.error()).toBeTruthy();
  });

  it('does not mark forbidden on a non-403 failure', () => {
    store.loadApplication('a1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.forbidden()).toBeFalse();
    expect(store.error()).toBeTruthy();
  });

  it('approves a document', () => {
    let done = false;
    store.approveDocument('a1', 'd1').subscribe(() => (done = true));
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1/documents/d1/approve`)
      .flush({});
    expect(done).toBeTrue();
  });

  it('requests document resubmission with a reason', () => {
    store.requestDocumentResubmission('a1', 'd1', 'Blurry scan').subscribe();
    const req = httpMock.expectOne(
      `${apiBaseUrl}/api/v1/admission/applications/a1/documents/d1/request-resubmission`,
    );
    expect(req.request.body).toEqual({ reason: 'Blurry scan' });
    req.flush({});
  });

  it('declines an application', () => {
    store.declineApplication('a1').subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/applications/a1/decline`).flush({});
  });
});
