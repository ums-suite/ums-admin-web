import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ReportingStore } from './reporting.store';

describe('ReportingStore', () => {
  let store: InstanceType<typeof ReportingStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(ReportingStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('returns an idle slot for a domain never loaded', () => {
    expect(store.dashboard('academic')).toEqual({
      status: 'idle',
      response: null,
      errorMessage: null,
    });
  });

  it('marks a domain loading, then loaded, on a successful fetch', () => {
    store.loadDashboard('admission');
    expect(store.dashboard('admission').status).toBe('loading');

    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/admission`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-01T00:00:00Z',
      payload: { funnelStages: [{ stage: 'Applied', count: 100 }] },
    });

    const slot = store.dashboard('admission');
    expect(slot.status).toBe('loaded');
    expect(slot.response?.payload).toEqual({ funnelStages: [{ stage: 'Applied', count: 100 }] });
  });

  it('marks a domain errored on a failed fetch, preserving the previous response', () => {
    store.loadDashboard('financial');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/financial`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-01T00:00:00Z',
      payload: { collectionRatePercent: 87 },
    });

    store.loadDashboard('financial');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/financial`)
      .flush(null, { status: 500, statusText: 'Server Error' });

    const slot = store.dashboard('financial');
    expect(slot.status).toBe('error');
    expect(slot.errorMessage).toBeTruthy();
    expect(slot.response?.payload).toEqual({ collectionRatePercent: 87 });
  });

  it('keeps different domains independent', () => {
    store.loadDashboard('hostel');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/hostel`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });

    expect(store.dashboard('hostel').status).toBe('loaded');
    expect(store.dashboard('academic').status).toBe('idle');
  });
});
