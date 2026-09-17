import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyCourseAssignmentsStore } from './faculty-course-assignments.store';

describe('FacultyCourseAssignmentsStore', () => {
  let store: InstanceType<typeof FacultyCourseAssignmentsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const assignment = {
    id: 'assign-1',
    facultyMemberId: 'fac-1',
    courseOfferingId: 'off-1',
    status: 'Active',
    assignedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(FacultyCourseAssignmentsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads course assignments by faculty member', () => {
    store.loadByFacultyMember('fac-1');
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/faculty/course-assignments` &&
        r.params.get('facultyMemberId') === 'fac-1',
    );
    req.flush([assignment]);
    expect(store.assignments()).toEqual([assignment]);
  });

  it('surfaces an error on failure', () => {
    store.loadByFacultyMember('fac-1');
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/faculty/course-assignments`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
