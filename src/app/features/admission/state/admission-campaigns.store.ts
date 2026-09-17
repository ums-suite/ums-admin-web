import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { AdmissionApi } from '../admission.api';
import type {
  CampaignDto,
  CreateCampaignRequest,
  EligibilityRuleRequest,
  RequiredDocumentRequest,
  SeatQuotaRequest,
} from '../admission.types';

interface AdmissionCampaignsState {
  readonly currentCampaign: CampaignDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: AdmissionCampaignsState = {
  currentCampaign: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-13: Admissions campaign configuration (requirement-spec.md §3.4) -- create, then load by
 * id and layer on eligibility rules / seat quotas / required documents, mirroring the one real
 * workflow `ums-core`'s Admission module actually supports (see `admission.api.ts`'s own doc for
 * the confirmed absence of a campaign list/browse endpoint).
 */
export const AdmissionCampaignsStore = signalStore(
  { providedIn: 'root' },
  withState<AdmissionCampaignsState>(initialState),
  withMethods((store, api = inject(AdmissionApi)) => ({
    loadCampaign(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getCampaignById(id).subscribe({
        next: (campaign) => patchState(store, { currentCampaign: campaign, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createCampaign: (request: CreateCampaignRequest) =>
      api
        .createCampaign(request)
        .pipe(tap((campaign) => patchState(store, { currentCampaign: campaign, error: null }))),
    addEligibilityRule: (campaignId: string, request: EligibilityRuleRequest) =>
      api
        .addEligibilityRule(campaignId, request)
        .pipe(tap((campaign) => patchState(store, { currentCampaign: campaign }))),
    addSeatQuota: (campaignId: string, request: SeatQuotaRequest) =>
      api
        .addSeatQuota(campaignId, request)
        .pipe(tap((campaign) => patchState(store, { currentCampaign: campaign }))),
    addRequiredDocumentType: (campaignId: string, request: RequiredDocumentRequest) =>
      api
        .addRequiredDocumentType(campaignId, request)
        .pipe(tap((campaign) => patchState(store, { currentCampaign: campaign }))),
  })),
);
