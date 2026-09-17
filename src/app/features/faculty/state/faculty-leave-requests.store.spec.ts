import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyLeaveRequestsStore } from './faculty-leave-requests.store';

describe('FacultyLeaveRequestsStore', () => {
  let store: InstanceType<typeof FacultyLeaveRequestsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const request = {
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
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(FacultyLeaveRequestsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads leave requests by faculty member', () => {
    store.loadByFacultyMember('fac-1');
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/faculty/leave-requests` &&
        r.params.get('facultyMemberId') === 'fac-1',
    );
    req.flush({ items: [request], totalCount: 1, skip: 0, take: 50 });
    expect(store.requests()).toEqual([request]);
  });

  it('replaces a single request in place (item-level refresh)', () => {
    store.loadByFacultyMember('fac-1');
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/faculty/leave-requests`)
      .flush({ items: [request], totalCount: 1, skip: 0, take: 50 });

    const updated = { ...request, status: 'DeptHeadApproved', version: 2 };
    store.replaceRequest(updated);
    expect(store.requests()).toEqual([updated]);
  });

  it('approves by department head with the request version', () => {
    const updated = { ...request, status: 'DeptHeadApproved', version: 2 };
    let result: unknown;
    store.approveByDepartmentHead('leave-1', { version: 1 }).subscribe((r) => (result = r));
    const req = httpMock.expectOne(
      `${apiBaseUrl}/api/v1/faculty/leave-requests/leave-1/approve/department-head`,
    );
    expect(req.request.body).toEqual({ version: 1 });
    req.flush(updated);
    expect(result).toEqual(updated);
  });

  it('rejects by authority with a reason and version', () => {
    let result: unknown;
    store
      .rejectByAuthority('leave-1', { reason: 'insufficient coverage', version: 1 })
      .subscribe((r) => (result = r));
    const req = httpMock.expectOne(
      `${apiBaseUrl}/api/v1/faculty/leave-requests/leave-1/reject/authority`,
    );
    expect(req.request.body).toEqual({ reason: 'insufficient coverage', version: 1 });
    req.flush({ ...request, status: 'Rejected' });
    expect((result as { status: string }).status).toBe('Rejected');
  });
});
