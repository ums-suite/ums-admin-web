import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AuditExplorerComponent } from './audit-explorer.component';

describe('AuditExplorerComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  function grantPermissions(permissions: readonly string[]): void {
    const svc = TestBed.inject(PermissionsService);
    svc.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions,
      scopeGrants: [],
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditExplorerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl, jobPollIntervalMs: 5 },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('runs a query with skip/take pagination and stamps a freshness label', () => {
    grantPermissions(['audit.entry.read']);
    const fixture = TestBed.createComponent(AuditExplorerComponent);
    fixture.detectChanges();

    fixture.componentInstance['entityType'].set('User');
    fixture.componentInstance['runQuery']();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/audit/entries` && r.params.get('entityType') === 'User',
    );
    expect(req.request.params.get('skip')).toBe('0');
    req.flush({ items: [], totalCount: 0, skip: 0, take: 50 });
    fixture.detectChanges();

    expect(fixture.componentInstance['store'].lastQueriedAt()).toBeTruthy();
  });

  it('warns on a wide date range and requires a second click to run anyway', () => {
    grantPermissions(['audit.entry.read']);
    const fixture = TestBed.createComponent(AuditExplorerComponent);
    fixture.detectChanges();

    fixture.componentInstance['onRangeChange']({ start: '2020-01-01', end: '2026-01-01' });
    expect(fixture.componentInstance['isWideRange']()).toBeTrue();

    fixture.componentInstance['runQuery']();
    httpMock.expectNone((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`);
    expect(fixture.componentInstance['wideRangeAcknowledged']()).toBeTrue();

    fixture.componentInstance['runQuery']();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({
        items: [],
        totalCount: 0,
        skip: 0,
        take: 50,
      });
  });

  it('submits an export and polls its status to a downloadable result', (done) => {
    grantPermissions(['audit.entry.read', 'audit.export.generate']);
    const fixture = TestBed.createComponent(AuditExplorerComponent);
    fixture.detectChanges();

    fixture.componentInstance['submitExport']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/audit/exports`).flush({
      id: 'exp-1',
      status: 'Pending',
      format: 'Csv',
      requestedAt: '2026-01-01T00:00:00Z',
      completedAt: null,
      downloadUrl: null,
      errorMessage: null,
    });

    setTimeout(() => {
      expect(fixture.componentInstance['isExporting']()).toBeTrue();
      const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/audit/exports/exp-1`);
      req.flush({
        id: 'exp-1',
        status: 'Completed',
        format: 'Csv',
        requestedAt: '2026-01-01T00:00:00Z',
        completedAt: '2026-01-01T00:01:00Z',
        downloadUrl: 'https://example.com/export.csv',
        errorMessage: null,
      });
      fixture.componentInstance.ngOnDestroy();
      done();
    }, 20);
  });
});
