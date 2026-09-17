import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  ChangeFacultyMemberStatusRequest,
  CourseAssignmentDto,
  FacultyMemberDto,
  FacultyMemberListPage,
  LeaveRequestDto,
  LeaveRequestListPage,
  OnboardFacultyMemberRequest,
  RejectLeaveRequestRequest,
  ResearchProfileDto,
  SubmitLeaveRequestRequest,
  UpdateEmploymentDetailsRequest,
  UpdateResearchProfileRequest,
  VersionedRequestBody,
} from './faculty.types';

/**
 * ADMIN-26: hand-rolled thin client for `ums-core`'s Faculty module -- see `faculty.types.ts`'s
 * own doc for the confirmed gaps (no EmploymentHistory, department-id-only member filtering,
 * CourseAssignment is read-only here, no LeaveRequest delegate mechanism, no Attendance read
 * endpoint at all, no ResearchProfile moderation state).
 */
@Injectable({ providedIn: 'root' })
export class FacultyApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/faculty`;
  }

  // ---- FacultyMember ----

  listFacultyMembers(departmentId: string, skip = 0, take = 50): Observable<FacultyMemberListPage> {
    const params = new HttpParams()
      .set('departmentId', departmentId)
      .set('skip', skip)
      .set('take', take);
    return this.http.get<FacultyMemberListPage>(`${this.baseUrl}/members/`, { params });
  }

  getFacultyMemberById(id: string): Observable<FacultyMemberDto> {
    return this.http.get<FacultyMemberDto>(`${this.baseUrl}/members/${id}`);
  }

  onboardFacultyMember(request: OnboardFacultyMemberRequest): Observable<FacultyMemberDto> {
    return this.http.post<FacultyMemberDto>(`${this.baseUrl}/members/`, request);
  }

  updateEmploymentDetails(
    id: string,
    request: UpdateEmploymentDetailsRequest,
  ): Observable<FacultyMemberDto> {
    return this.http.patch<FacultyMemberDto>(`${this.baseUrl}/members/${id}`, request);
  }

  changeFacultyMemberStatus(
    id: string,
    request: ChangeFacultyMemberStatusRequest,
  ): Observable<FacultyMemberDto> {
    return this.http.post<FacultyMemberDto>(`${this.baseUrl}/members/${id}/status`, request);
  }

  // ---- CourseAssignment -- read-only projection, see faculty.types.ts's own doc ----

  listCourseAssignments(facultyMemberId: string): Observable<readonly CourseAssignmentDto[]> {
    const params = new HttpParams().set('facultyMemberId', facultyMemberId);
    return this.http.get<readonly CourseAssignmentDto[]>(`${this.baseUrl}/course-assignments`, {
      params,
    });
  }

  // ---- LeaveRequest ----

  listLeaveRequests(
    facultyMemberId: string,
    skip = 0,
    take = 50,
  ): Observable<LeaveRequestListPage> {
    const params = new HttpParams()
      .set('facultyMemberId', facultyMemberId)
      .set('skip', skip)
      .set('take', take);
    return this.http.get<LeaveRequestListPage>(`${this.baseUrl}/leave-requests`, { params });
  }

  submitLeaveRequest(request: SubmitLeaveRequestRequest): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(`${this.baseUrl}/leave-requests`, request);
  }

  approveByDepartmentHead(id: string, request: VersionedRequestBody): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(
      `${this.baseUrl}/leave-requests/${id}/approve/department-head`,
      request,
    );
  }

  approveByAuthority(id: string, request: VersionedRequestBody): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(
      `${this.baseUrl}/leave-requests/${id}/approve/authority`,
      request,
    );
  }

  rejectByDepartmentHead(
    id: string,
    request: RejectLeaveRequestRequest,
  ): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(
      `${this.baseUrl}/leave-requests/${id}/reject/department-head`,
      request,
    );
  }

  rejectByAuthority(id: string, request: RejectLeaveRequestRequest): Observable<LeaveRequestDto> {
    return this.http.post<LeaveRequestDto>(
      `${this.baseUrl}/leave-requests/${id}/reject/authority`,
      request,
    );
  }

  // ---- ResearchProfile -- no moderation state machine, see faculty.types.ts's own doc ----

  getResearchProfile(facultyMemberId: string): Observable<ResearchProfileDto> {
    return this.http.get<ResearchProfileDto>(
      `${this.baseUrl}/members/${facultyMemberId}/research-profile`,
    );
  }

  updateResearchProfile(
    facultyMemberId: string,
    request: UpdateResearchProfileRequest,
  ): Observable<ResearchProfileDto> {
    return this.http.put<ResearchProfileDto>(
      `${this.baseUrl}/members/${facultyMemberId}/research-profile`,
      request,
    );
  }
}
