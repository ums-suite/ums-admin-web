import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  AdmissionResultDto,
  ApplicationDto,
  CampaignDto,
  CreateCampaignRequest,
  EligibilityRuleRequest,
  ExamAttemptDto,
  MeritListDto,
  PromoteWaitlistedRequest,
  RecordSubjectiveScoreRequest,
  RequiredDocumentRequest,
  ResubmissionRequest,
  ReviewIntegrityFlagRequest,
  SeatQuotaRequest,
} from './admission.types';

/**
 * ADMIN-13/ADMIN-14: hand-rolled thin client for `ums-core`'s Admission module -- see
 * `admission.types.ts`'s own doc for why this bypasses `@ums/shared` entirely (no generated
 * `AdmissionApiService` exists). Every route below is confirmed real against
 * `UMS.Modules.Admission.Api.Endpoints.*` source, read directly rather than guessed.
 *
 * FLAGGED BACKEND GAPS (confirmed by reading the endpoint source, not assumed):
 * - No `GET /admission/campaigns` list endpoint exists -- only create and get-by-id. This app can
 *   configure a campaign it just created, or one whose id it already knows, never browse a list.
 * - No applicant/application SEARCH or LIST endpoint exists anywhere in the Admission module.
 * - `GET /admission/applications/{id}` is ownership-gated to the OWNING APPLICANT ONLY
 *   (`OwnershipGuard.CheckOwnership`, confirmed real against `ApplicationEndpoints.cs`'s own
 *   `GuardAsync` helper) -- unlike Library/Hostel's own `OwnershipGuard`, Admission's has NO
 *   staff-permission bypass path. A Registrar/Admission Officer calling this endpoint for an
 *   application they do not themselves own gets a 403, even while holding
 *   `admission.application.review`. This is a genuine backend gap blocking ADMIN-14's "application
 *   detail" pane as specified; `applicant-review.component.ts` surfaces the 403 with an explicit
 *   explanation rather than silently failing, and still exposes the document-review/decline
 *   actions below (which ARE permission-gated, not ownership-gated) for a caller who already knows
 *   the relevant application/document ids from another channel (e.g. an Audit Log entry).
 */
@Injectable({ providedIn: 'root' })
export class AdmissionApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/admission`;
  }

  createCampaign(request: CreateCampaignRequest): Observable<CampaignDto> {
    return this.http.post<CampaignDto>(`${this.baseUrl}/campaigns`, request);
  }

  getCampaignById(id: string): Observable<CampaignDto> {
    return this.http.get<CampaignDto>(`${this.baseUrl}/campaigns/${id}`);
  }

  addEligibilityRule(campaignId: string, request: EligibilityRuleRequest): Observable<CampaignDto> {
    return this.http.post<CampaignDto>(
      `${this.baseUrl}/campaigns/${campaignId}/eligibility-rules`,
      request,
    );
  }

  addSeatQuota(campaignId: string, request: SeatQuotaRequest): Observable<CampaignDto> {
    return this.http.post<CampaignDto>(
      `${this.baseUrl}/campaigns/${campaignId}/seat-quotas`,
      request,
    );
  }

  addRequiredDocumentType(
    campaignId: string,
    request: RequiredDocumentRequest,
  ): Observable<CampaignDto> {
    return this.http.post<CampaignDto>(
      `${this.baseUrl}/campaigns/${campaignId}/required-documents`,
      request,
    );
  }

  getApplicationById(id: string): Observable<ApplicationDto> {
    return this.http.get<ApplicationDto>(`${this.baseUrl}/applications/${id}`);
  }

  approveDocument(applicationId: string, documentId: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.baseUrl}/applications/${applicationId}/documents/${documentId}/approve`,
      {},
    );
  }

  requestDocumentResubmission(
    applicationId: string,
    documentId: string,
    request: ResubmissionRequest,
  ): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.baseUrl}/applications/${applicationId}/documents/${documentId}/request-resubmission`,
      request,
    );
  }

  declineApplication(applicationId: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/applications/${applicationId}/decline`, {});
  }

  // ---- ExamAttempt (ADMIN-19) -- no list/monitor endpoint exists, see admission.types.ts's own doc ----

  getExamAttemptById(id: string): Observable<ExamAttemptDto> {
    return this.http.get<ExamAttemptDto>(`${this.baseUrl}/exams/attempts/${id}`);
  }

  recordSubjectiveScore(
    attemptId: string,
    request: RecordSubjectiveScoreRequest,
  ): Observable<ExamAttemptDto> {
    return this.http.post<ExamAttemptDto>(
      `${this.baseUrl}/exams/attempts/${attemptId}/subjective-score`,
      request,
    );
  }

  reviewIntegrityFlag(
    attemptId: string,
    flagId: string,
    request: ReviewIntegrityFlagRequest,
  ): Observable<ExamAttemptDto> {
    return this.http.post<ExamAttemptDto>(
      `${this.baseUrl}/exams/attempts/${attemptId}/integrity-flags/${flagId}/review`,
      request,
    );
  }

  // ---- MeritList (ADMIN-19) ----

  generateMeritList(campaignId: string): Observable<MeritListDto> {
    return this.http.post<MeritListDto>(`${this.baseUrl}/merit-lists/${campaignId}/generate`, {});
  }

  getMeritListByCampaign(campaignId: string): Observable<MeritListDto> {
    return this.http.get<MeritListDto>(`${this.baseUrl}/merit-lists/by-campaign/${campaignId}`);
  }

  approveMeritList(meritListId: string): Observable<MeritListDto> {
    return this.http.post<MeritListDto>(`${this.baseUrl}/merit-lists/${meritListId}/approve`, {});
  }

  promoteWaitlisted(campaignId: string, request: PromoteWaitlistedRequest): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.baseUrl}/results/${campaignId}/promote-waitlisted`,
      request,
    );
  }

  // ---- AdmissionResult (ADMIN-20) -- the only Result-Publication-shaped entity in this app with ----
  // ---- a real GET to bootstrap current state from, see admission.types.ts's own doc. ----

  getAdmissionResultByCampaign(campaignId: string): Observable<AdmissionResultDto> {
    return this.http.get<AdmissionResultDto>(`${this.baseUrl}/results/by-campaign/${campaignId}`);
  }

  calculateAdmissionResult(campaignId: string): Observable<AdmissionResultDto> {
    return this.http.post<AdmissionResultDto>(
      `${this.baseUrl}/results/${campaignId}/calculate`,
      {},
    );
  }

  lockAdmissionResult(resultId: string): Observable<AdmissionResultDto> {
    return this.http.post<AdmissionResultDto>(`${this.baseUrl}/results/${resultId}/lock`, {});
  }

  approveAdmissionResult(resultId: string): Observable<AdmissionResultDto> {
    return this.http.post<AdmissionResultDto>(`${this.baseUrl}/results/${resultId}/approve`, {});
  }

  publishAdmissionResult(resultId: string): Observable<AdmissionResultDto> {
    return this.http.post<AdmissionResultDto>(`${this.baseUrl}/results/${resultId}/publish`, {});
  }

  reenterAdmissionResultForCorrection(resultId: string): Observable<AdmissionResultDto> {
    return this.http.post<AdmissionResultDto>(
      `${this.baseUrl}/results/${resultId}/reenter-for-correction`,
      {},
    );
  }
}
