import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyLeaveRequestsComponent } from './faculty-leave-requests.component';

describe('FacultyLeaveRequestsComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const request = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'leave-1',
    facultyMemberId: 'fac-1',
    requesterUserId: 'user-1',
    startDate: '2026-02-01',
    endDate: '2026-02-05',
    reason: 'Conference',
    localizedReason: 'Conference',
    status: 'Submitted',
    routedDirectlyToAuthority: false,
    supportingDocumentReference: null,
    createdAt: '2026-01-01T00:00:00Z',
    submittedAt: '2026-01-01T00:00:00Z',
    decidedAt: null,
    version: 1,
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyLeaveRequestsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('classifies a standard Submitted request as awaiting the Department Head', () => {
    const fixture = TestBed.createComponent(FacultyLeaveRequestsComponent);
    fixture.detectChanges();
    const instance = fixture.componentInstance;
    expect(instance['isAwaitingDepartmentHead'](request())).toBeTrue();
    expect(instance['isAwaitingAuthority'](request())).toBeFalse();
  });

  it('classifies a directly-routed Submitted request as awaiting the Authority', () => {
    const fixture = TestBed.createComponent(FacultyLeaveRequestsComponent);
    fixture.detectChanges();
    const instance = fixture.componentInstance;
    const routed = request({ routedDirectlyToAuthority: true });
    expect(instance['isAwaitingDepartmentHead'](routed)).toBeFalse();
    expect(instance['isAwaitingAuthority'](routed)).toBeTrue();
  });

  it('classifies a DeptHeadApproved request as awaiting the Authority', () => {
    const fixture = TestBed.createComponent(FacultyLeaveRequestsComponent);
    fixture.detectChanges();
    const instance = fixture.componentInstance;
    const deptApproved = request({ status: 'DeptHeadApproved' });
    expect(instance['isAwaitingAuthority'](deptApproved)).toBeTrue();
  });

  it('approves by department head end to end with an audit-linked success toast', () => {
    const fixture = TestBed.createComponent(FacultyLeaveRequestsComponent);
    fixture.detectChanges();
    fixture.componentInstance['facultyMemberId'].set('fac-1');
    fixture.componentInstance['loadRequests']();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/faculty/leave-requests`)
      .flush({ items: [request()], totalCount: 1, skip: 0, take: 50 });

    fixture.componentInstance['approveByDepartmentHead'](request());
    confirmation.confirm('approved');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/leave-requests/leave-1/approve/department-head`)
      .flush(request({ status: 'DeptHeadApproved', version: 2 }));
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
    expect(fixture.componentInstance['store'].requests()[0].status).toBe('DeptHeadApproved');
  });

  it('renders a version-conflict banner (not a raw error) when a decision 409s', () => {
    const fixture = TestBed.createComponent(FacultyLeaveRequestsComponent);
    fixture.detectChanges();
    fixture.componentInstance['facultyMemberId'].set('fac-1');
    fixture.componentInstance['loadRequests']();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/faculty/leave-requests`)
      .flush({ items: [request()], totalCount: 1, skip: 0, take: 50 });

    fixture.componentInstance['rejectByDepartmentHead'](request());
    confirmation.confirm('cannot approve');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/leave-requests/leave-1/reject/department-head`)
      .flush({ title: 'Conflict' }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance['conflict']()).toBeTrue();
  });

  it('reload after conflict clears the banner and reloads the list', () => {
    const fixture = TestBed.createComponent(FacultyLeaveRequestsComponent);
    fixture.detectChanges();
    fixture.componentInstance['facultyMemberId'].set('fac-1');
    fixture.componentInstance['conflict'].set(true);

    fixture.componentInstance['reloadAfterConflict']();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/faculty/leave-requests`)
      .flush({ items: [], totalCount: 0, skip: 0, take: 50 });

    expect(fixture.componentInstance['conflict']()).toBeFalse();
  });
});
