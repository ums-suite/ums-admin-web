/**
 * ADMIN-12: hand-typed response DTOs against `ums-core`'s real Organization module source
 * (`UMS.Modules.Organization.Api`) -- `OrganizationApiService`'s generated methods all return
 * `Observable<any>`. Request-body types are re-exported from `@ums/shared` where usable; two are
 * NOT re-exported because the generator itself produced broken/unusable shapes for them (see the
 * flagged notes below) -- this app defines its own corrected local types for those two instead.
 */
export type {
  CreateBuildingRequest,
  CreateCampusRequest,
  CreateDepartmentRequest,
  CreateDesignationRequest,
  CreateFacultyRequest,
  CreateProgramRequest,
  CreateUniversityRequest,
} from '@ums/shared';

/**
 * FLAGGED GENERATED-CLIENT BUG: `@ums/shared`'s generated `CreateRoomRequest.capacity` is typed
 * as `CreateRoomRequestCapacity | null`, an EMPTY interface (`{}`) -- the OpenAPI generator
 * mangled ums-core's real `int? Capacity` into a useless empty object shape instead of `number`.
 * This app defines its own corrected request shape and casts through it when calling the
 * generated method (see `organization.api.ts`) rather than propagating the broken type.
 */
export interface CreateRoomRequest {
  readonly buildingId: string;
  readonly name: string;
  readonly capacity: number | null;
  readonly roomType: string | null;
}

/**
 * FLAGGED GENERATED-CLIENT BUG: `@ums/shared`'s generated `DeactivateRequestBody.version` is
 * typed as `DeactivateRequestBodyVersion`, another empty-interface mangling of ums-core's real
 * `uint Version` (optimistic-concurrency) field. Corrected locally, cast through at the call site.
 */
export interface DeactivateRequestBody {
  readonly version: number;
}

export interface UniversityDto {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly version: number;
}

export interface CampusDto {
  readonly id: string;
  readonly universityId: string;
  readonly name: string;
  readonly status: string;
  readonly createdAt: string;
  readonly version: number;
}

export interface FacultyDto {
  readonly id: string;
  readonly campusId: string;
  readonly name: string;
  readonly localizedName: string;
  readonly status: string;
  readonly createdAt: string;
  readonly version: number;
}

export interface DepartmentDto {
  readonly id: string;
  readonly facultyId: string;
  readonly name: string;
  readonly localizedName: string;
  readonly status: string;
  readonly createdAt: string;
  readonly version: number;
}

export interface ProgramDto {
  readonly id: string;
  readonly departmentId: string;
  readonly name: string;
  readonly localizedName: string;
  readonly status: string;
  readonly createdAt: string;
  readonly version: number;
}

export interface DesignationDto {
  readonly id: string;
  readonly title: string;
  readonly localizedTitle: string;
  readonly createdAt: string;
}

export interface BuildingDto {
  readonly id: string;
  readonly campusId: string;
  readonly name: string;
  readonly code: string | null;
  readonly createdAt: string;
}

export interface RoomDto {
  readonly id: string;
  readonly buildingId: string;
  readonly name: string;
  readonly capacity: number | null;
  readonly roomType: string | null;
  readonly createdAt: string;
}

export interface ListPage<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}
