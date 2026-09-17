import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { StudentBulkImportComponent } from './student-bulk-import.component';
import type { StudentBulkImportJobDto, StudentBulkImportJobReportDto } from '../student.types';

describe('StudentBulkImportComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const job: StudentBulkImportJobDto = {
    id: 'job-1',
    requestedByUserId: 'u1',
    status: 'Validated',
    totalRows: 2,
    validRowCount: 1,
    invalidRowCount: 1,
    processedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    approvedAt: null,
    completedAt: null,
  };
  const report: StudentBulkImportJobReportDto = {
    job,
    rows: [
      { rowNumber: 1, status: 'Valid', errorMessage: null, resultStudentId: null },
      { rowNumber: 2, status: 'Invalid', errorMessage: 'Missing GivenName', resultStudentId: null },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentBulkImportComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        {
          provide: APP_CONFIG,
          useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl, jobPollIntervalMs: 5 },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  function csvFile(): File {
    const csv = ['givenName,familyName,email', 'Jane,Doe,jane@x.com', ',Smith,'].join('\n');
    return new File([csv], 'students.csv', { type: 'text/csv' });
  }

  it('parses a dropped CSV file and shows the parsed row count', (done) => {
    const fixture = TestBed.createComponent(StudentBulkImportComponent);
    fixture.detectChanges();

    const fileList = { item: () => csvFile(), length: 1 } as unknown as FileList;
    fixture.componentInstance['onFilesSelected'](fileList);

    setTimeout(() => {
      expect(fixture.componentInstance['parsedRows']().length).toBe(2);
      expect(fixture.componentInstance['selectedFileName']()).toBe('students.csv');
      done();
    }, 20);
  });

  it('does not upload when no rows have been parsed', () => {
    const fixture = TestBed.createComponent(StudentBulkImportComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitUpload']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/student/students/bulk-import`);
  });

  it('uploads parsed rows and fetches the resulting report', () => {
    const fixture = TestBed.createComponent(StudentBulkImportComponent);
    fixture.detectChanges();
    fixture.componentInstance['parsedRows'].set([
      {
        originatingApplicationId: null,
        studentNumber: null,
        expectedVersion: null,
        admissionYear: null,
        facultyCode: null,
        departmentId: null,
        programId: null,
        givenName: 'Jane',
        familyName: 'Doe',
        givenNameBn: null,
        familyNameBn: null,
        email: 'jane@x.com',
        mobile: null,
        dateOfBirth: null,
        nationalId: null,
        contactEmail: null,
        contactPhone: null,
        photoUrl: null,
      },
    ]);

    fixture.componentInstance['submitUpload']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import`).flush(job);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1`).flush(report);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Missing GivenName');
  });

  it('approves a job end to end, shows the audit-linked success toast, and starts polling', (done) => {
    const fixture = TestBed.createComponent(StudentBulkImportComponent);
    fixture.detectChanges();
    fixture.componentInstance['store'].upload([]);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import`).flush(job);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1`).flush(report);

    fixture.componentInstance['approve']();
    expect(confirmation.current()?.title).toBe('Approve bulk student import');
    confirmation.confirm('Reviewed the preview report');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1/approve`)
      .flush({ ...job, status: 'Approved' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');

    setTimeout(() => {
      expect(fixture.componentInstance['isTracking']()).toBeTrue();
      const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1`);
      req.flush({
        ...report,
        job: { ...job, status: 'Completed', processedCount: 2, succeededCount: 1, failedCount: 1 },
      });
      fixture.componentInstance.ngOnDestroy();
      done();
    }, 20);
  });

  it('startNewImport resets the store and the local upload state', () => {
    const fixture = TestBed.createComponent(StudentBulkImportComponent);
    fixture.detectChanges();
    fixture.componentInstance['selectedFileName'].set('students.csv');
    fixture.componentInstance['parsedRows'].set([]);

    fixture.componentInstance['startNewImport']();

    expect(fixture.componentInstance['selectedFileName']()).toBeNull();
    expect(fixture.componentInstance['store'].job()).toBeNull();
  });
});
