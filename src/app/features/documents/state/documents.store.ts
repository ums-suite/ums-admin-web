import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import type { JobRunStatus, JobSnapshot } from '../../../shared/jobs/job.types';
import { DocumentsApi } from '../documents.api';
import type {
  BulkGenerationJobDto,
  CreateBulkGenerationRequest,
  CreateDocumentTemplateRequest,
  DigitalVerificationResultDto,
  DocumentTemplateDto,
  GeneratedDocumentDto,
  RevokeDocumentRequest,
} from '../documents.types';

interface DocumentsState {
  readonly documentsByOwnerId: Readonly<Record<string, readonly GeneratedDocumentDto[]>>;
  readonly currentDocument: GeneratedDocumentDto | null;
  readonly templates: readonly DocumentTemplateDto[];
  readonly currentTemplate: DocumentTemplateDto | null;
  readonly bulkJob: BulkGenerationJobDto | null;
  readonly verificationResult: DigitalVerificationResultDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: DocumentsState = {
  documentsByOwnerId: {},
  currentDocument: null,
  templates: [],
  currentTemplate: null,
  bulkJob: null,
  verificationResult: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-31 (fleshing out the ADMIN-17 ad hoc scaffold this store previously left as a placeholder,
 * per its own prior "fleshed out when ADMIN-31 lands" note): Document Templates, bulk generation
 * as a real async job, digital verification lookup, and the registry's presigned-download-url
 * gotcha -- `GET /documents` (list) always returns `downloadUrl: null`, only `getById` carries a
 * real, time-limited link once `status === 'Ready'`.
 */
export function toBulkGenerationJobStatus(status: BulkGenerationJobDto['status']): JobRunStatus {
  switch (status) {
    case 'Queued':
      return 'queued';
    case 'Processing':
      return 'running';
    case 'Completed':
    case 'CompletedWithErrors':
      return 'succeeded';
    case 'Failed':
      return 'failed';
    default:
      return 'running';
  }
}

export function toBulkGenerationSnapshot(
  job: BulkGenerationJobDto,
): JobSnapshot<BulkGenerationJobDto> {
  return {
    jobId: job.id,
    status: toBulkGenerationJobStatus(job.status),
    progressPercent:
      job.totalItems > 0 ? Math.round((job.completedCount / job.totalItems) * 100) : 0,
    message: `${job.completedCount}/${job.totalItems} completed, ${job.deadLetteredCount} dead-lettered.`,
    result: job,
  };
}

export const DocumentsStore = signalStore(
  { providedIn: 'root' },
  withState<DocumentsState>(initialState),
  withMethods((store, api = inject(DocumentsApi)) => ({
    loadForOwner(ownerId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listForOwner(ownerId).subscribe({
        next: (documents) =>
          patchState(store, {
            documentsByOwnerId: { ...store.documentsByOwnerId(), [ownerId]: documents },
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadById(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getById(id).subscribe({
        next: (currentDocument) => patchState(store, { currentDocument, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    revoke: (id: string, request: RevokeDocumentRequest) =>
      api.revoke(id, request).pipe(tap((doc) => patchState(store, { currentDocument: doc }))),

    loadTemplates(documentType?: string): void {
      api.listTemplates(documentType).subscribe({
        next: (templates) => patchState(store, { templates }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadCurrentTemplate(documentType: string): void {
      api.getCurrentTemplate(documentType).subscribe({
        next: (currentTemplate) => patchState(store, { currentTemplate }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    createTemplate: (request: CreateDocumentTemplateRequest) =>
      api
        .createTemplate(request)
        .pipe(
          tap((t) =>
            patchState(store, { templates: [t, ...store.templates()], currentTemplate: t }),
          ),
        ),

    submitBulkGeneration: (request: CreateBulkGenerationRequest) =>
      api.submitBulkGeneration(request).pipe(tap((job) => patchState(store, { bulkJob: job }))),
    fetchBulkGenerationJob: (id: string) =>
      api.getBulkGenerationJob(id).pipe(tap((job) => patchState(store, { bulkJob: job }))),

    verify(verificationId: string): void {
      patchState(store, { isLoading: true, error: null, verificationResult: null });
      api.verify(verificationId).subscribe({
        next: (verificationResult) => patchState(store, { verificationResult, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
  })),
);
