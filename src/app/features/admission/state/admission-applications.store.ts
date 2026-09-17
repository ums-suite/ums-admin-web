import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { AdmissionApi } from '../admission.api';
import type { ApplicationDto } from '../admission.types';

interface AdmissionApplicationsState {
  readonly currentApplication: ApplicationDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  /** True when the last load failed with 403 -- see `admission.api.ts`'s OwnershipGuard doc. */
  readonly forbidden: boolean;
}

const initialState: AdmissionApplicationsState = {
  currentApplication: null,
  isLoading: false,
  error: null,
  forbidden: false,
};

/**
 * ADMIN-14: Applicant Review workspace state -- one Application at a time, looked up by id (no
 * search/list endpoint exists, see `admission.api.ts`'s own doc). `loadApplication` distinguishes
 * a 403 (the confirmed ownership-guard gap) from any other failure so the component can render
 * the specific "staff cannot fetch this directly" explanation rather than a generic error.
 */
export const AdmissionApplicationsStore = signalStore(
  { providedIn: 'root' },
  withState<AdmissionApplicationsState>(initialState),
  withMethods((store, api = inject(AdmissionApi)) => ({
    loadApplication(id: string): void {
      patchState(store, { isLoading: true, error: null, forbidden: false });
      api.getApplicationById(id).subscribe({
        next: (application) =>
          patchState(store, { currentApplication: application, isLoading: false }),
        error: (e: unknown) => {
          const apiError = toUmsApiError(e);
          patchState(store, {
            isLoading: false,
            error: apiError.message,
            forbidden: apiError.status === 403,
          });
        },
      });
    },
    approveDocument: (applicationId: string, documentId: string) =>
      api.approveDocument(applicationId, documentId),
    requestDocumentResubmission: (applicationId: string, documentId: string, reason: string) =>
      api.requestDocumentResubmission(applicationId, documentId, { reason }),
    declineApplication: (applicationId: string) => api.declineApplication(applicationId),
  })),
);
