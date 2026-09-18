import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  BulkGenerationJobDto,
  CreateBulkGenerationRequest,
  CreateDocumentTemplateRequest,
  DigitalVerificationResultDto,
  DocumentTemplateDto,
  GenerateDocumentRequest,
  GeneratedDocumentDto,
  RevokeDocumentRequest,
} from './documents.types';

/**
 * ADMIN-17 (ad hoc client, see `documents.types.ts`'s own doc) extended by ADMIN-31 with
 * Templates, bulk generation (as a real async job), digital verification, the presigned-
 * download-url-only-on-GET-by-id gotcha, and revoke. Every route confirmed real against
 * `UMS.Modules.Documents.Api.Endpoints.*`.
 */
@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/documents`;
  }

  /** `Status === 'Ready'` responds `200`, otherwise `202 Accepted` -- both carry the same DTO body. */
  generate(request: GenerateDocumentRequest): Observable<GeneratedDocumentDto> {
    return this.http.post<GeneratedDocumentDto>(`${this.baseUrl}/generate`, request);
  }

  /** Always returns `downloadUrl: null` for every row -- see `documents.types.ts`'s own doc. */
  listForOwner(ownerId: string): Observable<readonly GeneratedDocumentDto[]> {
    return this.http.get<readonly GeneratedDocumentDto[]>(this.baseUrl, {
      params: { ownerId },
    });
  }

  /** The only call that carries a real, time-limited presigned `downloadUrl` (once `Ready`). */
  getById(id: string): Observable<GeneratedDocumentDto> {
    return this.http.get<GeneratedDocumentDto>(`${this.baseUrl}/${id}`);
  }

  revoke(id: string, request: RevokeDocumentRequest): Observable<GeneratedDocumentDto> {
    return this.http.post<GeneratedDocumentDto>(`${this.baseUrl}/${id}/revoke`, request);
  }

  // ---- Templates (document.template.manage) -- no edit/delete, publishing a new version is another POST ----

  createTemplate(request: CreateDocumentTemplateRequest): Observable<DocumentTemplateDto> {
    return this.http.post<DocumentTemplateDto>(`${this.baseUrl}/templates`, request);
  }

  listTemplates(documentType?: string): Observable<readonly DocumentTemplateDto[]> {
    let params = new HttpParams();
    if (documentType) params = params.set('documentType', documentType);
    return this.http.get<readonly DocumentTemplateDto[]>(`${this.baseUrl}/templates`, { params });
  }

  /** `documentType` is required server-side; returns the highest version. */
  getCurrentTemplate(documentType: string): Observable<DocumentTemplateDto> {
    const params = new HttpParams().set('documentType', documentType);
    return this.http.get<DocumentTemplateDto>(`${this.baseUrl}/templates/current`, { params });
  }

  // ---- Bulk generation (document.generate.bulk) -- a real async job, reuse shared/jobs/ ----

  submitBulkGeneration(request: CreateBulkGenerationRequest): Observable<BulkGenerationJobDto> {
    return this.http.post<BulkGenerationJobDto>(`${this.baseUrl}/generate-bulk`, request);
  }

  getBulkGenerationJob(id: string): Observable<BulkGenerationJobDto> {
    return this.http.get<BulkGenerationJobDto>(`${this.baseUrl}/jobs/${id}`);
  }

  // ---- Digital verification -- fully public, unauthenticated, rate-limited ----

  verify(verificationId: string): Observable<DigitalVerificationResultDto> {
    return this.http.get<DigitalVerificationResultDto>(`${this.baseUrl}/verify/${verificationId}`);
  }
}
