/**
 * ADMIN-7 shared async-job/progress-tracking primitive (design-decisions.md "Bulk-Job Progress
 * Mechanism"). Deliberately generic over `TResult` so bulk student import (ADMIN-16), bulk
 * document generation, and large report exports can each plug their own terminal-result shape
 * into the same polling machinery ({@link JobPollerService}) rather than each module reinventing
 * queued/progress UI from scratch.
 *
 * ums-core has no single generic `GET /api/v1/jobs/{id}` endpoint today -- each async feature
 * exposes its own bespoke status resource (confirmed real examples: `GET
 * /student/bulk-import/{jobId}`, `GET /audit/exports/{id}`). A per-feature adapter is expected to
 * map that endpoint's own response into this shared {@link JobSnapshot} shape before handing a
 * fetch function to {@link JobPollerService.track} -- this type is the seam, not a claim that
 * ums-core has a matching literal endpoint for every consumer of it.
 */
export type JobRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface JobSnapshot<TResult = unknown> {
  readonly jobId: string;
  readonly status: JobRunStatus;
  /** 0-100. Purely informational -- never used to infer completion, see {@link isTerminalJobStatus}. */
  readonly progressPercent?: number;
  readonly message?: string;
  /** Present once `status` is `'succeeded'`. */
  readonly result?: TResult;
  /** Present once `status` is `'failed'`. */
  readonly error?: { readonly message: string; readonly code?: string };
}

/**
 * The one and only place "is this job done" is decided (design-decisions.md: "the UI renders
 * completion or failure only from an explicit terminal-status fetch, never inferred from a
 * locally-tracked progress percentage reaching 100%"). `progressPercent` reaching 100 is never
 * itself treated as terminal -- a job can legitimately report 100% while still finalizing
 * server-side (e.g. writing the last row's audit entry).
 */
export function isTerminalJobStatus(status: JobRunStatus): boolean {
  return status === 'succeeded' || status === 'failed';
}
