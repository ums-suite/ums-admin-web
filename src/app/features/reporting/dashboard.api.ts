import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type { DashboardDomain, DashboardResponse } from './dashboard.types';

/**
 * ADMIN-9: hand-written typed client for `ums-core`'s real Reporting `DashboardMetric` read
 * models -- `Reporting` has no generated-client coverage in `@ums/shared` at all (confirmed by
 * reading the vendored client's own type surface), so every call here is written by hand against
 * the real backend route confirmed in `UMS.Modules.Reporting.Api`'s `DashboardEndpoints.cs`:
 * `GET /api/v1/reporting/dashboards/{academic|admission|financial|faculty|hostel|library|
 * content|alumni|career}`, each independently permission-gated server-side
 * (`reporting.dashboard.<domain>`).
 */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  getDashboard<TPayload>(domain: DashboardDomain): Observable<DashboardResponse<TPayload>> {
    return this.http.get<DashboardResponse<TPayload>>(
      `${this.appConfig.apiBaseUrl}/api/v1/reporting/dashboards/${domain}`,
    );
  }
}
