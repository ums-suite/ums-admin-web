import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { FacultyApi } from '../faculty.api';
import type {
  ChangeFacultyMemberStatusRequest,
  FacultyMemberDto,
  OnboardFacultyMemberRequest,
  UpdateEmploymentDetailsRequest,
} from '../faculty.types';

interface FacultyMembersState {
  readonly currentMember: FacultyMemberDto | null;
  readonly membersByDepartment: readonly FacultyMemberDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: FacultyMembersState = {
  currentMember: null,
  membersByDepartment: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-26: Employee/FacultyMember profile, employment history (flagged absent, see
 * `faculty.types.ts`'s own doc), and Designation assignment (via the full employment-details edit,
 * which carries `designationId` -- there is no separate assignment endpoint). Onboard/edit/status
 * change all carry `version` for optimistic concurrency, surfaced to the caller as a raw `409` --
 * `faculty-members.component.ts`'s own doc explains why the store leaves that shape unwrapped.
 */
export const FacultyMembersStore = signalStore(
  { providedIn: 'root' },
  withState<FacultyMembersState>(initialState),
  withMethods((store, api = inject(FacultyApi)) => ({
    loadMember(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getFacultyMemberById(id).subscribe({
        next: (member) => patchState(store, { currentMember: member, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadMembersByDepartment(departmentId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listFacultyMembers(departmentId).subscribe({
        next: (page) => patchState(store, { membersByDepartment: page.items, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    onboardMember: (request: OnboardFacultyMemberRequest) =>
      api
        .onboardFacultyMember(request)
        .pipe(tap((member) => patchState(store, { currentMember: member, error: null }))),
    updateEmploymentDetails: (id: string, request: UpdateEmploymentDetailsRequest) =>
      api
        .updateEmploymentDetails(id, request)
        .pipe(tap((member) => patchState(store, { currentMember: member }))),
    changeStatus: (id: string, request: ChangeFacultyMemberStatusRequest) =>
      api
        .changeFacultyMemberStatus(id, request)
        .pipe(tap((member) => patchState(store, { currentMember: member }))),
  })),
);
