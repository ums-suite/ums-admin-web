import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import type { JobRunStatus, JobSnapshot } from '../../../shared/jobs/job.types';
import { RegulatoryReportsApi } from '../regulatory-reports.api';
import type {
  CreateRegulatoryReportDefinitionRequest,
  EnqueueRegulatoryReportRunRequest,
  RegulatoryReportDefinitionSummary,
  RegulatoryReportRunStatusDto,
} from '../regulatory-reports.types';

interface ReportingRegulatoryState {
  readonly definitions: readonly RegulatoryReportDefinitionSummary[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
  readonly currentRun: RegulatoryReportRunStatusDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: ReportingRegulatoryState = {
  definitions: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  currentRun: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-33: Regulatory report builder -- definitions catalog (gated `reporting.regulatory.manage`,
 * including reads) and run submit/poll (the separate `reporting.regulatory.run`). See
 * `regulatory-reports.types.ts`'s own doc for the confirmed real permission split, the
 * no-preview-endpoint gap (a "live preview" is built from a definition's own metadata, never a
 * server call), and why Excel is never offered as a run format.
 */
export function toRegulatoryRunStatus(
  status: RegulatoryReportRunStatusDto['status'],
): JobRunStatus {
  switch (status) {
    case 'Pending':
      return 'queued';
    case 'Running':
      return 'running';
    case 'Completed':
      return 'succeeded';
    case 'Failed':
      return 'failed';
    default:
      return 'running';
  }
}

export function toRegulatoryRunSnapshot(
  run: RegulatoryReportRunStatusDto,
): JobSnapshot<RegulatoryReportRunStatusDto> {
  return {
    jobId: run.runId,
    status: toRegulatoryRunStatus(run.status),
    message: run.errorMessage ?? `Run ${run.status.toLowerCase()}.`,
    result: run,
    error: run.errorMessage ? { message: run.errorMessage } : undefined,
  };
}

export const ReportingRegulatoryStore = signalStore(
  { providedIn: 'root' },
  withState<ReportingRegulatoryState>(initialState),
  withMethods((store, api = inject(RegulatoryReportsApi)) => ({
    loadDefinitions(page = 1, pageSize = 20): void {
      patchState(store, { isLoading: true, error: null });
      api.listDefinitions(page, pageSize).subscribe({
        next: (result) =>
          patchState(store, {
            definitions: result.items,
            totalCount: result.totalCount,
            page: result.page,
            pageSize: result.pageSize,
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createDefinition: (request: CreateRegulatoryReportDefinitionRequest) =>
      api
        .createDefinition(request)
        .pipe(tap((def) => patchState(store, { definitions: [def, ...store.definitions()] }))),

    enqueueRun: (definitionId: string, request: EnqueueRegulatoryReportRunRequest) =>
      api.enqueueRun(definitionId, request),
    fetchRunStatus: (runId: string) =>
      api.getRunStatus(runId).pipe(tap((currentRun) => patchState(store, { currentRun }))),
  })),
);
