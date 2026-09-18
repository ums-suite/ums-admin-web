import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { HostelApi } from '../hostel.api';
import type {
  AllocationDto,
  AllocationReviewFlagDto,
  CheckOutRequest,
  ComplaintDto,
  CreateComplaintRequest,
  ResolveComplaintRequest,
} from '../hostel.types';

interface HostelAllocationsState {
  readonly myAllocations: readonly AllocationDto[];
  readonly reviewFlagsByAllocationId: Readonly<Record<string, readonly AllocationReviewFlagDto[]>>;
  readonly myComplaints: readonly ComplaintDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: HostelAllocationsState = {
  myAllocations: [],
  reviewFlagsByAllocationId: {},
  myComplaints: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-28: my-allocations (self-service check-in/out), officer review-flags, and Complaint
 * submit/settle. **No staff-facing complaint list/GET-by-id endpoint exists** (confirmed real
 * gap) -- `resolveComplaint` below only ever acts on a complaint id the caller already has (e.g.
 * surfaced via the Audit Log), same "id-only interim workflow" precedent as ADMIN-17's
 * StudentRequest handling.
 */
export const HostelAllocationsStore = signalStore(
  { providedIn: 'root' },
  withState<HostelAllocationsState>(initialState),
  withMethods((store, api = inject(HostelApi)) => ({
    loadMyAllocations(): void {
      patchState(store, { isLoading: true, error: null });
      api.myAllocations().subscribe({
        next: (myAllocations) => patchState(store, { myAllocations, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    checkIn: (allocationId: string) =>
      api.checkIn(allocationId).pipe(
        tap((allocation) =>
          patchState(store, {
            myAllocations: store
              .myAllocations()
              .map((a) => (a.id === allocationId ? allocation : a)),
          }),
        ),
      ),
    /** `checkOutType` is only honored server-side when the caller isn't the owning student. */
    checkOut: (allocationId: string, request: CheckOutRequest) =>
      api.checkOut(allocationId, request).pipe(
        tap((allocation) =>
          patchState(store, {
            myAllocations: store
              .myAllocations()
              .map((a) => (a.id === allocationId ? allocation : a)),
          }),
        ),
      ),
    loadReviewFlags(allocationId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getReviewFlags(allocationId).subscribe({
        next: (flags) =>
          patchState(store, {
            reviewFlagsByAllocationId: {
              ...store.reviewFlagsByAllocationId(),
              [allocationId]: flags,
            },
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },

    submitComplaint: (request: CreateComplaintRequest) =>
      api
        .submitComplaint(request)
        .pipe(
          tap((complaint) =>
            patchState(store, { myComplaints: [complaint, ...store.myComplaints()] }),
          ),
        ),
    loadMyComplaints(): void {
      patchState(store, { isLoading: true, error: null });
      api.myComplaints().subscribe({
        next: (myComplaints) => patchState(store, { myComplaints, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    /** Acts on an id-only complaint the caller already knows -- see class doc. */
    resolveComplaint: (id: string, request: ResolveComplaintRequest) =>
      api.resolveComplaint(id, request).pipe(
        tap((resolved) =>
          patchState(store, {
            myComplaints: store.myComplaints().map((c) => (c.id === id ? resolved : c)),
          }),
        ),
      ),
  })),
);
