import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import {
  ReportingRegulatoryStore,
  toRegulatoryRunSnapshot,
  toRegulatoryRunStatus,
} from './reporting-regulatory.store';

describe('toRegulatoryRunStatus/toRegulatoryRunSnapshot', () => {
  it('maps every real run status to a shared JobRunStatus', () => {
    expect(toRegulatoryRunStatus('Pending')).toBe('queued');
    expect(toRegulatoryRunStatus('Running')).toBe('running');
    expect(toRegulatoryRunStatus('Completed')).toBe('succeeded');
    expect(toRegulatoryRunStatus('Failed')).toBe('failed');
  });

  it('surfaces errorMessage on a failed run snapshot', () => {
    const snapshot = toRegulatoryRunSnapshot({
      runId: 'run-1',
      definitionId: 'def-1',
      status: 'Failed',
      format: 'Pdf',
      requestedAt: '2026-01-01T00:00:00Z',
      dataAsOf: null,
      completedAt: '2026-01-01T00:01:00Z',
      resultDocumentId: null,
      resultCsvContent: null,
      errorMessage: 'Query timed out',
    });
    expect(snapshot.status).toBe('failed');
    expect(snapshot.error?.message).toBe('Query timed out');
  });
});

describe('ReportingRegulatoryStore', () => {
  let store: InstanceType<typeof ReportingRegulatoryStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const definition = {
    id: 'def-1',
    name: 'Gender Distribution',
    category: 'GenderDistribution',
    fieldSelections: [{ fieldKey: 'gender', label: 'Gender', ordinal: 0 }],
    filtersJson: null,
    sourceQueryReferencesJson: null,
    supportedFormats: 'Pdf, Csv',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(ReportingRegulatoryStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads definitions with page/pageSize params', () => {
    store.loadDefinitions(1, 10);
    const req = httpMock.expectOne(
      (r) => r.url === `${apiBaseUrl}/api/v1/reporting/regulatory-reports/definitions/`,
    );
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [definition], totalCount: 1, page: 1, pageSize: 10 });
    expect(store.definitions()).toEqual([definition]);
  });

  it('enqueues a run against a definition, format restricted to Pdf/Csv', () => {
    store.enqueueRun('def-1', { parametersJson: null, format: 'Csv' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/regulatory-reports/def-1/run`);
    expect(req.request.body).toEqual({ parametersJson: null, format: 'Csv' });
    req.flush({ runId: 'run-1', inFlightDuplicateRunId: null });
  });

  it('fetches run status and stores it as currentRun', () => {
    store.fetchRunStatus('run-1').subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/regulatory-report-runs/run-1`).flush({
      runId: 'run-1',
      definitionId: 'def-1',
      status: 'Completed',
      format: 'Csv',
      requestedAt: '2026-01-01T00:00:00Z',
      dataAsOf: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:01:00Z',
      resultDocumentId: null,
      resultCsvContent: 'a,b\n1,2',
      errorMessage: null,
    });
    expect(store.currentRun()?.resultCsvContent).toBe('a,b\n1,2');
  });

  it('surfaces an error message when loading definitions fails', () => {
    store.loadDefinitions();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/reporting/regulatory-reports/definitions/`)
      .flush(null, { status: 403, statusText: 'Forbidden' });
    expect(store.error()).toBeTruthy();
  });
});
