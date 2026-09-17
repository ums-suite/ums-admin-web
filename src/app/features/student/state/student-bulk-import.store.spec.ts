import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { StudentBulkImportStore, toJobSnapshot, toJobStatus } from './student-bulk-import.store';
import type { StudentBulkImportJobDto, StudentBulkImportJobReportDto } from '../student.types';

describe('toJobStatus', () => {
  it('maps every confirmed real job status to a JobRunStatus', () => {
    expect(toJobStatus('Uploaded')).toBe('queued');
    expect(toJobStatus('Validated')).toBe('queued');
    expect(toJobStatus('Approved')).toBe('running');
    expect(toJobStatus('Processing')).toBe('running');
    expect(toJobStatus('Completed')).toBe('succeeded');
    expect(toJobStatus('CompletedWithErrors')).toBe('succeeded');
  });
});

describe('toJobSnapshot', () => {
  const job: StudentBulkImportJobDto = {
    id: 'job-1',
    requestedByUserId: 'u1',
    status: 'Processing',
    totalRows: 10,
    validRowCount: 8,
    invalidRowCount: 2,
    processedCount: 5,
    succeededCount: 4,
    failedCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    approvedAt: '2026-01-01T00:01:00Z',
    completedAt: null,
  };
  const report: StudentBulkImportJobReportDto = { job, rows: [] };

  it('computes progressPercent from processedCount/totalRows', () => {
    expect(toJobSnapshot(report).progressPercent).toBe(50);
  });

  it('reports zero progress when totalRows is zero, never dividing by zero', () => {
    const snap = toJobSnapshot({ job: { ...job, totalRows: 0 }, rows: [] });
    expect(snap.progressPercent).toBe(0);
  });

  it('carries the full report as the result on every fetch', () => {
    expect(toJobSnapshot(report).result).toBe(report);
  });
});

describe('StudentBulkImportStore', () => {
  let store: InstanceType<typeof StudentBulkImportStore>;
  let httpMock: HttpTestingController;
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(StudentBulkImportStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uploads rows, then fetches the resulting report', () => {
    store.upload([
      {
        originatingApplicationId: null,
        studentNumber: null,
        expectedVersion: null,
        admissionYear: null,
        facultyCode: null,
        departmentId: null,
        programId: null,
        givenName: null,
        familyName: null,
        givenNameBn: null,
        familyNameBn: null,
        email: null,
        mobile: null,
        dateOfBirth: null,
        nationalId: null,
        contactEmail: null,
        contactPhone: null,
        photoUrl: null,
      },
    ]);

    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import`).flush(job);
    expect(store.job()).toEqual(job);
    expect(store.isUploading()).toBeFalse();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1`).flush(report);
    expect(store.report()).toEqual(report);
  });

  it('surfaces an error when upload fails', () => {
    store.upload([]);
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import`)
      .flush(null, { status: 400, statusText: 'Bad Request' });
    expect(store.error()).toBeTruthy();
    expect(store.isUploading()).toBeFalse();
  });

  it('approves a job and updates state', () => {
    let result: unknown;
    store.approve('job-1').subscribe((j) => (result = j));
    const approved = { ...job, status: 'Approved' as const, approvedAt: '2026-01-01T00:05:00Z' };
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1/approve`)
      .flush(approved);
    expect(result).toEqual(approved);
    expect(store.job()).toEqual(approved);
  });

  it('fetches a report and updates both job and report state', () => {
    let result: unknown;
    store.fetchReport('job-1').subscribe((r) => (result = r));
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1`).flush(report);
    expect(result).toEqual(report);
    expect(store.report()).toEqual(report);
    expect(store.job()).toEqual(job);
  });

  it('resets to the initial state', () => {
    store.upload([]);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import`).flush(job);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/student/students/bulk-import/job-1`).flush(report);

    store.reset();
    expect(store.job()).toBeNull();
    expect(store.report()).toBeNull();
    expect(store.error()).toBeNull();
  });
});
