/**
 * ADMIN-33: hand-typed DTOs against `ums-core`'s real Reporting module's `RegulatoryReports`
 * sub-area (`Api/Endpoints/RegulatoryReportDefinitionEndpoints.cs` /
 * `RegulatoryReportRunEndpoints.cs`), confirmed real by this build pass's own dedicated research
 * pass (not guessed) -- distinct from `dashboard.types.ts`'s own Dashboard-tile DTOs.
 *
 * **Confirmed real, load-bearing facts**:
 * - Listing/getting/creating/updating a `RegulatoryReportDefinition` is gated by
 *   `reporting.regulatory.manage` -- "it's an admin catalog, not user-facing." Submitting/polling
 *   a `RegulatoryReportRun` is a SEPARATE permission, `reporting.regulatory.run`. This is a real
 *   gap this app flags rather than papers over: a caller holding only `reporting.regulatory.run`
 *   cannot browse the definitions catalog to pick one from from this screen -- they would need a
 *   definition id from elsewhere (e.g. shared out of band).
 * - No preview/dry-run endpoint exists anywhere -- "live preview" is built entirely client-side
 *   from a definition's own `fieldSelections`/`filtersJson` metadata, never a real server call.
 * - `RegulatoryReportFormat` is a flags enum: `Pdf`, `Csv`, `Excel`. **Excel is a declarable enum
 *   value but is NOT implemented** -- a run requesting it deterministically fails server-side
 *   ("Excel-format regulatory report generation is not implemented in this build"); this app
 *   never offers Excel as a run format choice, only ever Pdf/Csv, regardless of what a
 *   definition's own `supportedFormats` string claims.
 * - There is no download-URL field on the run status DTO itself: a PDF result's `resultDocumentId`
 *   must be looked up via the Documents module's own `GET /api/v1/documents/{id}` (this app's
 *   existing `DocumentsApi.getById`) to get a real, time-limited presigned `downloadUrl`. A CSV
 *   result's `resultCsvContent` is the raw CSV text inline -- there is no separate download URL for
 *   CSV; this app builds a client-side Blob download from that text.
 */
export type RegulatoryReportCategory =
  | 'StudentEnrollment'
  | 'GenderDistribution'
  | 'ProgramStatistics'
  | 'FacultyStaffStatistics'
  | 'Graduation'
  | 'AcademicPerformance'
  | 'Research'
  | 'FinancialInformation'
  | 'Infrastructure'
  | 'Scholarships'
  | 'InternationalStudents';

/** Only Pdf/Csv are ever offered as a RUN format choice by this app -- see class doc. */
export type RegulatoryReportRunFormat = 'Pdf' | 'Csv';

export interface RegulatoryReportFieldSelection {
  readonly fieldKey: string;
  readonly label: string;
  readonly ordinal: number;
}

export interface RegulatoryReportDefinitionSummary {
  readonly id: string;
  readonly name: string;
  readonly category: RegulatoryReportCategory | string;
  readonly fieldSelections: readonly RegulatoryReportFieldSelection[];
  readonly filtersJson: string | null;
  readonly sourceQueryReferencesJson: string | null;
  /** A flags enum serialized as a comma-joined string, e.g. `"Pdf, Csv"`. */
  readonly supportedFormats: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RegulatoryReportDefinitionPage {
  readonly items: readonly RegulatoryReportDefinitionSummary[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface RegulatoryReportFieldInput {
  readonly fieldKey: string;
  readonly label: string;
}

export interface CreateRegulatoryReportDefinitionRequest {
  readonly name: string;
  readonly category: RegulatoryReportCategory | string;
  readonly fields: readonly RegulatoryReportFieldInput[];
  readonly filtersJson?: string | null;
  readonly sourceQueryReferencesJson?: string | null;
  readonly supportedFormats: string;
}

export type UpdateRegulatoryReportDefinitionRequest = Omit<
  CreateRegulatoryReportDefinitionRequest,
  'category'
>;

export interface EnqueueRegulatoryReportRunRequest {
  readonly parametersJson: string | null;
  readonly format: RegulatoryReportRunFormat | string;
}

/** `inFlightDuplicateRunId` is a courtesy dup notice only -- it never blocks the new run. */
export interface EnqueueRegulatoryReportRunResult {
  readonly runId: string;
  readonly inFlightDuplicateRunId: string | null;
}

export type RegulatoryReportRunStatus = 'Pending' | 'Running' | 'Completed' | 'Failed';

export interface RegulatoryReportRunStatusDto {
  readonly runId: string;
  readonly definitionId: string;
  readonly status: RegulatoryReportRunStatus | string;
  readonly format: RegulatoryReportRunFormat | string;
  readonly requestedAt: string;
  readonly dataAsOf: string | null;
  readonly completedAt: string | null;
  /** PDF only. */
  readonly resultDocumentId: string | null;
  /** CSV only -- the raw CSV text, inline. */
  readonly resultCsvContent: string | null;
  readonly errorMessage: string | null;
}
