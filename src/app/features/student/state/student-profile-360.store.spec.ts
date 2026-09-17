import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { StudentProfile360Store } from './student-profile-360.store';

describe('StudentProfile360Store', () => {
  let store: InstanceType<typeof StudentProfile360Store>;
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
    status: 'Active',
    identityUserId: 'u1',
    idCardDocumentId: null,
    contactEmail: null,
    contactPhone: null,
    photoUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    version: 1,
  };

  const document = {
    id: 'doc1',
    ownerId: 'u1',
    documentType: 'IdCard',
    sourceReferenceId: 's1',
    templateId: 't1',
    templateVersion: 1,
    status: 'Ready',
    digitalVerificationId: 'verify-1',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    createdAt: '2026-01-01T00:00:00Z',
    readyAt: '2026-01-01T00:00:01Z',
    revokedAt: null,
    revokedReason: null,
    supersededByDocumentId: null,
    downloadUrl: 'https://x/doc1',
  };

  const request = {
    id: 'req1',
    studentId: 's1',
    requestType: 'IdReissue',
    details: 'Lost my card',
    status: 'Pending',
    reviewScopeNodeId: null,
    isAgainstOwnDepartmentHead: false,
    generatedDocumentId: null,
    decidedByUserId: null,
    decisionReason: null,
    submittedAt: '2026-01-01T00:00:00Z',
    decidedAt: null,
    fulfilledAt: null,
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
    store = TestBed.inject(StudentProfile360Store);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a student by id', () => {
    store.loadStudent('s1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/s1`).flush(student);
    expect(store.student()).toEqual(student);
  });

  it('surfaces an error when loading the student fails', () => {
    store.loadStudent('s1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/s1`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('loads documents for an owner', () => {
    store.loadDocuments('u1');
    httpMock
      .expectOne(
        (r) => r.url === `${apiBaseUrl}/api/v1/documents` && r.params.get('ownerId') === 'u1',
      )
      .flush([document]);
    expect(store.documents()).toEqual([document]);
  });

  it('surfaces a documents error without touching the main error signal', () => {
    store.loadDocuments('u1');
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/documents`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.documentsError()).toBeTruthy();
    expect(store.error()).toBeNull();
  });

  it('generates a document then refreshes the owner document list', () => {
    let result: unknown;
    store
      .generateDocument({
        ownerId: 'u1',
        documentType: 'IdCard',
        sourceReferenceId: 's1',
        fields: {},
        language: null,
      })
      .subscribe((d) => (result = d));

    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/generate`).flush(document);
    expect(result).toEqual(document);

    httpMock
      .expectOne(
        (r) => r.url === `${apiBaseUrl}/api/v1/documents` && r.params.get('ownerId') === 'u1',
      )
      .flush([document]);
    expect(store.documents()).toEqual([document]);
  });

  it('loads a student request by id', () => {
    store.loadStudentRequest('req1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/requests/req1`).flush(request);
    expect(store.studentRequest()).toEqual(request);
  });

  it('approves a student request', () => {
    store.approveStudentRequest('req1', 1).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/requests/req1/approve`);
    expect(req.request.body).toEqual({ version: 1 });
    req.flush({ ...request, status: 'Approved' });
    expect(store.studentRequest()?.status).toBe('Approved');
  });

  it('rejects a student request with a reason', () => {
    store.rejectStudentRequest('req1', 'Not eligible', 1).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/requests/req1/reject`);
    expect(req.request.body).toEqual({ reason: 'Not eligible', version: 1 });
    req.flush({ ...request, status: 'Rejected' });
    expect(store.studentRequest()?.status).toBe('Rejected');
  });
});
