import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../core/config/app-config';
import { PermissionsService } from '../../core/auth/permissions/permissions.service';
import { DashboardComponent } from './dashboard.component';

/**
 * NOTE on chart components and `fixture.detectChanges()`: `@ums/design-system`'s own chart specs
 * (e.g. `progress-ring.component.spec.ts`) deliberately never call `fixture.detectChanges()` at
 * all, because rendering a real chart schedules an internal `effect()` (ECharts setup/resize)
 * that can still be pending when a later spec's `TestBed` tears the injector down, throwing
 * `NG0205` and disconnecting the whole Karma run -- a confirmed, pre-existing fragility in the
 * design system's chart family under Karma/Jasmine, not something this app's tests can fix.
 * Tests below that need to inspect a populated dashboard's numbers therefore read the component's
 * own computed signals directly (signals recompute independently of change detection) rather
 * than calling `detectChanges()` again after data that would render a real chart arrives; DOM
 * assertions only run against payload shapes that keep every tile on its empty-state branch.
 */
describe('DashboardComponent', () => {
  let httpMock: HttpTestingController;
  let permissions: PermissionsService;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    permissions = TestBed.inject(PermissionsService);
  });

  afterEach(() => httpMock.verify());

  function grantAll() {
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: [
        'reporting.dashboard.admission',
        'reporting.dashboard.financial',
        'reporting.dashboard.hostel',
        'reporting.dashboard.academic',
      ],
      scopeGrants: [],
    });
  }

  it('renders no tiles and fetches nothing when the caller holds none of the reporting.dashboard permissions', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    httpMock.expectNone(() => true);
    expect(fixture.nativeElement.querySelectorAll('.dashboard__tile').length).toBe(0);
  });

  it('renders all four tiles as empty-state when every dashboard is NeverComputed', () => {
    grantAll();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    for (const domain of ['admission', 'financial', 'hostel', 'academic']) {
      httpMock
        .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/${domain}`)
        .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    }
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.dashboard__tile').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Not yet computed');
    expect(fixture.nativeElement.textContent).toContain('No data yet');
  });

  it('shows the real "as of" freshness label for a Computed dashboard with an empty payload', () => {
    grantAll();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    // An empty payload keeps every tile on its empty-state branch (no chart renders) while still
    // exercising the real freshness-label formatting path for a genuinely Computed response.
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/admission`)
      .flush({ status: 'Computed', dataAsOf: '2026-01-01T00:00:00Z', payload: {} });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/financial`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/hostel`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/academic`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('As of');
  });

  it('resolves financialCollectionRate from a computed payload (read via signal, never re-rendered)', () => {
    grantAll();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    for (const domain of ['admission', 'hostel', 'academic']) {
      httpMock
        .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/${domain}`)
        .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    }
    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/financial`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-01T00:00:00Z',
      payload: { collectionRatePercent: 92 },
    });

    expect(fixture.componentInstance['financialCollectionRate']()).toBe(92);
  });

  it('resolves admission funnel categories/series and academic GPA categories/series from their payloads', () => {
    grantAll();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/admission`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-01T00:00:00Z',
      payload: {
        funnelStages: [
          { stage: 'Applied', count: 100 },
          { stage: 'Admitted', count: 40 },
        ],
      },
    });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/financial`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/hostel`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/academic`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-01T00:00:00Z',
      payload: { gpaBuckets: [{ bucket: '3.5-4.0', count: 12 }] },
    });

    expect(fixture.componentInstance['admissionFunnelCategories']()).toEqual([
      'Applied',
      'Admitted',
    ]);
    expect(fixture.componentInstance['admissionFunnelSeries']()).toEqual([
      { name: 'Applicants', data: [100, 40] },
    ]);
    expect(fixture.componentInstance['academicGpaCategories']()).toEqual(['3.5-4.0']);
    expect(fixture.componentInstance['academicGpaSeries']()).toEqual([
      { name: 'Students', data: [12] },
    ]);
  });

  it('resolves hostelOccupancy from a computed payload', () => {
    grantAll();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    for (const domain of ['admission', 'financial', 'academic']) {
      httpMock
        .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/${domain}`)
        .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    }
    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/hostel`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-01T00:00:00Z',
      payload: { occupancyPercent: 75 },
    });

    expect(fixture.componentInstance['hostelOccupancy']()).toBe(75);
  });

  it('refresh() re-fetches only the given domain', () => {
    grantAll();
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    for (const domain of ['admission', 'financial', 'hostel', 'academic']) {
      httpMock
        .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/${domain}`)
        .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    }

    fixture.componentInstance['refresh']('financial');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/financial`).flush({
      status: 'Computed',
      dataAsOf: '2026-01-02T00:00:00Z',
      payload: { collectionRatePercent: 50 },
    });

    expect(fixture.componentInstance['financialCollectionRate']()).toBe(50);
  });
});
