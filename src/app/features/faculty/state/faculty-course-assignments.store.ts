import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { FacultyApi } from '../faculty.api';
import type { CourseAssignmentDto } from '../faculty.types';

interface FacultyCourseAssignmentsState {
  readonly assignments: readonly CourseAssignmentDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: FacultyCourseAssignmentsState = {
  assignments: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-26: CourseAssignment oversight -- read-only here by construction (see `faculty.types.ts`'s
 * own doc). Creating/reassigning an instructor happens on `AcademicCourseOfferingsComponent`
 * (ADMIN-18); there is no confirmed endpoint anywhere to remove one.
 */
export const FacultyCourseAssignmentsStore = signalStore(
  { providedIn: 'root' },
  withState<FacultyCourseAssignmentsState>(initialState),
  withMethods((store, api = inject(FacultyApi)) => ({
    loadByFacultyMember(facultyMemberId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listCourseAssignments(facultyMemberId).subscribe({
        next: (assignments) => patchState(store, { assignments, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
  })),
);
