/**
 * ADMIN-26: hand-typed DTOs against `ums-core`'s real Faculty module source
 * (`UMS.Modules.Faculty.Application.{FacultyMembers,CourseAssignments,LeaveRequests,
 * ResearchProfiles}`) -- `@ums/shared` has no generated Faculty client (same confirmed gap as
 * every other non-Identity/Audit/Organization module in this app). Cross-references Academic
 * (CourseOffering) and Organization (Designation) by opaque id only, per ADR-0002's module
 * boundary -- Faculty never duplicates either entity's own fields.
 *
 * **CONFIRMED GAPS, not invented workarounds**:
 * - No `EmploymentHistory` sub-entity/endpoint exists at all -- "employment history" is, honestly,
 *   just `FacultyMember`'s own flat, current-state fields (department/designation/employment type/
 *   joining date); there is no historical record to browse.
 * - `FacultyMember` list is filterable by `departmentId` only -- no name/employeeId search.
 * - `CourseAssignment` is a READ-ONLY, eventually-consistent projection into Faculty of Academic's
 *   own authoritative instructor assignment (populated via outbox events) -- creating/reassigning
 *   an instructor happens on `AcademicCourseOfferingsComponent` (ADMIN-18)'s own screen
 *   (`POST /academic/course-offerings/{id}/instructor`), not here. The domain method to UNASSIGN an
 *   instructor exists (`CourseOffering.UnassignInstructor`) but NO HTTP endpoint exposes it anywhere
 *   in `UMS.Modules.Academic.Api` -- there is currently no way to remove an instructor assignment
 *   via any confirmed real route.
 * - `LeaveRequest`'s two-stage chain has NO delegate/escalation mechanism for a reviewer on leave
 *   (confirmed absent by direct source read) -- see `academic-grading.component.ts`'s own doc for
 *   this app's honest interim workaround (temporary Role/ScopeGrant reassignment via ADMIN-11).
 * - Faculty attendance has NO read/list endpoint anywhere -- only `POST /academic/attendance`
 *   (mark/create). "Attendance oversight" therefore has no real screen to build against yet.
 * - `ResearchProfile` has NO moderation flag/state machine or approve-for-publication endpoint --
 *   the single `PUT` (held by either `faculty.research.update` HR-wide, or `faculty.research.publish`
 *   ownership-scoped) is immediately live on the public, anonymous `GET`. "Moderation" here is
 *   therefore direct editing with full audit-trail visibility, not a review queue.
 */

// ---- FacultyMember ----

export type FacultyMemberStatus = 'Active' | 'OnLeave' | 'Suspended' | 'Separated';
export type EmploymentType = 'FullTime' | 'PartTime' | 'Adjunct' | 'Visiting';

export interface FacultyMemberDto {
  readonly id: string;
  readonly userId: string;
  readonly employeeId: string;
  readonly departmentId: string;
  readonly designationId: string;
  readonly employmentType: EmploymentType | string;
  readonly status: FacultyMemberStatus | string;
  readonly isDepartmentHead: boolean;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly joiningDate: string;
  readonly createdAt: string;
  readonly version: number;
}

export interface FacultyMemberListPage {
  readonly items: readonly FacultyMemberDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}

export interface OnboardFacultyMemberRequest {
  readonly userId: string;
  readonly employeeId: string;
  readonly departmentId: string;
  readonly designationId: string;
  readonly employmentType: EmploymentType | string;
  readonly isDepartmentHead: boolean;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly joiningDate: string;
}

export interface UpdateEmploymentDetailsRequest {
  readonly departmentId: string;
  readonly designationId: string;
  readonly employmentType: EmploymentType | string;
  readonly isDepartmentHead: boolean;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly version: number;
}

export interface ChangeFacultyMemberStatusRequest {
  readonly status: FacultyMemberStatus | string;
  readonly version: number;
}

/** The exact shape a `409` on any versioned Faculty endpoint carries -- mirrors Student's own `StudentStatusConflict` precedent. */
export interface FacultyVersionConflict {
  readonly currentState?: FacultyMemberDto;
}

// ---- CourseAssignment (read-only projection -- see class doc) ----

export type CourseAssignmentStatus = 'Active' | 'Ended';

export interface CourseAssignmentDto {
  readonly id: string;
  readonly facultyMemberId: string;
  readonly courseOfferingId: string;
  readonly status: CourseAssignmentStatus | string;
  readonly assignedAt: string;
  readonly endedAt: string | null;
}

// ---- LeaveRequest ----

export type LeaveRequestStatus =
  'Draft' | 'Submitted' | 'DeptHeadApproved' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequestDto {
  readonly id: string;
  readonly facultyMemberId: string;
  readonly requesterUserId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string;
  readonly localizedReason: string;
  readonly status: LeaveRequestStatus | string;
  readonly routedDirectlyToAuthority: boolean;
  readonly supportingDocumentReference: string | null;
  readonly createdAt: string;
  readonly submittedAt: string | null;
  readonly decidedAt: string | null;
  readonly version: number;
}

export interface LeaveRequestListPage {
  readonly items: readonly LeaveRequestDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}

export interface SubmitLeaveRequestRequest {
  readonly facultyMemberId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string;
}

export interface VersionedRequestBody {
  readonly version: number;
}

export interface RejectLeaveRequestRequest {
  readonly reason: string | null;
  readonly version: number;
}

// ---- ResearchProfile (no moderation state machine -- see class doc) ----

export interface PublicationDto {
  readonly title: string;
  readonly venue: string;
  readonly year: number;
  readonly url: string | null;
}

export interface ResearchProfileDto {
  readonly id: string;
  readonly facultyMemberId: string;
  readonly publications: readonly PublicationDto[];
  readonly ongoingResearch: string | null;
  readonly grants: string | null;
  readonly version: number;
}

export interface UpdateResearchProfileRequest {
  readonly publications: readonly PublicationDto[];
  readonly ongoingResearch: string | null;
  readonly grants: string | null;
  readonly version: number;
}
