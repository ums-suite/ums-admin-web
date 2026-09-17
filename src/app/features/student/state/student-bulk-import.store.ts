import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { map } from 'rxjs';
import { StudentApi } from '../student.api';
import type {
  StudentBulkImportJobDto,
  StudentBulkImportJobReportDto,
  StudentBulkImportRowInput,
} from '../student.types';
import type { JobRunStatus, JobSnapshot } from '../../../shared/jobs/job.types';

interface StudentBulkImportState {
  readonly job: StudentBulkImportJobDto | null;
  readonly report: StudentBulkImportJobReportDto | null;
  readonly isUploading: boolean;
  readonly error: string | null;
}

const initialState: StudentBulkImportState = {
  job: null,
  report: null,
  isUploading: false,
  error: null,
};

/**
 * design-decisions.md's Bulk-Job Progress Mechanism, mapped onto the confirmed real
 * `StudentBulkImportJobStatus` machine: `Uploaded`/`Validated` (the caller is still at the
 * "Preview errors" step, before deciding to `Approve`) map to `'queued'`; `Approved`/`Processing`
 * map to `'running'`; both `Completed` AND `CompletedWithErrors` map to `'succeeded'`, since
 * requirement-spec.md §8 invariant #4/§9's own bulk-import edge case require a row-level error
 * report on partial failure, never an all-or-nothing rollback -- this job's own state machine has
 * no whole-job "Failed" state for exactly that reason; a row-level failure is a `Failed` ROW
 * inside an otherwise-`CompletedWithErrors` job, never a failed job.
 */
export function toJobStatus(status: StudentBulkImportJobDto['status']): JobRunStatus {
  switch (status) {
    case 'Uploaded':
    case 'Validated':
      return 'queued';
    case 'Approved':
    case 'Processing':
      return 'running';
    case 'Completed':
    case 'CompletedWithErrors':
      return 'succeeded';
  }
}

export function toJobSnapshot(
  report: StudentBulkImportJobReportDto,
): JobSnapshot<StudentBulkImportJobReportDto> {
  const { job } = report;
  const status = toJobStatus(job.status);
  return {
    jobId: job.id,
    status,
    progressPercent: job.totalRows > 0 ? Math.round((job.processedCount / job.totalRows) * 100) : 0,
    message: `${job.succeededCount} succeeded, ${job.failedCount} failed of ${job.totalRows} total rows.`,
    result: report,
  };
}

/**
 * ADMIN-16: Bulk student import as a real async job (requirement-spec.md §3.6, §8 invariant #4) --
 * Upload (synchronous validation) -> Preview errors -> Approve -> Process/poll -> final report,
 * reusing the shared `shared/jobs/` `JobPollerService` for the Approve-onward polling half (the
 * component owns the actual `JobPollerService.track` call so it can stop polling on destroy;
 * this store owns the upload/approve mutations and the latest fetched report).
 */
export const StudentBulkImportStore = signalStore(
  { providedIn: 'root' },
  withState<StudentBulkImportState>(initialState),
  withMethods((store, api = inject(StudentApi)) => ({
    upload(rows: readonly StudentBulkImportRowInput[]): void {
      patchState(store, { isUploading: true, error: null, job: null, report: null });
      api.uploadBulkImport({ rows }).subscribe({
        next: (job) => {
          patchState(store, { job, isUploading: false });
          api.getBulkImportReport(job.id).subscribe({
            next: (report) => patchState(store, { report }),
            error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
          });
        },
        error: (e: unknown) =>
          patchState(store, { isUploading: false, error: toUmsApiError(e).message }),
      });
    },
    approve: (jobId: string) =>
      api.approveBulkImport(jobId).pipe(
        map((job) => {
          patchState(store, { job });
          return job;
        }),
      ),
    fetchReport: (jobId: string) =>
      api.getBulkImportReport(jobId).pipe(
        map((report) => {
          patchState(store, { report, job: report.job });
          return report;
        }),
      ),
    reset(): void {
      patchState(store, initialState);
    },
  })),
);
