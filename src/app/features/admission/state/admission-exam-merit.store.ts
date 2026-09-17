import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { AdmissionApi } from '../admission.api';
import type {
  ExamAttemptDto,
  MeritListDto,
  PromoteWaitlistedRequest,
  RecordSubjectiveScoreRequest,
  ReviewIntegrityFlagRequest,
} from '../admission.types';

interface AdmissionExamMeritState {
  readonly currentAttempt: ExamAttemptDto | null;
  readonly currentMeritList: MeritListDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: AdmissionExamMeritState = {
  currentAttempt: null,
  currentMeritList: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-19: ExamAttempt monitoring (id-based lookup -- no list/monitor endpoint exists, see
 * `admission.types.ts`'s own doc) + MeritList generation/review/approval, per campaign.
 */
export const AdmissionExamMeritStore = signalStore(
  { providedIn: 'root' },
  withState<AdmissionExamMeritState>(initialState),
  withMethods((store, api = inject(AdmissionApi)) => ({
    loadExamAttempt(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getExamAttemptById(id).subscribe({
        next: (attempt) => patchState(store, { currentAttempt: attempt, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    recordSubjectiveScore: (attemptId: string, request: RecordSubjectiveScoreRequest) =>
      api
        .recordSubjectiveScore(attemptId, request)
        .pipe(tap((attempt) => patchState(store, { currentAttempt: attempt }))),
    reviewIntegrityFlag: (attemptId: string, flagId: string, request: ReviewIntegrityFlagRequest) =>
      api
        .reviewIntegrityFlag(attemptId, flagId, request)
        .pipe(tap((attempt) => patchState(store, { currentAttempt: attempt }))),

    loadMeritListByCampaign(campaignId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getMeritListByCampaign(campaignId).subscribe({
        next: (meritList) => patchState(store, { currentMeritList: meritList, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    generateMeritList: (campaignId: string) =>
      api
        .generateMeritList(campaignId)
        .pipe(tap((meritList) => patchState(store, { currentMeritList: meritList, error: null }))),
    approveMeritList: (meritListId: string) =>
      api
        .approveMeritList(meritListId)
        .pipe(tap((meritList) => patchState(store, { currentMeritList: meritList }))),
    promoteWaitlisted: (campaignId: string, request: PromoteWaitlistedRequest) =>
      api.promoteWaitlisted(campaignId, request),
  })),
);
