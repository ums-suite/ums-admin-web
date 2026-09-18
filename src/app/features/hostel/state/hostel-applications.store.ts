import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { HostelApi } from '../hostel.api';
import type {
  ApplicationWindowDto,
  CreateApplicationWindowRequest,
  CreateHostelApplicationRequest,
  EligibilityRuleDto,
  HostelApplicationDto,
  ReviewApplicationRequest,
} from '../hostel.types';

interface HostelApplicationsState {
  readonly applicationWindows: readonly ApplicationWindowDto[];
  readonly myApplications: readonly HostelApplicationDto[];
  readonly reviewQueue: readonly HostelApplicationDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: HostelApplicationsState = {
  applicationWindows: [],
  myApplications: [],
  reviewQueue: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-28: Application Window configuration (eligible programs/years/eligibility rules, ranking)
 * plus the self-service submit/withdraw and officer review workflows. Approving auto-allocates a
 * bed server-side -- there is no manual bed-picking step here (confirmed real, see
 * `hostel.types.ts`'s own doc).
 */
export const HostelApplicationsStore = signalStore(
  { providedIn: 'root' },
  withState<HostelApplicationsState>(initialState),
  withMethods((store, api = inject(HostelApi)) => ({
    loadApplicationWindows(): void {
      patchState(store, { isLoading: true, error: null });
      api.listApplicationWindows().subscribe({
        next: (applicationWindows) => patchState(store, { applicationWindows, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createApplicationWindow: (request: CreateApplicationWindowRequest) =>
      api
        .createApplicationWindow(request)
        .pipe(
          tap((win) =>
            patchState(store, { applicationWindows: [win, ...store.applicationWindows()] }),
          ),
        ),
    setEligiblePrograms(id: string, programIds: readonly string[]) {
      return api.setEligiblePrograms(id, { ProgramIds: programIds }).pipe(
        tap((win) =>
          patchState(store, {
            applicationWindows: store.applicationWindows().map((w) => (w.id === win.id ? win : w)),
          }),
        ),
      );
    },
    setEligibleYears(id: string, years: readonly number[]) {
      return api.setEligibleYears(id, { Years: years }).pipe(
        tap((win) =>
          patchState(store, {
            applicationWindows: store.applicationWindows().map((w) => (w.id === win.id ? win : w)),
          }),
        ),
      );
    },
    setEligibilityRules(id: string, rules: readonly EligibilityRuleDto[]) {
      return api.setEligibilityRules(id, { Rules: rules }).pipe(
        tap((win) =>
          patchState(store, {
            applicationWindows: store.applicationWindows().map((w) => (w.id === win.id ? win : w)),
          }),
        ),
      );
    },
    rankApplications(id: string) {
      return api.rankApplications(id);
    },

    submitApplication: (request: CreateHostelApplicationRequest) =>
      api
        .submitApplication(request)
        .pipe(
          tap((app) => patchState(store, { myApplications: [app, ...store.myApplications()] })),
        ),
    loadMyApplications(): void {
      patchState(store, { isLoading: true, error: null });
      api.myApplications().subscribe({
        next: (myApplications) => patchState(store, { myApplications, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    withdrawApplication: (id: string) =>
      api.withdrawApplication(id).pipe(
        tap((app) =>
          patchState(store, {
            myApplications: store.myApplications().map((a) => (a.id === id ? app : a)),
          }),
        ),
      ),

    /** Both params are required server-side (see `hostel.api.ts`'s own doc). */
    loadReviewQueue(applicationWindowId: string, status: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listApplicationsForReview(applicationWindowId, status).subscribe({
        next: (reviewQueue) => patchState(store, { reviewQueue, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    reviewApplication: (id: string, request: ReviewApplicationRequest) =>
      api.reviewApplication(id, request).pipe(
        tap((app) =>
          patchState(store, {
            reviewQueue: store.reviewQueue().map((a) => (a.id === id ? app : a)),
          }),
        ),
      ),
  })),
);
