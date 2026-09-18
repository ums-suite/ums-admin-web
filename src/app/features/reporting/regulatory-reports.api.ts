import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  CreateRegulatoryReportDefinitionRequest,
  EnqueueRegulatoryReportRunRequest,
  EnqueueRegulatoryReportRunResult,
  RegulatoryReportDefinitionPage,
  RegulatoryReportDefinitionSummary,
  RegulatoryReportRunStatusDto,
  UpdateRegulatoryReportDefinitionRequest,
} from './regulatory-reports.types';

/**
 * ADMIN-33: hand-rolled thin client for `ums-core`'s Reporting `RegulatoryReports` sub-area --
 * see `regulatory-reports.types.ts`'s own doc for the confirmed permission split (definitions are
 * `reporting.regulatory.manage`-gated even for reads; runs are the separate
 * `reporting.regulatory.run`), the Excel-not-implemented gap, and the no-preview-endpoint gap.
 */
@Injectable({ providedIn: 'root' })
export class RegulatoryReportsApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/reporting`;
  }

  // ---- Definitions -- gated by reporting.regulatory.manage, including reads ----

  listDefinitions(page = 1, pageSize = 20): Observable<RegulatoryReportDefinitionPage> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<RegulatoryReportDefinitionPage>(
      `${this.baseUrl}/regulatory-reports/definitions/`,
      { params },
    );
  }

  getDefinition(id: string): Observable<RegulatoryReportDefinitionSummary> {
    return this.http.get<RegulatoryReportDefinitionSummary>(
      `${this.baseUrl}/regulatory-reports/definitions/${id}`,
    );
  }

  createDefinition(
    request: CreateRegulatoryReportDefinitionRequest,
  ): Observable<RegulatoryReportDefinitionSummary> {
    return this.http.post<RegulatoryReportDefinitionSummary>(
      `${this.baseUrl}/regulatory-reports/definitions/`,
      request,
    );
  }

  updateDefinition(
    id: string,
    request: UpdateRegulatoryReportDefinitionRequest,
  ): Observable<RegulatoryReportDefinitionSummary> {
    return this.http.put<RegulatoryReportDefinitionSummary>(
      `${this.baseUrl}/regulatory-reports/definitions/${id}`,
      request,
    );
  }

  // ---- Runs -- the separate reporting.regulatory.run permission ----

  enqueueRun(
    definitionId: string,
    request: EnqueueRegulatoryReportRunRequest,
  ): Observable<EnqueueRegulatoryReportRunResult> {
    return this.http.post<EnqueueRegulatoryReportRunResult>(
      `${this.baseUrl}/regulatory-reports/${definitionId}/run`,
      request,
    );
  }

  getRunStatus(runId: string): Observable<RegulatoryReportRunStatusDto> {
    return this.http.get<RegulatoryReportRunStatusDto>(
      `${this.baseUrl}/regulatory-report-runs/${runId}`,
    );
  }
}
