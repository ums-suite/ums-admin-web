import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ReportingDashboardsComponent } from './reporting-dashboards.component';

describe('ReportingDashboardsComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingDashboardsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders no tiles when no dashboard permissions are granted', () => {
    const fixture = TestBed.createComponent(ReportingDashboardsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.reporting-dashboards__card').length).toBe(0);
  });

  it('renders and loads a permitted tile, showing its freshness once computed', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['reporting.dashboard.hostel'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(ReportingDashboardsComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.reporting-dashboards__card').length).toBe(1);

    fixture.componentInstance['load']('hostel');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/hostel`)
      .flush({
        status: 'Computed',
        dataAsOf: '2026-01-01T00:00:00Z',
        payload: { occupancyPercent: 82 },
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Computed');
  });

  it('renders a "never computed" badge honestly instead of fabricating data', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['reporting.dashboard.academic'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(ReportingDashboardsComponent);
    fixture.detectChanges();
    fixture.componentInstance['load']('academic');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/dashboards/academic`)
      .flush({ status: 'NeverComputed', dataAsOf: null, payload: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Never computed');
  });
});
