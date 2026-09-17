import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { StudentRecordsComponent } from './student-records.component';

describe('StudentRecordsComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  let permissions: PermissionsService;
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentRecordsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
    permissions = TestBed.inject(PermissionsService);
  });

  afterEach(() => httpMock.verify());

  function createAndLoad() {
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['student.status.change'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(StudentRecordsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupStudentId'].set('s1');
    fixture.componentInstance['loadStudent']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/s1`).flush(student);
    fixture.detectChanges();
    return fixture;
  }

  it('loads a student by id', () => {
    const fixture = createAndLoad();
    expect(fixture.nativeElement.textContent).toContain('Jane');
    expect(fixture.componentInstance['statusOptions']()).toEqual([
      { value: 'Active', label: 'Active' },
    ]);
  });

  it('shows a terminal-status note when no further transition is legal', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['lookupStudentId'].set('s1');
    fixture.componentInstance['loadStudent']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1`)
      .flush({ ...student, status: 'Graduated' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('terminal status');
  });

  it('changes status end to end and shows the audit-linked success toast', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['newStatus'].set('Active');
    fixture.componentInstance['submitStatusChange']();
    expect(confirmation.current()?.title).toBe('Change academic status');
    confirmation.confirm('Completed orientation');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/s1/status`);
    expect(req.request.body).toEqual({
      status: 'Active',
      reason: 'Completed orientation',
      version: 1,
    });
    req.flush({ ...student, status: 'Active', version: 2 });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
    expect(toast.toasts()[0].variant).toBe('success');
  });

  it('labels the Transferred option and titles the confirmation as a record transfer', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['lookupStudentId'].set('s1');
    fixture.componentInstance['loadStudent']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1`)
      .flush({ ...student, status: 'Active' });
    fixture.detectChanges();

    fixture.componentInstance['newStatus'].set('Transferred');
    fixture.componentInstance['submitStatusChange']();
    expect(confirmation.current()?.title).toBe('Transfer student record');
    confirmation.cancel();
  });

  it('renders the version-conflict banner on a 409, not a generic error toast', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['newStatus'].set('Active');
    fixture.componentInstance['submitStatusChange']();
    confirmation.confirm('Completed orientation');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1/status`)
      .flush(
        { currentState: { ...student, status: 'Suspended', version: 3 } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(fixture.componentInstance['conflict']()?.currentState.status).toBe('Suspended');
    expect(toast.toasts().length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Suspended');
  });

  it('reload after conflict re-fetches the student and clears the banner', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['newStatus'].set('Active');
    fixture.componentInstance['submitStatusChange']();
    confirmation.confirm('Completed orientation');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1/status`)
      .flush(
        { currentState: { ...student, status: 'Suspended', version: 3 } },
        { status: 409, statusText: 'Conflict' },
      );

    fixture.componentInstance['reloadAfterConflict']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1`)
      .flush({ ...student, status: 'Suspended', version: 3 });

    expect(fixture.componentInstance['conflict']()).toBeNull();
  });

  it('does not submit a status change without loading a student first', () => {
    const fixture = TestBed.createComponent(StudentRecordsComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitStatusChange']();
    expect(confirmation.current()).toBeNull();
  });
});
