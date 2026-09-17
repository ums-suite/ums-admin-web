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
