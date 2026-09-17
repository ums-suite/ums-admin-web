import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  ApproveStudentRequestBody,
  ChangeStudentStatusRequest,
  RejectStudentRequestBody,
  StudentBulkImportJobDto,
  StudentBulkImportJobReportDto,
  StudentDto,
  StudentRequestDto,
  UploadStudentBulkImportRequest,
} from './student.types';

/**
 * ADMIN-15/ADMIN-16/ADMIN-17: hand-rolled thin client for `ums-core`'s Student module -- see
 * `student.types.ts`'s own doc for the confirmed absence of a generated `StudentApiService` and
 * the three confirmed backend gaps (no search/list, no admin create, no department/program
 * reassignment endpoint) this app's UI works around by being honest about them, not silent.
 */
@Injectable({ providedIn: 'root' })
export class StudentApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/student`;
  }

  getStudentById(id: string): Observable<StudentDto> {
    return this.http.get<StudentDto>(`${this.baseUrl}/students/${id}`);
  }

  /**
   * A `409` response body is the confirmed real {@link import('./student.types').StudentStatusConflict}
   * shape (`{ currentState }`), not a `UmsProblemDetails` -- callers must inspect the raw
   * `HttpErrorResponse.error` on a caught 409 rather than relying on `toUmsApiError` for this one
   * call, per `StudentStatusEndpoints`'s own documented deviation from the platform's usual
   * `Result`/`Error` envelope.
   */
  changeStatus(id: string, request: ChangeStudentStatusRequest): Observable<StudentDto> {
    return this.http.post<StudentDto>(`${this.baseUrl}/students/${id}/status`, request);
  }

  uploadBulkImport(request: UploadStudentBulkImportRequest): Observable<StudentBulkImportJobDto> {
    return this.http.post<StudentBulkImportJobDto>(`${this.baseUrl}/students/bulk-import`, request);
  }

  approveBulkImport(jobId: string): Observable<StudentBulkImportJobDto> {
    return this.http.post<StudentBulkImportJobDto>(
      `${this.baseUrl}/students/bulk-import/${jobId}/approve`,
      {},
    );
  }

  getBulkImportReport(jobId: string): Observable<StudentBulkImportJobReportDto> {
    return this.http.get<StudentBulkImportJobReportDto>(
      `${this.baseUrl}/students/bulk-import/${jobId}`,
    );
  }

  /** No list/queue endpoint exists -- see `student.types.ts`'s own doc. */
  getStudentRequestById(id: string): Observable<StudentRequestDto> {
    return this.http.get<StudentRequestDto>(`${this.baseUrl}/students/requests/${id}`);
  }

  approveStudentRequest(
    id: string,
    body: ApproveStudentRequestBody,
  ): Observable<StudentRequestDto> {
    return this.http.post<StudentRequestDto>(
      `${this.baseUrl}/students/requests/${id}/approve`,
      body,
    );
  }

  rejectStudentRequest(id: string, body: RejectStudentRequestBody): Observable<StudentRequestDto> {
    return this.http.post<StudentRequestDto>(
      `${this.baseUrl}/students/requests/${id}/reject`,
      body,
    );
  }
}
