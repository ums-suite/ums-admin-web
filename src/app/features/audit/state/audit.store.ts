import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import type { JobRunStatus, JobSnapshot } from '../../../shared/jobs/job.types';
import { AuditApi } from '../audit.api';
import type {
  AuditEntryQuery,
  AuditExportRequestDto,
  AuditLogEntryDto,
  RequestAuditExportRequest,
} from '../audit.types';

interface AuditState {
  readonly entries: readonly AuditLogEntryDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
  readonly lastQueriedAt: Date | null;
  readonly exportRequest: AuditExportRequestDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: AuditState = {
  entries: [],
  totalCount: 0,
  skip: 0,
  take: 50,
  lastQueriedAt: null,
  exportRequest: null,
  isLoading: false,
  error: null,
};

export function toAuditExportStatus(status: AuditExportRequestDto['status']): JobRunStatus {
  switch (status) {
    case 'Pending':
      return 'queued';
    case 'Processing':
      return 'running';
    case 'Completed':
      return 'succeeded';
    case 'Failed':
      return 'failed';
    default:
      return 'running';
  }
}

export function toAuditExportSnapshot(
  request: AuditExportRequestDto,
): JobSnapshot<AuditExportRequestDto> {
  return {
    jobId: request.id,
    status: toAuditExportStatus(request.status),
    message: request.errorMessage ?? `Export ${request.status.toLowerCase()}.`,
    result: request,
    error: request.errorMessage ? { message: request.errorMessage } : undefined,
  };
}

/**
 * ADMIN-34 (fleshing out ADMIN-3's scaffold): the Audit Log explorer's real state -- filtered,
 * skip/take-paginated entry search, plus export request/poll (reusing `shared/jobs/`). Every
 * query stamps its own `lastQueriedAt` point-in-time snapshot -- design-decisions.md's
 * "Audit-Log Read-Consistency/Freshness-Snapshot Pattern": explicit, manual-refresh-only, never
 * auto-refreshed or live-pushed.
 */
export const AuditStore = signalStore(
  { providedIn: 'root' },
  withState<AuditState>(initialState),
  withMethods((store, api = inject(AuditApi)) => ({
    query(query: AuditEntryQuery): void {
      patchState(store, { isLoading: true, error: null });
      api.listEntries(query).subscribe({
        next: (page) =>
          patchState(store, {
            entries: page.items,
            totalCount: page.totalCount,
            skip: page.skip,
            take: page.take,
            lastQueriedAt: new Date(),
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    requestExport: (request: RequestAuditExportRequest) =>
      api.requestExport(request).pipe(tap((exportRequest) => patchState(store, { exportRequest }))),
    fetchExportStatus: (id: string) =>
      api.getExport(id).pipe(tap((exportRequest) => patchState(store, { exportRequest }))),
  })),
);
