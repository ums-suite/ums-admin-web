import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type { GenerateDocumentRequest, GeneratedDocumentDto } from './documents.types';

/**
 * ADMIN-17 (ad hoc client, see `documents.types.ts`'s own doc; ADMIN-31 flesh-out is tracked
 * separately). Every route confirmed real against `UMS.Modules.Documents.Api.Endpoints.*`.
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

  listForOwner(ownerId: string): Observable<readonly GeneratedDocumentDto[]> {
    return this.http.get<readonly GeneratedDocumentDto[]>(this.baseUrl, {
      params: { ownerId },
    });
  }
}
