import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { AdmissionApi } from '../admission.api';
import type { AdmissionResultDto } from '../admission.types';

interface AdmissionResultPublicationState {
  readonly currentResult: AdmissionResultDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: AdmissionResultPublicationState = {
  currentResult: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-20: bootstraps and re-fetches the current {@link AdmissionResultDto} for a campaign --
 * the one real `GET` (`by-campaign/{campaignId}`) that lets `AdmissionResultPublicationComponent`
 * start `ResultPublicationWizard` from the campaign's REAL current status, unlike Academic's own
 * ResultPublication (ADMIN-23), which has no equivalent read endpoint at all (see that component's
 * own doc). The five write transitions themselves are called directly from the component via
 * `AdmissionApi`, one call per `ResultPublicationWizard` step -- this store only owns the
 * bootstrapping read, mirroring how other lookup-only stores in this app stay thin.
 */
export const AdmissionResultPublicationStore = signalStore(
  { providedIn: 'root' },
  withState<AdmissionResultPublicationState>(initialState),
  withMethods((store, api = inject(AdmissionApi)) => ({
    loadResultByCampaign(campaignId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getAdmissionResultByCampaign(campaignId).subscribe({
        next: (result) => patchState(store, { currentResult: result, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    setCurrentResult(result: AdmissionResultDto): void {
      patchState(store, { currentResult: result });
    },
  })),
);
