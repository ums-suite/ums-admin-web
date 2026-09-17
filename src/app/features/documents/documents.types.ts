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
  readonly downloadUrl: string | null;
}
