import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyMembersStore } from './faculty-members.store';

describe('FacultyMembersStore', () => {
  let store: InstanceType<typeof FacultyMembersStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const member = {
    id: 'fac-1',
    userId: 'user-1',
    employeeId: 'EMP-1',
    departmentId: 'dept-1',
    designationId: 'desig-1',
    employmentType: 'FullTime',
    status: 'Active',
    isDepartmentHead: false,
    contactEmail: null,
    contactPhone: null,
    joiningDate: '2020-01-01',
    createdAt: '2020-01-01T00:00:00Z',
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
    store = TestBed.inject(FacultyMembersStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a member by id', () => {
    store.loadMember('fac-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(member);
    expect(store.currentMember()).toEqual(member);
  });

  it('surfaces an error when loading a member fails', () => {
    store.loadMember('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('lists members by department', () => {
    store.loadMembersByDepartment('dept-1');
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/faculty/members/` &&
        r.params.get('departmentId') === 'dept-1',
    );
    req.flush({ items: [member], totalCount: 1, skip: 0, take: 50 });
    expect(store.membersByDepartment()).toEqual([member]);
  });

  it('onboards a member', () => {
    store
      .onboardMember({
        userId: 'user-1',
        employeeId: 'EMP-1',
        departmentId: 'dept-1',
        designationId: 'desig-1',
        employmentType: 'FullTime',
        isDepartmentHead: false,
        contactEmail: null,
        contactPhone: null,
        joiningDate: '2020-01-01',
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/`).flush(member);
    expect(store.currentMember()).toEqual(member);
  });

  it('updates employment details', () => {
    const updated = { ...member, designationId: 'desig-2', version: 2 };
    store
      .updateEmploymentDetails('fac-1', {
        departmentId: 'dept-1',
        designationId: 'desig-2',
        employmentType: 'FullTime',
        isDepartmentHead: false,
        contactEmail: null,
        contactPhone: null,
        version: 1,
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(updated);
    expect(store.currentMember()).toEqual(updated);
  });

  it('changes status', () => {
    const updated = { ...member, status: 'OnLeave', version: 2 };
    store.changeStatus('fac-1', { status: 'OnLeave', version: 1 }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/status`).flush(updated);
    expect(store.currentMember()).toEqual(updated);
  });
});
