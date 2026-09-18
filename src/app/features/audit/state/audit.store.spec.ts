import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AuditStore, toAuditExportSnapshot, toAuditExportStatus } from './audit.store';

describe('toAuditExportStatus/toAuditExportSnapshot', () => {
  it('maps every real export status to a shared JobRunStatus', () => {
    expect(toAuditExportStatus('Pending')).toBe('queued');
    expect(toAuditExportStatus('Processing')).toBe('running');
    expect(toAuditExportStatus('Completed')).toBe('succeeded');
    expect(toAuditExportStatus('Failed')).toBe('failed');
  });

  it('surfaces errorMessage on a failed export snapshot', () => {
    const snapshot = toAuditExportSnapshot({
      id: 'exp-1',
      status: 'Failed',
      format: 'Csv',
      requestedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:01:00Z',
      downloadUrl: null,
      errorMessage: 'Range too wide',
    });
    expect(snapshot.status).toBe('failed');
    expect(snapshot.error?.message).toBe('Range too wide');
  });
});

describe('AuditStore', () => {
  let store: InstanceType<typeof AuditStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const entry = {
    id: 'entry-1',
    occurredAt: '2026-01-01T00:00:00Z',
    actorId: 'user-1',
    actorType: 'StaffUser',
    ipAddress: '10.0.0.1',
    application: 'ums-admin-web',
    entityType: 'User',
    entityId: 'u-1',
    action: 'status_change',
    beforeValue: '{"status":"Active"}',
    afterValue: '{"status":"Suspended"}',
    correlationId: 'corr-1',
    reason: 'Policy violation',
    organizationScopeId: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(AuditStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('queries entries with skip/take (not page/pageSize) and stamps a freshness timestamp', () => {
    const before = Date.now();
    store.query({ entityType: 'User', skip: 0, take: 50 });
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/audit/entries` && r.params.get('entityType') === 'User',
    );
    expect(req.request.params.get('skip')).toBe('0');
    expect(req.request.params.get('take')).toBe('50');
    req.flush({ items: [entry], totalCount: 1, skip: 0, take: 50 });

    expect(store.entries()).toEqual([entry]);
    expect(store.totalCount()).toBe(1);
    expect(store.lastQueriedAt()?.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('surfaces an error on a failed query', () => {
    store.query({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });

  it('requests an export and stores it, then polls its status', () => {
    store.requestExport({ format: 'Csv' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/audit/exports`).flush({
      id: 'exp-1',
      status: 'Pending',
      format: 'Csv',
      requestedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      downloadUrl: null,
      errorMessage: null,
    });
    expect(store.exportRequest()?.status).toBe('Pending');

    store.fetchExportStatus('exp-1').subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/audit/exports/exp-1`).flush({
      id: 'exp-1',
      status: 'Completed',
      format: 'Csv',
      requestedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:01:00Z',
      downloadUrl: 'https://example.com/export.csv',
      errorMessage: null,
    });
    expect(store.exportRequest()?.downloadUrl).toBe('https://example.com/export.csv');
  });
});
