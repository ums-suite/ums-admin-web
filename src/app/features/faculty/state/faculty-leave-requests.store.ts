import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { FacultyApi } from '../faculty.api';
import type {
  LeaveRequestDto,
  RejectLeaveRequestRequest,
  VersionedRequestBody,
} from '../faculty.types';

interface FacultyLeaveRequestsState {
  readonly requests: readonly LeaveRequestDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: FacultyLeaveRequestsState = {
  requests: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-26: the confirmed real, genuinely two-stage `LeaveRequest` approval chain
 * (`Submitted -> DeptHeadApproved -> Approved`, or a direct-to-Authority shortcut when the
 * requester is themself the Department Head, `RoutedDirectlyToAuthority`). Every approve/reject
 * call carries the real `version` field for optimistic concurrency -- a losing concurrent reviewer
 * gets a `409`, surfaced by the component via the shared `VersionConflictBannerComponent`
 * (design-decisions.md's platform-wide conflict-UX pattern), not a raw error.
 *
 * On any successful mutation, this store replaces the updated request IN PLACE in `requests()`
 * rather than re-fetching the whole list -- the item-level refresh edge-cases.md's "concurrent
 * grade-batch review" resolution calls for ("an already-actioned row visibly grays out... on the
 * batch list's next refresh"), applied here to the analogous concurrent-leave-reviewer case.
 */
export const FacultyLeaveRequestsStore = signalStore(
  { providedIn: 'root' },
  withState<FacultyLeaveRequestsState>(initialState),
  withMethods((store, api = inject(FacultyApi)) => ({
    loadByFacultyMember(facultyMemberId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listLeaveRequests(facultyMemberId).subscribe({
        next: (page) => patchState(store, { requests: page.items, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    replaceRequest(updated: LeaveRequestDto): void {
      patchState(store, {
        requests: store.requests().map((r) => (r.id === updated.id ? updated : r)),
      });
    },
    approveByDepartmentHead: (id: string, request: VersionedRequestBody) =>
      api.approveByDepartmentHead(id, request),
    approveByAuthority: (id: string, request: VersionedRequestBody) =>
      api.approveByAuthority(id, request),
    rejectByDepartmentHead: (id: string, request: RejectLeaveRequestRequest) =>
      api.rejectByDepartmentHead(id, request),
    rejectByAuthority: (id: string, request: RejectLeaveRequestRequest) =>
      api.rejectByAuthority(id, request),
  })),
);
