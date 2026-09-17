/**
 * ADMIN-13/ADMIN-14: hand-typed DTOs against `ums-core`'s real Admission module source
 * (`UMS.Modules.Admission.Application.Campaigns`/`.Applications`) -- `@ums/shared`'s generated
 * client has NO `AdmissionApiService` at all today (confirmed: its contract snapshot only ever
 * covered Identity/Audit/Organization, per this app's own build notes). `admission.api.ts` calls
 * these routes directly via `HttpClient` against `APP_CONFIG.apiBaseUrl` instead of a generated
 * wrapper -- the app-wide interceptor chain (`core/http/provide-core-http.ts`) still applies to
 * every such call regardless of which client issues it.
 *
 * `DateOnly` fields serialize as plain `"YYYY-MM-DD"` strings (ASP.NET Core's default `DateOnly`
 * JSON converter) -- typed as `string` here to pair directly with `UmsDatePickerComponent`'s own
 * ISO-date `value`/`valueChange` contract.
 */
export interface CampaignDto {
  readonly id: string;
  readonly name: string;
  readonly programIds: readonly string[];
  readonly applicationWindowStart: string;
  readonly applicationWindowEnd: string;
  readonly applicationFeeType: string;
  readonly confirmationFeeType: string;
  readonly isConfigurationLocked: boolean;
  readonly requiredDocumentTypes: readonly string[];
}

export interface CreateCampaignRequest {
  readonly name: string;
  readonly programIds: readonly string[];
  readonly applicationWindowStart: string;
  readonly applicationWindowEnd: string;
  readonly applicationFeeType: string;
  readonly confirmationFeeType: string;
}

export interface EligibilityRuleRequest {
  readonly programId: string;
  readonly minimumScore: number;
  readonly isGpaScale: boolean;
  readonly requiredBoard: string | null;
}

export interface SeatQuotaRequest {
  readonly programId: string;
  readonly quota: number;
}

export interface RequiredDocumentRequest {
  readonly documentType: string;
}

export interface ProgramChoiceDto {
  readonly programId: string;
  readonly rank: number;
}

export interface ApplicationDocumentDto {
  readonly id: string;
  readonly documentType: string;
  readonly fileReference: string;
  readonly status: string;
  readonly rejectionReason: string | null;
}

/**
 * `AssignedTestSlotId`/`RollNumber`/`AdmitCardDocumentId` are populated automatically by
 * `AdmitCardService.AssignAndGenerateAsync` once an Application is Locked -- confirmed real
 * against `ums-core`'s source, there is NO manual "assign this application to a test slot" admin
 * endpoint. ADMIN-14's "admission-test assignment" is therefore surfaced here as a read-only
 * result of that automatic process, never a control this UI can trigger directly.
 */
export interface ApplicationDto {
  readonly id: string;
  readonly applicantId: string;
  readonly campaignId: string;
  readonly status: string;
  readonly applicationNumber: string | null;
  readonly programChoices: readonly ProgramChoiceDto[];
  readonly documents: readonly ApplicationDocumentDto[];
  readonly applicationFeeInvoiceId: string | null;
  readonly isApplicationFeePaid: boolean;
  readonly confirmationFeeInvoiceId: string | null;
  readonly isConfirmationFeePaid: boolean;
  readonly assignedTestSlotId: string | null;
  readonly rollNumber: string | null;
  readonly admitCardDocumentId: string | null;
}

export interface ResubmissionRequest {
  readonly reason: string;
}

// ---- ExamAttempt (ADMIN-19) -- hand-typed against `ums-core`'s real `ExamAttemptDto`. ----
// CONFIRMED GAP: no list/monitor endpoint exists for attempts under one AdmissionTest/exam window
// (only single-attempt `GET /exams/attempts/{id}`) -- "monitoring" here is honestly an id-based
// lookup workspace, the same interim mechanism already established for Student/Admission's own
// other confirmed no-list gaps. The DTO also omits `ProctoringSessionId`/`SeedValue`/`SubmittedAt`/
// `SubmissionSource`, which the real domain entity carries but never serializes.

