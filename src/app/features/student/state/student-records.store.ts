import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { StudentApi } from '../student.api';
import type { ChangeStudentStatusRequest, StudentDto } from '../student.types';

interface StudentRecordsState {
  readonly currentStudent: StudentDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: StudentRecordsState = {
  currentStudent: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-15: Student records state -- one Student at a time, looked up by id (no search/list
 * endpoint exists, see `student.types.ts`'s own doc). `changeStatus` is returned as a raw
 * Observable rather than pre-handled here: the caller (component) needs to distinguish a `409`
 * version-conflict (whose body is the confirmed real `StudentStatusConflict` shape, not a generic
 * `UmsApiError`) from every other failure, which this generic store layer deliberately leaves to
 * the feature-specific caller rather than baking one specific error-body shape into shared state.
 */
export const StudentRecordsStore = signalStore(
  { providedIn: 'root' },
  withState<StudentRecordsState>(initialState),
  withMethods((store, api = inject(StudentApi)) => ({
    loadStudent(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getStudentById(id).subscribe({
        next: (student) => patchState(store, { currentStudent: student, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    changeStatus: (id: string, request: ChangeStudentStatusRequest) =>
      api
        .changeStatus(id, request)
        .pipe(tap((student) => patchState(store, { currentStudent: student }))),
  })),
);
