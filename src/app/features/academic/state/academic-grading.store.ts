import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { tap } from 'rxjs';
import { AcademicApi } from '../academic.api';
import type { CorrectGradeRequest, GradeDto } from '../academic.types';

interface AcademicGradingState {
  readonly lastCorrectedGrade: GradeDto | null;
}

const initialState: AcademicGradingState = {
  lastCorrectedGrade: null,
};

/**
 * ADMIN-22: the Grade-correction half of "Oversight of Faculty-submitted marks and grade-
 * calculation review before approval + Department-Head-review -> Registrar-approval Grade
 * correction workflow (never a raw edit)" (requirement-spec.md §3.5, §8 invariant #3).
 *
 * **No `GET /grades/{id}` (or any Grade list) endpoint exists in ums-core** -- confirmed by reading
 * `GradeEndpoints.cs` directly: exactly two routes, `POST /grades` (Faculty submission, out of this
 * admin app's scope -- that happens in `ums-faculty-web`) and `POST /grades/{id}/correct`. There is
 * therefore no way to "view a Grade before correcting it" from this app; the correction endpoint
 * itself is the only read AND write surface, returning the corrected {@link GradeDto} as
 * confirmation. This is, if anything, a stronger guarantee of §8 invariant #3's "never a raw edit"
 * than a view-then-edit screen would be -- there is no raw field to edit in place, only a full
 * re-submission of corrected scores with a mandatory reason, exactly matching `CorrectGradeRequest`.
 *
 * "Oversight ... before approval" itself is exercised through the ResultPublication batch's own
 * Lock/Reject step (ADMIN-23, `academic-result-publication.store.ts`), not through this store --
 * Grade has no independent status of its own; its batch's `ResultPublication` status is the real
 * gate (see `academic.types.ts`'s own doc).
 */
export const AcademicGradingStore = signalStore(
  { providedIn: 'root' },
  withState<AcademicGradingState>(initialState),
  withMethods((store, api = inject(AcademicApi)) => ({
    correctGrade: (gradeId: string, request: CorrectGradeRequest) =>
      api
        .correctGrade(gradeId, request)
        .pipe(tap((grade) => patchState(store, { lastCorrectedGrade: grade }))),
  })),
);
