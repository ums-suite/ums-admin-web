import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { OrganizationApi } from '../organization.api';
import type {
  BuildingDto,
  CampusDto,
  CreateBuildingRequest,
  CreateCampusRequest,
  CreateDepartmentRequest,
  CreateDesignationRequest,
  CreateFacultyRequest,
  CreateProgramRequest,
  CreateRoomRequest,
  CreateUniversityRequest,
  DepartmentDto,
  DesignationDto,
  FacultyDto,
  ProgramDto,
  RoomDto,
  UniversityDto,
} from '../organization.types';

interface OrganizationState {
  readonly universities: readonly UniversityDto[];
  readonly campuses: readonly CampusDto[];
  readonly faculties: readonly FacultyDto[];
  readonly departments: readonly DepartmentDto[];
  readonly programs: readonly ProgramDto[];
  readonly designations: readonly DesignationDto[];
  readonly buildings: readonly BuildingDto[];
  readonly rooms: readonly RoomDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: OrganizationState = {
  universities: [],
  campuses: [],
  faculties: [],
  departments: [],
  programs: [],
  designations: [],
  buildings: [],
  rooms: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-12: University -> Campus -> Faculty -> Department -> Program hierarchy CRUD + Designation
 * catalog + Building/Room registry. Every list/create call is confirmed real against ums-core's
 * Organization module. Bengali/English `translations` fields are confirmed real on
 * Faculty/Department/Program/Designation create requests but left `null` here -- ADR-0011's
 * runtime i18n editing UI is a cross-cutting gap already flagged in ADMIN-6's own commit, not
 * re-flagged per screen.
 */
export const OrganizationStore = signalStore(
  { providedIn: 'root' },
  withState<OrganizationState>(initialState),
  withMethods((store, api = inject(OrganizationApi)) => ({
    loadUniversities(): void {
      patchState(store, { isLoading: true, error: null });
      api.listUniversities(0, 100).subscribe({
        next: (page) => patchState(store, { universities: page.items, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadCampuses(universityId?: string): void {
      api.listCampuses(universityId, 0, 100).subscribe({
        next: (page) => patchState(store, { campuses: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadFaculties(campusId?: string): void {
      api.listFaculties(campusId, 0, 100).subscribe({
        next: (page) => patchState(store, { faculties: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadDepartments(facultyId?: string): void {
      api.listDepartments(facultyId, 0, 100).subscribe({
        next: (page) => patchState(store, { departments: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadPrograms(departmentId?: string): void {
      api.listPrograms(departmentId, 0, 100).subscribe({
        next: (page) => patchState(store, { programs: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadDesignations(): void {
      api.listDesignations(0, 100).subscribe({
        next: (page) => patchState(store, { designations: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadBuildings(campusId?: string): void {
      api.listBuildings(campusId, 0, 100).subscribe({
        next: (page) => patchState(store, { buildings: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    loadRoomsForBuilding(buildingId: string): void {
      api.listRoomsForBuilding(buildingId, 0, 100).subscribe({
        next: (page) => patchState(store, { rooms: page.items }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
  })),
  withMethods((store, api = inject(OrganizationApi)) => ({
    createUniversity: (request: CreateUniversityRequest) =>
      api.createUniversity(request).pipe(tap(() => store.loadUniversities())),
    createCampus: (request: CreateCampusRequest) =>
      api.createCampus(request).pipe(tap(() => store.loadCampuses())),
    createFaculty: (request: CreateFacultyRequest) =>
      api.createFaculty(request).pipe(tap(() => store.loadFaculties())),
    createDepartment: (request: CreateDepartmentRequest) =>
      api.createDepartment(request).pipe(tap(() => store.loadDepartments())),
    createProgram: (request: CreateProgramRequest) =>
      api.createProgram(request).pipe(tap(() => store.loadPrograms())),
    createDesignation: (request: CreateDesignationRequest) =>
      api.createDesignation(request).pipe(tap(() => store.loadDesignations())),
    createBuilding: (request: CreateBuildingRequest) =>
      api.createBuilding(request).pipe(tap(() => store.loadBuildings())),
    createRoom: (request: CreateRoomRequest) => api.createRoom(request),
  })),
);
