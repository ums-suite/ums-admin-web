import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { StudentRecordsStore } from './student-records.store';

describe('StudentRecordsStore', () => {
  let store: InstanceType<typeof StudentRecordsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const student = {
    id: 's1',
    studentNumber: 'STU-1',
    departmentId: 'd1',
    programId: 'p1',
    givenName: 'Jane',
    familyName: 'Doe',
    givenNameBn: null,
    familyNameBn: null,
    email: 'jane@x.com',
    mobile: null,
    dateOfBirth: '2000-01-01',
    nationalId: null,
    status: 'Enrolled',
    identityUserId: null,
    idCardDocumentId: null,
    contactEmail: null,
    contactPhone: null,
    photoUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
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
    store = TestBed.inject(StudentRecordsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a student by id', () => {
    store.loadStudent('s1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/s1`).flush(student);
    expect(store.currentStudent()).toEqual(student);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error when loading fails', () => {
    store.loadStudent('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('changes status and updates the current student', () => {
    let result: unknown;
    store
      .changeStatus('s1', { status: 'Active', reason: 'Orientation complete', version: 1 })
      .subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/s1/status`);
    expect(req.request.body).toEqual({
      status: 'Active',
      reason: 'Orientation complete',
      version: 1,
    });
    req.flush({ ...student, status: 'Active', version: 2 });

    expect(result).toEqual({ ...student, status: 'Active', version: 2 });
    expect(store.currentStudent()).toEqual({ ...student, status: 'Active', version: 2 });
  });

  it('propagates a 409 conflict to the caller rather than swallowing it', () => {
    let caught: unknown;
    store
      .changeStatus('s1', { status: 'Active', reason: 'Orientation complete', version: 1 })
      .subscribe({ error: (e) => (caught = e) });

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1/status`)
      .flush(
        { currentState: { ...student, status: 'Suspended', version: 3 } },
        { status: 409, statusText: 'Conflict' },
      );

    expect(caught).toBeTruthy();
  });
});
