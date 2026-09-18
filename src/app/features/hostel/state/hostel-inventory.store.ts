import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { HostelApi } from '../hostel.api';
import type {
  AllocationDto,
  BedDto,
  BedOccupancy,
  BuildingDto,
  CreateBedRequest,
  CreateBuildingRequest,
  CreateHostelRequest,
  CreateRoomRequest,
  HostelDto,
  RoomDto,
  UpdateRoomCapacityRequest,
} from '../hostel.types';

interface HostelInventoryState {
  readonly hostels: readonly HostelDto[];
  readonly buildings: readonly BuildingDto[];
  readonly rooms: readonly RoomDto[];
  /** Beds for whichever room the bed-map grid currently has loaded, keyed by roomId. */
  readonly bedsByRoomId: Readonly<Record<string, readonly BedDto[]>>;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: HostelInventoryState = {
  hostels: [],
  buildings: [],
  rooms: [],
  bedsByRoomId: {},
  isLoading: false,
  error: null,
};

/**
 * ADMIN-27: Hostel/Building/Room/Bed inventory management, plus this app's own client-assembled
 * "bed map" grid -- `Bed` carries no status field and no bed-map/occupancy endpoint exists
 * anywhere in this module (confirmed, see `hostel.types.ts`'s own doc), so occupancy is always
 * derived here by cross-referencing a room's beds against the caller-supplied allocation list
 * (this store has no allocation data of its own -- `HostelAllocationsStore`/the review-queue in
 * `HostelApplicationsStore` are the only sources of an `AllocationDto.bedId`).
 *
 * After a conflicted mutation, the only honest re-fetch is that one room's own bed list
 * (`refreshRoomBeds`) -- there is no floor/section/building-wide occupancy refresh to fall back to.
 */
export const HostelInventoryStore = signalStore(
  { providedIn: 'root' },
  withState<HostelInventoryState>(initialState),
  withMethods((store, api = inject(HostelApi)) => ({
    loadHostels(): void {
      patchState(store, { isLoading: true, error: null });
      api.listHostels().subscribe({
        next: (hostels) => patchState(store, { hostels, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createHostel: (request: CreateHostelRequest) =>
      api
        .createHostel(request)
        .pipe(tap((hostel) => patchState(store, { hostels: [hostel, ...store.hostels()] }))),

    loadBuildings(hostelId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listBuildings(hostelId).subscribe({
        next: (buildings) => patchState(store, { buildings, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createBuilding: (hostelId: string, request: CreateBuildingRequest) =>
      api
        .createBuilding(hostelId, request)
        .pipe(
          tap((building) => patchState(store, { buildings: [building, ...store.buildings()] })),
        ),

    loadRooms(buildingId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listRooms(buildingId).subscribe({
        next: (rooms) => patchState(store, { rooms, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createRoom: (buildingId: string, request: CreateRoomRequest) =>
      api
        .createRoom(buildingId, request)
        .pipe(tap((room) => patchState(store, { rooms: [room, ...store.rooms()] }))),
    updateRoomCapacity: (roomId: string, request: UpdateRoomCapacityRequest) =>
      api.updateRoomCapacity(roomId, request).pipe(
        tap((updated) =>
          patchState(store, {
            rooms: store.rooms().map((r) => (r.id === updated.id ? updated : r)),
          }),
        ),
      ),

    /** Loads (or reloads, e.g. the post-conflict "affected bed's floor/section" re-fetch) one room's beds. */
    loadRoomBeds(roomId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listBeds(roomId).subscribe({
        next: (beds) =>
          patchState(store, {
            bedsByRoomId: { ...store.bedsByRoomId(), [roomId]: beds },
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    /** Same call as {@link loadRoomBeds} -- named separately at call sites for the post-conflict-refresh intent. */
    refreshRoomBeds(roomId: string): void {
      this.loadRoomBeds(roomId);
    },
    createBed: (roomId: string, request: CreateBedRequest) =>
      api.createBed(roomId, request).pipe(
        tap((bed) =>
          patchState(store, {
            bedsByRoomId: {
              ...store.bedsByRoomId(),
              [roomId]: [...(store.bedsByRoomId()[roomId] ?? []), bed],
            },
          }),
        ),
      ),

    /** Derives a bed-map row for one room from currently-loaded beds + a caller-supplied allocation list. */
    bedMapForRoom(
      roomId: string,
      allAllocations: readonly AllocationDto[],
    ): readonly BedOccupancy[] {
      const beds = store.bedsByRoomId()[roomId] ?? [];
      return beds.map((bed) => ({
        bed,
        occupyingAllocation:
          allAllocations.find(
            (a) => a.bedId === bed.id && a.status !== 'CheckedOut' && a.status !== 'Expired',
          ) ?? null,
      }));
    },
  })),
);