export type ExamAttemptStatus = 'InProgress' | 'Submitted';
export type ExamAttemptEvaluationStatus = 'Pending' | 'Evaluated';
export type IntegrityFlagOutcome = 'Pending' | 'Cleared' | 'Confirmed';

export interface ExamAnswerDto {
  readonly questionId: string;
  readonly selectedOptionIndex: number | null;
  readonly subjectiveText: string | null;
}

export interface IntegrityFlagDto {
  readonly id: string;
  readonly anomalyType: string;
  readonly details: string;
  readonly confidenceScore: number;
  readonly outcome: IntegrityFlagOutcome | string;
}

export interface ExamAttemptDto {
  readonly id: string;
  readonly applicantId: string;
  readonly admissionTestId: string;
  readonly rollNumber: string;
  readonly status: ExamAttemptStatus | string;
  readonly startedAt: string;
  readonly expiresAt: string;
  readonly selectedQuestionIds: readonly string[];
  readonly answers: readonly ExamAnswerDto[];
  readonly evaluationStatus: ExamAttemptEvaluationStatus | string;
  readonly objectiveScore: number | null;
  readonly subjectiveScore: number | null;
  readonly integrityFlags: readonly IntegrityFlagDto[];
}

export interface RecordSubjectiveScoreRequest {
  readonly subjectiveScore: number;
}

export interface ReviewIntegrityFlagRequest {
  readonly outcome: 'Cleared' | 'Confirmed';
  readonly reviewNotes: string | null;
}

// ---- MeritList (ADMIN-19) -- hand-typed against `ums-core`'s real `MeritListDto`. ----
// CONFIRMED GAP: `Generate` blocks entirely (409 `merit_list.evaluation_incomplete`) unless every
// in-scope ExamAttempt is `Evaluated` -- there is no partial/provisional list, and no per-entry
// flag/reject/annotate endpoint. "Review" is simply an authorized GET before someone eligible
// calls `Approve`.

export type MeritListStatus = 'Draft' | 'Approved';
export type MeritOutcome = 'Admitted' | 'Waitlisted' | 'Rejected';

export interface MeritListEntryDto {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly programId: string;
  readonly score: number;
  readonly rank: number;
  readonly outcome: MeritOutcome | string;
  readonly waitlistRank: number | null;
}

export interface MeritListDto {
  readonly id: string;
  readonly campaignId: string;
  readonly status: MeritListStatus | string;
  readonly entries: readonly MeritListEntryDto[];
}

export interface PromoteWaitlistedRequest {
  readonly applicantId: string;
  readonly programId: string;
}

// ---- AdmissionResult (ADMIN-20) -- hand-typed against `ums-core`'s real `AdmissionResultDto`. ----
// Distinct from Academic's own `ResultPublication` (`academic.types.ts`) -- a separate aggregate
// scoped per-Campaign, but the ONLY one of the two Result-Publication-shaped entities in this app
// that has a real `GET` to bootstrap current state from (`by-campaign/{campaignId}`), which is why
// `admission-result-publication.component.ts` can drive `ResultPublicationWizard` from a real
// starting index while Academic's own screen (ADMIN-23) cannot -- see that component's own doc.
// All five transition endpoints share ONE permission, `admission.result.publish` -- there is no
// separate "propose" vs "approve" permission tier at the API-gate level, the multi-step-ness is a
// state-machine control, not a permission-tier control. No `version`/optimistic-concurrency field
// is exposed anywhere in this DTO -- concurrency is a server-side state-guarded conditional update.

export type AdmissionResultStatus =
  'Draft' | 'Calculated' | 'Verified' | 'Approved' | 'Publishing' | 'Published' | 'Archived';

export interface AdmissionResultEntryDto {
  readonly applicantId: string;
  readonly applicationId: string;
  readonly programId: string;
  readonly outcome: MeritOutcome | string;
  readonly meritRank: number;
  readonly waitlistRank: number | null;
}

export interface AdmissionResultDto {
  readonly id: string;
  readonly campaignId: string;
  readonly meritListId: string;
  readonly status: AdmissionResultStatus | string;
  readonly entries: readonly AdmissionResultEntryDto[];
}
