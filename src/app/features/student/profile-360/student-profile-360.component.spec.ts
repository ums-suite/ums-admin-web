import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { StudentProfile360Component } from './student-profile-360.component';

describe('StudentProfile360Component', () => {
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
    status: 'Active',
    identityUserId: 'u1',
    idCardDocumentId: null,
    contactEmail: null,
    contactPhone: null,
    photoUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    version: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentProfile360Component],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ studentId: 's1' }) } },
        },
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
      permissions: ['document.document.generate', 'student.request.review'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(StudentProfile360Component);
    fixture.detectChanges();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/s1`).flush(student);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the student named by the route param', () => {
    const fixture = createAndLoad();
    expect(fixture.nativeElement.textContent).toContain('Jane');
  });

  it('switching to the Documents tab loads documents for the linked identity user', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['onTabChange'](4);
    httpMock
      .expectOne(
        (r) => r.url === `${apiBaseUrl}/api/v1/documents` && r.params.get('ownerId') === 'u1',
      )
      .flush([]);
    expect(fixture.componentInstance['selectedTabIndex']()).toBe(4);
  });

  it('switching to the Status History tab reads the Audit Log for this student', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['onTabChange'](5);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({
        items: [
          {
            id: 'a1',
            occurredAt: '2026-01-01T00:00:00Z',
            action: 'status_change',
            reason: 'Enrolled',
          },
        ],
      });
    expect(fixture.componentInstance['statusHistory']().length).toBe(1);
  });

  it('generates a document end to end and shows the audit-linked success toast', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['triggerDocumentGeneration']('IdCard');
    expect(confirmation.current()?.title).toBe('Generate IdCard');
    confirmation.confirm('Requested by registrar');

    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/generate`).flush({
      id: 'doc1',
      ownerId: 'u1',
      documentType: 'IdCard',
      sourceReferenceId: 's1',
      templateId: 't1',
      templateVersion: 1,
      status: 'Ready',
      digitalVerificationId: 'verify-1',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      createdAt: '2026-01-01T00:00:00Z',
      readyAt: '2026-01-01T00:00:00Z',
      revokedAt: null,
      revokedReason: null,
      supersededByDocumentId: null,
      downloadUrl: null,
    });
    httpMock
      .expectOne(
        (r) => r.url === `${apiBaseUrl}/api/v1/documents` && r.params.get('ownerId') === 'u1',
      )
      .flush([]);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('looks up a student request by id and approves it', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['lookupRequestId'].set('req1');
    fixture.componentInstance['loadStudentRequest']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/requests/req1`).flush({
      id: 'req1',
      studentId: 's1',
      requestType: 'IdReissue',
      details: 'Lost card',
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
    });

    fixture.componentInstance['approveRequest']();
    expect(confirmation.current()?.title).toBe('Approve student request');
    confirmation.confirm('Verified in person');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/requests/req1/approve`);
    expect(req.request.body).toEqual({ version: 1 });
    req.flush({
      id: 'req1',
      studentId: 's1',
      requestType: 'IdReissue',
      details: 'Lost card',
      status: 'Approved',
      reviewScopeNodeId: null,
      isAgainstOwnDepartmentHead: false,
      generatedDocumentId: null,
      decidedByUserId: null,
      decisionReason: null,
      submittedAt: '2026-01-01T00:00:00Z',
      decidedAt: '2026-01-02T00:00:00Z',
      fulfilledAt: null,
      version: 2,
    });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
  });

  it('does not reject a request without a reason', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['rejectRequest']();
    expect(confirmation.current()).toBeNull();
  });
});
