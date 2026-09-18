/**
 * ADMIN-34: hand-typed DTOs against `ums-core`'s real Audit module (`UMS.Modules.Audit`),
 * confirmed real by this build pass's own dedicated research (not guessed) -- distinct from the
 * loosely-typed generated `AuditApiService` in `@ums/shared` (used elsewhere in this app only for
 * the narrow "confirm my own mutation's audit entry" lookup, see
 * `shared/confirmation/audit-lookup.util.ts`) which types every response as `any`.
 *
 * **Confirmed real facts**:
 * - `GET /api/v1/audit/entries` is skip/take paginated (NOT page/pageSize), default `skip=0,
 *   take=50`, server-clamped to `take <= 200`. The response DOES include a total count.
 * - Genuinely read-only from this module's own API surface -- there is no create/update/delete
 *   HTTP endpoint anywhere; entries are written internally by other modules via
 *   `AuditRecorder`/`TransactionalAuditWriter`.
 * - No documented/enforced date-range-width limit server-side beyond the `take<=200` cap -- this
 *   app's own wide-date-range warning (edge-cases.md §9) is a client-side courtesy, not something
 *   the backend itself rejects.
 * - Export (`POST /exports`) is a SEPARATE permission (`audit.export.generate`) from reading
 *   entries (`audit.entry.read`) and returns a job-shaped resource polled via `GET /exports/{id}`
 *   -- reused here via the shared `shared/jobs/` polling primitive.
 */
export interface AuditLogEntryDto {
  readonly id: string;
  readonly occurredAt: string;
  readonly actorId: string;
  readonly actorType: string;
  readonly ipAddress: string | null;
  readonly application: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeValue: string | null;
  readonly afterValue: string | null;
  readonly correlationId: string;
  readonly reason: string | null;
  readonly organizationScopeId: string | null;
}

export interface AuditLogEntryListPage {
  readonly items: readonly AuditLogEntryDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}

export interface AuditEntryQuery {
  readonly entityType?: string;
  readonly entityId?: string;
  readonly actorId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly action?: string;
  readonly application?: string;
  readonly skip?: number;
  readonly take?: number;
}

export type AuditExportFormat = 'Csv' | 'Pdf';
export type AuditExportStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | string;

export interface RequestAuditExportRequest {
  readonly entityType?: string;
  readonly entityId?: string;
  readonly actorId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly action?: string;
  readonly application?: string;
  readonly format: AuditExportFormat;
}

export interface AuditExportRequestDto {
  readonly id: string;
  readonly status: AuditExportStatus;
  readonly format: AuditExportFormat;
  readonly requestedAt: string;
  readonly completedAt: string | null;
  readonly downloadUrl: string | null;
  readonly errorMessage: string | null;
}
