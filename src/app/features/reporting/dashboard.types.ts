/**
 * ADMIN-9: hand-written types against `ums-core`'s real Reporting module (`Reporting` has ZERO
 * generated-client coverage in `@ums/shared` -- confirmed, not guessed). Route/response envelope
 * shape confirmed directly from `UMS.Modules.Reporting.Api`'s `DashboardEndpoints.cs` source:
 * `GET /api/v1/reporting/dashboards/{domain}` -> `DashboardResponse(Status, DataAsOf, Payload)`,
 * where `Payload` is an opaque `JsonElement` -- ums-core does NOT type the per-dashboard payload
 * shape at the API boundary; each dashboard family's own `MetricRefreshJob` decides its own JSON
 * shape server-side, computed on a schedule, not per-request.
 */
export type DashboardDomain =
  | 'academic'
  | 'admission'
  | 'financial'
  | 'faculty'
  | 'hostel'
  | 'library'
  | 'content'
  | 'alumni'
  | 'career';

export type DashboardComputationStatus = 'NeverComputed' | 'Computed';

export interface DashboardResponse<TPayload = unknown> {
  readonly status: DashboardComputationStatus;
  /** Confirmed real field: null exactly when `status === 'NeverComputed'`. */
  readonly dataAsOf: string | null;
  readonly payload: TPayload | null;
}

/**
 * ASSUMED/INTERIM payload shapes below -- this app's own best-effort guess at each dashboard
 * family's field names, matching requirement-spec.md §7's own named examples ("enrollment
 * funnel, collection rate, occupancy, GPA distribution"), NOT independently confirmed against a
 * live backend's actual computed JSON (the payload is opaque at the API boundary, so there is
 * nothing to confirm it against without a running Reporting worker that has actually computed
 * one). Every field is optional and every consumer must render a graceful "no data" state when
 * absent, per this file's own flagged-gap discipline -- never assume a field is present.
 */
export interface AdmissionDashboardPayload {
  readonly funnelStages?: readonly { readonly stage: string; readonly count: number }[];
}

export interface FinancialDashboardPayload {
  readonly collectionRatePercent?: number;
  readonly outstandingAmount?: number;
  readonly currency?: string;
}

export interface HostelDashboardPayload {
  readonly occupancyPercent?: number;
  readonly occupiedBeds?: number;
  readonly totalBeds?: number;
}

export interface AcademicDashboardPayload {
  readonly gpaBuckets?: readonly { readonly bucket: string; readonly count: number }[];
}
