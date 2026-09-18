/**
 * ADMIN-17 (ad hoc, per `state/documents.store.ts`'s own scaffold note -- fleshed out properly by
 * ADMIN-31): hand-typed DTOs against `ums-core`'s real Documents module source
 * (`UMS.Modules.Documents.Application.Generation`). No generated `DocumentsApiService` exists in
 * `@ums/shared` (same confirmed gap as Admission/Student).
 *
 * `OwnerId` is checked against the CALLER's own identity-user id for a self-service caller
 * (`ListDocumentsService`'s own `ownerId != callerUserId` check, confirmed real) -- so for a
 * Student's own generated documents, `ownerId` is that Student's `identityUserId`, never their
 * `StudentId`. A staff caller holding `document.read`/`document.generate` bypasses that check
 * entirely (`callerCanReadAny`), but this app still passes the Student's `identityUserId` as
 * `ownerId` for consistency with the self-service meaning of the field, flagged here since it is
 * this app's own best-effort reading of an otherwise-undocumented convention.
 *
 * `SourceReferenceId`'s exact per-document-type meaning is not specified beyond "the record this
 * document is about" -- this app's Student 360 trigger passes the Student's own id, the only
 * record consistently available from that screen; flagged as a best-effort choice, not confirmed
 * against a specific `IdCard`/`Certificate`/`Transcript` generation handler's own expectations.
 */
export type DocumentType =
  | 'AdmitCard'
  | 'MeritList'
  | 'Transcript'
  | 'Certificate'
  | 'IdCard'
  | 'Receipt'
  | 'RegulatoryReport';

export interface GenerateDocumentRequest {
  readonly ownerId: string;
  readonly documentType: DocumentType;
  readonly sourceReferenceId: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly language: string | null;
}

export interface GeneratedDocumentDto {
  readonly id: string;
  readonly ownerId: string;
  readonly documentType: string;
  readonly sourceReferenceId: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly status: string;
  readonly digitalVerificationId: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly createdAt: string;
  readonly readyAt: string | null;
  readonly revokedAt: string | null;
  readonly revokedReason: string | null;
  readonly supersededByDocumentId: string | null;
  /**
   * Confirmed real gap (ADMIN-31): `GET /documents` (list) ALWAYS returns `null` here for every
   * row -- a real, time-limited presigned URL is only ever present on the single-record
   * `GET /documents/{id}` response, and only once `status === 'Ready'`. Never render this field
   * from a list response as if it were a real link.
   */
  readonly downloadUrl: string | null;
}

export type GeneratedDocumentStatus =
  'Pending' | 'Uploaded' | 'Ready' | 'Revoked' | 'Superseded' | 'Failed';

/**
 * ADMIN-31: Document Templates, bulk generation (as a real async job, reusing `shared/jobs/`),
 * public digital verification, and the presigned-download-url gotcha above -- all hand-typed
 * against `ums-core`'s real Documents module source, extending the ADMIN-17 ad hoc client above
 * rather than rewriting it.
 *
 * FLAGGED GAPS/ASSUMPTIONS:
 * - `BulkGenerationJobDto.status`'s exact literal values are this app's own best-effort guess
 *   (`Queued|Processing|Completed|CompletedWithErrors|Failed`), following the same shape as
 *   Student's own confirmed real `StudentBulkImportJobStatus` machine, not independently read off
 *   a C# enum for this specific job type.
 * - `GET /jobs/{id}` only exposes aggregate counters (`totalItems`/`completedCount`/
 *   `deadLetteredCount`) -- there is no per-item detail endpoint, so a per-row failure reason is
 *   never shown here, only the aggregate dead-letter count.
 */
export interface TemplateTranslationInput {
  readonly Language: string;
  readonly Title: string;
  readonly LabelsJson?: string | null;
}

export interface CreateDocumentTemplateRequest {
  readonly DocumentType: DocumentType | string;
  readonly LayoutAssetKey?: string | null;
  readonly Translations: readonly TemplateTranslationInput[];
}

export interface DocumentTemplateTranslationDto {
  readonly language: string;
  readonly title: string;
  readonly labelsJson: string | null;
}

export interface DocumentTemplateDto {
  readonly id: string;
  readonly documentType: DocumentType | string;
  readonly layoutAssetKey: string | null;
  readonly version: number;
  readonly translations: readonly DocumentTemplateTranslationDto[];
  readonly createdAt: string;
}

export interface BulkGenerationItemInput {
  readonly OwnerId: string;
  readonly SourceReferenceId: string;
  readonly Fields: Readonly<Record<string, string>>;
}

export interface CreateBulkGenerationRequest {
  readonly DocumentType: DocumentType | string;
  readonly Items: readonly BulkGenerationItemInput[];
}

/** ASSUMED `status` literal values -- see this file's own class doc. */
export interface BulkGenerationJobDto {
  readonly id: string;
  readonly documentType: DocumentType | string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly status:
    'Queued' | 'Processing' | 'Completed' | 'CompletedWithErrors' | 'Failed' | string;
  readonly totalItems: number;
  readonly completedCount: number;
  readonly deadLetteredCount: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

/**
 * Fully public/unauthenticated, rate-limited -- never carries an owner id or download link,
 * confirmed real (tickets.md).
 */
export interface DigitalVerificationResultDto {
  readonly digitalVerificationId: string;
  readonly documentType: DocumentType | string;
  readonly status: string;
  readonly isValid: boolean;
  readonly reason: string | null;
  readonly issuedAt: string | null;
  readonly readyAt: string | null;
}

export interface RevokeDocumentRequest {
  readonly Reason: string;
}
