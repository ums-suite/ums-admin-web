import { Injectable, inject } from '@angular/core';
import { OrganizationApiService } from '@ums/shared';
import { Observable } from 'rxjs';
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
  DeactivateRequestBody,
  DepartmentDto,
  DesignationDto,
  FacultyDto,
  ListPage,
  ProgramDto,
  RoomDto,
  UniversityDto,
} from './organization.types';

/**
 * ADMIN-12: typed wrapper over `@ums/shared`'s generated `OrganizationApiService`. Every route
 * below is confirmed real against `ums-core`'s `UMS.Modules.Organization.Api` source.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationApi {
  private readonly api = inject(OrganizationApiService);

  listUniversities(skip: number, take: number): Observable<ListPage<UniversityDto>> {
    return this.api.apiV1OrganizationUniversitiesGet(skip, take) as Observable<
      ListPage<UniversityDto>
    >;
  }

  createUniversity(request: CreateUniversityRequest): Observable<UniversityDto> {
    return this.api.apiV1OrganizationUniversitiesPost(request) as Observable<UniversityDto>;
  }

  listCampuses(
    universityId: string | undefined,
    skip: number,
    take: number,
  ): Observable<ListPage<CampusDto>> {
    return this.api.apiV1OrganizationCampusesGet(universityId, skip, take) as Observable<
      ListPage<CampusDto>
    >;
  }

  createCampus(request: CreateCampusRequest): Observable<CampusDto> {
    return this.api.apiV1OrganizationCampusesPost(request) as Observable<CampusDto>;
  }

  listFaculties(
    campusId: string | undefined,
    skip: number,
    take: number,
  ): Observable<ListPage<FacultyDto>> {
    return this.api.apiV1OrganizationFacultiesGet(campusId, skip, take) as Observable<
      ListPage<FacultyDto>
    >;
  }

  createFaculty(request: CreateFacultyRequest): Observable<FacultyDto> {
    return this.api.apiV1OrganizationFacultiesPost(request) as Observable<FacultyDto>;
  }

  deactivateFaculty(id: string, body: DeactivateRequestBody): Observable<unknown> {
    return this.api.apiV1OrganizationFacultiesIdDeactivatePost(id, body as never);
  }

  listDepartments(
    facultyId: string | undefined,
    skip: number,
    take: number,
  ): Observable<ListPage<DepartmentDto>> {
    return this.api.apiV1OrganizationDepartmentsGet(facultyId, skip, take) as Observable<
      ListPage<DepartmentDto>
    >;
  }

  createDepartment(request: CreateDepartmentRequest): Observable<DepartmentDto> {
    return this.api.apiV1OrganizationDepartmentsPost(request) as Observable<DepartmentDto>;
  }

  deactivateDepartment(id: string, body: DeactivateRequestBody): Observable<unknown> {
    return this.api.apiV1OrganizationDepartmentsIdDeactivatePost(id, body as never);
  }

  listPrograms(
    departmentId: string | undefined,
    skip: number,
    take: number,
  ): Observable<ListPage<ProgramDto>> {
    return this.api.apiV1OrganizationProgramsGet(departmentId, skip, take) as Observable<
      ListPage<ProgramDto>
    >;
  }

  createProgram(request: CreateProgramRequest): Observable<ProgramDto> {
    return this.api.apiV1OrganizationProgramsPost(request) as Observable<ProgramDto>;
  }

  deactivateProgram(id: string, body: DeactivateRequestBody): Observable<unknown> {
    return this.api.apiV1OrganizationProgramsIdDeactivatePost(id, body as never);
  }

  listDesignations(skip: number, take: number): Observable<ListPage<DesignationDto>> {
    return this.api.apiV1OrganizationDesignationsGet(skip, take) as Observable<
      ListPage<DesignationDto>
    >;
  }

  createDesignation(request: CreateDesignationRequest): Observable<DesignationDto> {
    return this.api.apiV1OrganizationDesignationsPost(request) as Observable<DesignationDto>;
  }

  listBuildings(
    campusId: string | undefined,
    skip: number,
    take: number,
  ): Observable<ListPage<BuildingDto>> {
    return this.api.apiV1OrganizationBuildingsGet(campusId, skip, take) as Observable<
      ListPage<BuildingDto>
    >;
  }

  createBuilding(request: CreateBuildingRequest): Observable<BuildingDto> {
    return this.api.apiV1OrganizationBuildingsPost(request) as Observable<BuildingDto>;
  }

  deleteBuilding(id: string): Observable<unknown> {
    return this.api.apiV1OrganizationBuildingsIdDelete(id);
  }

  listRoomsForBuilding(
    buildingId: string,
    skip: number,
    take: number,
  ): Observable<ListPage<RoomDto>> {
    return this.api.apiV1OrganizationBuildingsIdRoomsGet(buildingId, skip, take) as Observable<
      ListPage<RoomDto>
    >;
  }

  createRoom(request: CreateRoomRequest): Observable<RoomDto> {
    // FLAGGED GENERATED-CLIENT BUG: see organization.types.ts's own doc -- the generated
    // CreateRoomRequest.capacity type is an unusable empty interface, so this cast is required.
    return this.api.apiV1OrganizationRoomsPost(request as never) as Observable<RoomDto>;
  }

  deleteRoom(id: string): Observable<unknown> {
    return this.api.apiV1OrganizationRoomsIdDelete(id);
  }
}
