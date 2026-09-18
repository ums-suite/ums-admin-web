import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  AuditEntryQuery,
  AuditExportRequestDto,
  AuditLogEntryDto,
  AuditLogEntryListPage,
  RequestAuditExportRequest,
} from './audit.types';

/**
 * ADMIN-34: hand-rolled, strongly-typed client for `ums-core`'s real Audit module -- see
 * `audit.types.ts`'s own doc for the confirmed skip/take pagination shape, the read-only
 * guarantee, and the separate `audit.export.generate` permission for export.
 */
@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/audit`;
  }

  listEntries(query: AuditEntryQuery): Observable<AuditLogEntryListPage> {
    let params = new HttpParams();
    if (query.entityType) params = params.set('entityType', query.entityType);
    if (query.entityId) params = params.set('entityId', query.entityId);
    if (query.actorId) params = params.set('actorId', query.actorId);
    if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
    if (query.dateTo) params = params.set('dateTo', query.dateTo);
    if (query.action) params = params.set('action', query.action);
    if (query.application) params = params.set('application', query.application);
    params = params.set('skip', query.skip ?? 0).set('take', query.take ?? 50);
    return this.http.get<AuditLogEntryListPage>(`${this.baseUrl}/entries`, { params });
  }

  getEntry(id: string): Observable<AuditLogEntryDto> {
    return this.http.get<AuditLogEntryDto>(`${this.baseUrl}/entries/${id}`);
  }

  getEntityHistory(entityType: string, entityId: string): Observable<readonly AuditLogEntryDto[]> {
    return this.http.get<readonly AuditLogEntryDto[]>(
      `${this.baseUrl}/entities/${entityType}/${entityId}/history`,
    );
  }

  requestExport(request: RequestAuditExportRequest): Observable<AuditExportRequestDto> {
    return this.http.post<AuditExportRequestDto>(`${this.baseUrl}/exports`, request);
  }

  getExport(id: string): Observable<AuditExportRequestDto> {
    return this.http.get<AuditExportRequestDto>(`${this.baseUrl}/exports/${id}`);
  }
}
