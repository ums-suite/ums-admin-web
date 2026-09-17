import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { FacultyApi } from '../faculty.api';
import type { ResearchProfileDto, UpdateResearchProfileRequest } from '../faculty.types';

interface FacultyResearchProfileState {
  readonly currentProfile: ResearchProfileDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: FacultyResearchProfileState = {
  currentProfile: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-26: ResearchProfile "moderation" -- no moderation state machine exists in ums-core
 * (confirmed, see `faculty.types.ts`'s own doc); this store's single write IS what a viewer sees
 * immediately on the public, anonymous `GET`.
 */
export const FacultyResearchProfileStore = signalStore(
  { providedIn: 'root' },
  withState<FacultyResearchProfileState>(initialState),
  withMethods((store, api = inject(FacultyApi)) => ({
    loadProfile(facultyMemberId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getResearchProfile(facultyMemberId).subscribe({
        next: (profile) => patchState(store, { currentProfile: profile, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    updateProfile: (facultyMemberId: string, request: UpdateResearchProfileRequest) =>
      api
        .updateResearchProfile(facultyMemberId, request)
        .pipe(tap((profile) => patchState(store, { currentProfile: profile }))),
  })),
);
