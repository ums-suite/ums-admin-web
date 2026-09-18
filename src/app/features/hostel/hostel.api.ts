import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  AllocationDto,
  AllocationReviewFlagDto,
  ApplicationWindowDto,
  BedDto,
  BuildingDto,
  CheckOutRequest,
  ComplaintDto,
  CreateApplicationWindowRequest,
  CreateBedRequest,
  CreateBuildingRequest,
  CreateComplaintRequest,
  CreateHostelApplicationRequest,
  CreateHostelRequest,
  CreateRoomRequest,
  HostelApplicationDto,
  HostelDto,
  RankApplicationsResult,
  ResolveComplaintRequest,
  ReviewApplicationRequest,
  RoomDto,
  SetEligibilityRulesRequest,
  SetEligibleProgramsRequest,
  SetEligibleYearsRequest,
  UpdateRoomCapacityRequest,
} from './hostel.types';

/**
 * ADMIN-27/ADMIN-28: hand-rolled thin client for `ums-core`'s Hostel module -- see
 * `hostel.types.ts`'s own doc for the confirmed severe gaps (no bed-status field, no bed-map
 * endpoint, no manual bed-picking, no staff-facing complaint list).
 */
@Injectable({ providedIn: 'root' })
export class HostelApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/hostel`;
  }

  // ---- Inventory ----

  listHostels(): Observable<readonly HostelDto[]> {
    return this.http.get<readonly HostelDto[]>(`${this.baseUrl}/hostels`);
  }

  createHostel(request: CreateHostelRequest): Observable<HostelDto> {
    return this.http.post<HostelDto>(`${this.baseUrl}/hostels`, request);
  }

  listBuildings(hostelId: string): Observable<readonly BuildingDto[]> {
    return this.http.get<readonly BuildingDto[]>(`${this.baseUrl}/hostels/${hostelId}/buildings`);
  }

  createBuilding(hostelId: string, request: CreateBuildingRequest): Observable<BuildingDto> {
    return this.http.post<BuildingDto>(`${this.baseUrl}/hostels/${hostelId}/buildings`, request);
  }

  listRooms(buildingId: string): Observable<readonly RoomDto[]> {
    return this.http.get<readonly RoomDto[]>(`${this.baseUrl}/buildings/${buildingId}/rooms`);
  }

  createRoom(buildingId: string, request: CreateRoomRequest): Observable<RoomDto> {
    return this.http.post<RoomDto>(`${this.baseUrl}/buildings/${buildingId}/rooms`, request);
  }

  updateRoomCapacity(roomId: string, request: UpdateRoomCapacityRequest): Observable<RoomDto> {
    return this.http.patch<RoomDto>(`${this.baseUrl}/rooms/${roomId}/capacity`, request);
  }

  listBeds(roomId: string): Observable<readonly BedDto[]> {
    return this.http.get<readonly BedDto[]>(`${this.baseUrl}/rooms/${roomId}/beds`);
  }

  createBed(roomId: string, request: CreateBedRequest): Observable<BedDto> {
    return this.http.post<BedDto>(`${this.baseUrl}/rooms/${roomId}/beds`, request);
  }

  // ---- Application Windows ----

  listApplicationWindows(): Observable<readonly ApplicationWindowDto[]> {
    return this.http.get<readonly ApplicationWindowDto[]>(`${this.baseUrl}/application-windows`);
  }

  createApplicationWindow(
    request: CreateApplicationWindowRequest,
  ): Observable<ApplicationWindowDto> {
    return this.http.post<ApplicationWindowDto>(`${this.baseUrl}/application-windows`, request);
  }

  getApplicationWindow(id: string): Observable<ApplicationWindowDto> {
    return this.http.get<ApplicationWindowDto>(`${this.baseUrl}/application-windows/${id}`);
  }

  setEligiblePrograms(
    id: string,
    request: SetEligibleProgramsRequest,
  ): Observable<ApplicationWindowDto> {
    return this.http.put<ApplicationWindowDto>(
      `${this.baseUrl}/application-windows/${id}/eligible-programs`,
      request,
    );
  }

  setEligibleYears(id: string, request: SetEligibleYearsRequest): Observable<ApplicationWindowDto> {
    return this.http.put<ApplicationWindowDto>(
      `${this.baseUrl}/application-windows/${id}/eligible-years`,
      request,
    );
  }

  setEligibilityRules(
    id: string,
    request: SetEligibilityRulesRequest,
  ): Observable<ApplicationWindowDto> {
    return this.http.put<ApplicationWindowDto>(
      `${this.baseUrl}/application-windows/${id}/eligibility-rules`,
      request,
    );
  }

  rankApplications(id: string): Observable<RankApplicationsResult> {
    return this.http.post<RankApplicationsResult>(
      `${this.baseUrl}/application-windows/${id}/rank`,
      {},
    );
  }

  // ---- Applications ----

  submitApplication(request: CreateHostelApplicationRequest): Observable<HostelApplicationDto> {
    return this.http.post<HostelApplicationDto>(`${this.baseUrl}/applications`, request);
  }

  myApplications(): Observable<readonly HostelApplicationDto[]> {
    return this.http.get<readonly HostelApplicationDto[]>(`${this.baseUrl}/applications/me`);
  }

  /** Both query params are required server-side. */
  listApplicationsForReview(
    applicationWindowId: string,
    status: string,
  ): Observable<readonly HostelApplicationDto[]> {
    const params = new HttpParams()
      .set('applicationWindowId', applicationWindowId)
      .set('status', status);
    return this.http.get<readonly HostelApplicationDto[]>(`${this.baseUrl}/applications/`, {
      params,
    });
  }

  reviewApplication(
    id: string,
    request: ReviewApplicationRequest,
  ): Observable<HostelApplicationDto> {
    return this.http.post<HostelApplicationDto>(
      `${this.baseUrl}/applications/${id}/review`,
      request,
    );
  }

  withdrawApplication(id: string): Observable<HostelApplicationDto> {
    return this.http.post<HostelApplicationDto>(`${this.baseUrl}/applications/${id}/withdraw`, {});
  }

  // ---- Allocations ----

  myAllocations(): Observable<readonly AllocationDto[]> {
    return this.http.get<readonly AllocationDto[]>(`${this.baseUrl}/allocations/me`);
  }

  checkIn(allocationId: string): Observable<AllocationDto> {
    return this.http.post<AllocationDto>(
      `${this.baseUrl}/allocations/${allocationId}/check-in`,
      {},
    );
  }

  checkOut(allocationId: string, request: CheckOutRequest): Observable<AllocationDto> {
    return this.http.post<AllocationDto>(
      `${this.baseUrl}/allocations/${allocationId}/check-out`,
      request,
    );
  }

  getReviewFlags(allocationId: string): Observable<readonly AllocationReviewFlagDto[]> {
    return this.http.get<readonly AllocationReviewFlagDto[]>(
      `${this.baseUrl}/allocations/${allocationId}/review-flags`,
    );
  }

  // ---- Complaints -- no staff list/GET-by-id endpoint exists, see hostel.types.ts's own doc ----

  submitComplaint(request: CreateComplaintRequest): Observable<ComplaintDto> {
    return this.http.post<ComplaintDto>(`${this.baseUrl}/complaints`, request);
  }

  myComplaints(): Observable<readonly ComplaintDto[]> {
    return this.http.get<readonly ComplaintDto[]>(`${this.baseUrl}/complaints/me`);
  }

  resolveComplaint(id: string, request: ResolveComplaintRequest): Observable<ComplaintDto> {
    return this.http.patch<ComplaintDto>(`${this.baseUrl}/complaints/${id}`, request);
  }
}
