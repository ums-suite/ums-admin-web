/**
 * ADMIN-18/ADMIN-21/ADMIN-22/ADMIN-23: hand-typed DTOs against `ums-core`'s real Academic module
 * source (`UMS.Modules.Academic.Application.{Programs,Curricula,Courses,CourseOfferings,
 * AcademicSessions,Grades,ResultPublications}`) -- `@ums/shared` has no generated Academic client
 * (same confirmed gap as Admission/Student/Finance/Faculty). Every shape below is read directly off
 * the real C# `record` DTOs, not guessed -- see each interface's own doc for the source file.
 *
 * **A genuine cross-module naming collision, confirmed real, not a typo in this app**: Academic
 * has its OWN `Program` entity (`ProgramDto` below -- `DepartmentId`/`Code`/`Name` plus
 * curriculum-specific `MaxCreditsPerSemester`/`RequiresAdvisorApproval`), entirely distinct from
 * Organization's own `ProgramDto` (`organization.types.ts` -- an org-hierarchy node with
 * `status`/`version`, already built in ADMIN-12). The two are unrelated aggregates in different
 * modules that happen to share an English name; `AcademicProgramDto` is this app's own
 * disambiguating alias so both can be imported in the same file without a naming clash.
 *
 * **Confirmed backend gaps, not invented workarounds**:
 * - No PUT/PATCH/DELETE exists anywhere for Program/Curriculum/Course/AcademicSession/
 *   CourseOffering -- only `POST` (create) + `GET /{id}` (read by id). These are effectively
 *   create-once/immutable-metadata resources from this app's perspective.
 * - No DTO in this module carries a `version`/optimistic-concurrency field (unlike Student's
 *   `StudentDto.version`) -- Academic's own high-stakes batch transitions (Grade/ResultPublication)
 *   are guarded server-side by a state-guarded conditional `UPDATE ... WHERE status = @expected`
 *   instead, surfaced to this app as a named `409` (see `academic.api.ts`'s own doc), never a
 *   client-supplied version.
 * - Exam/Assessment (`ExamDto`/`AssessmentDto` below) carries NO date/time/room/examiner field at
 *   all -- it is purely a named, weighted container of gradable components used only to compute a
 *   Grade's weighted score (`GradeCalculator`). There is also no `RoomId`/`BuildingId` anywhere in
 *   this module, despite Organization's own `Room` doc naming "Academic (exam-room scheduling)" as
 *   an intended future consumer. ADMIN-21's "exam creation, scheduling, room allocation, and
 *   examiner assignment" is therefore, honestly, only "exam+assessment weight configuration" today
 *   -- scheduling/room/examiner assignment has no backend surface to build against yet, flagged
 *   explicitly rather than invented.
 * - No dedicated `GradeCorrection`/`GradeCorrectionRequest` workflow entity exists -- a correction
 *   (`POST /grades/{id}/correct`) re-enters the SAME `ResultPublication` batch state machine at
 *   `Verified`, which then needs the ordinary `approve`/`publish` steps again to re-publish. There
 *   is no separate per-correction "Department Head reviews this one correction" gate beyond
 *   whichever real role holds `academic.grade.correct` vs `academic.result.approve` --
 *   `grading-workspace.component.ts`'s own doc explains how this app surfaces that honestly.
 */

// ---- Academic's own Program (see this file's own doc for the Organization-Program distinction) ----

export interface AcademicProgramDto {
  readonly id: string;
  readonly departmentId: string;
  readonly code: string;
  readonly name: string;
  readonly maxCreditsPerSemester: number;
  readonly requiresAdvisorApproval: boolean;
  readonly createdAt: string;
}

export interface CreateAcademicProgramRequest {
  readonly departmentId: string;
  readonly code: string;
  readonly name: string;
  readonly maxCreditsPerSemester: number;
  readonly requiresAdvisorApproval: boolean;
}

// ---- AcademicSession / Semester ----

export interface SemesterDto {
  readonly id: string;
  readonly name: string;
  readonly registrationStart: string;
  readonly registrationEnd: string;
  readonly dropStart: string;
  readonly dropEnd: string;
}

export interface CreateSemesterRequest {
  readonly name: string;
  readonly registrationStart: string;
  readonly registrationEnd: string;
  readonly dropStart: string;
  readonly dropEnd: string;
}

export interface AcademicSessionDto {
  readonly id: string;
  readonly code: string;
  readonly semesters: readonly SemesterDto[];
  readonly createdAt: string;
}

export interface CreateAcademicSessionRequest {
  readonly code: string;
  readonly semesters: readonly CreateSemesterRequest[];
}

// ---- Course (prerequisites are set at creation only -- no confirmed "add prerequisite" endpoint) ----

export interface CourseDto {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly creditHours: number;
  readonly prerequisites: readonly string[];
  readonly createdAt: string;
}

export interface CreateCourseRequest {
  readonly code: string;
  readonly title: string;
  readonly creditHours: number;
  readonly prerequisiteCourseIds: readonly string[] | null;
}

// ---- Curriculum (a versioned, purely administrative course list -- NOT consulted by the ----
// ---- enrollment-time prerequisite gate, which reads Course.Prerequisites directly) ----

export interface CurriculumCourseEntryDto {
  readonly courseId: string;
  readonly isRequired: boolean;
}

export interface CurriculumDto {
  readonly id: string;
  readonly programId: string;
  readonly version: number;
  readonly courses: readonly CurriculumCourseEntryDto[];
  readonly createdAt: string;
}

export interface CreateCurriculumRequest {
  readonly programId: string;
  readonly version: number;
  readonly courses: readonly CurriculumCourseEntryDto[];
}

// ---- CourseOffering / Section / Exam / Assessment ----

export interface SectionDto {
  readonly id: string;
  readonly code: string;
  readonly dayOfWeek: string;
  readonly start: string;
  readonly end: string;
}

export interface CreateSectionRequest {
  readonly code: string;
  readonly dayOfWeek: string;
  readonly start: string;
  readonly end: string;
}

export interface AssessmentDto {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
}

export interface CreateAssessmentRequest {
  readonly name: string;
  /** A fraction of 1.0 -- the total across all Exams on one CourseOffering must not exceed 1.0. */
  readonly weight: number;
}

export interface ExamDto {
  readonly id: string;
  readonly name: string;
  readonly assessments: readonly AssessmentDto[];
}

export interface CreateExamRequest {
  readonly name: string;
  readonly assessments: readonly CreateAssessmentRequest[];
}

export interface CourseOfferingDto {
  readonly id: string;
  readonly courseId: string;
  readonly semesterId: string;
  readonly departmentId: string;
  readonly capacity: number;
  readonly enrolledCount: number;
  readonly hasAvailableSeats: boolean;
  readonly instructorFacultyMemberId: string | null;
  readonly sections: readonly SectionDto[];
  readonly exams: readonly ExamDto[];
  readonly createdAt: string;
}

export interface CreateCourseOfferingRequest {
  readonly courseId: string;
  readonly semesterId: string;
  readonly departmentId: string;
  readonly capacity: number;
  readonly sections: readonly CreateSectionRequest[];
}

export interface AssignInstructorRequest {
  readonly facultyMemberId: string;
}

// ---- Grade / Grade correction ----

export interface AssessmentScoreDto {
  readonly assessmentId: string;
  readonly score: number;
}

export interface GradeDto {
  readonly id: string;
  readonly enrollmentId: string;
  readonly calculatedScore: number | null;
  readonly letterGrade: string | null;
  readonly scores: readonly AssessmentScoreDto[];
  readonly submittedAt: string | null;
}

export interface SubmitGradeRequest {
  readonly enrollmentId: string;
  readonly scores: readonly AssessmentScoreDto[];
}

export interface CorrectGradeRequest {
  readonly scores: readonly AssessmentScoreDto[];
  /** Mandatory server-side (the service throws on a blank reason) -- never a raw edit, requirement-spec.md §8 invariant #3. */
  readonly reason: string;
}

// ---- ResultPublication (the per-CourseOffering grade batch) ----

export type ResultPublicationStatus =
  'Draft' | 'Calculated' | 'Verified' | 'Approved' | 'Published' | 'Archived';

export interface ResultPublicationDto {
  readonly id: string;
  readonly courseOfferingId: string;
  readonly status: ResultPublicationStatus | string;
  readonly calculatedAt: string | null;
  readonly rejectedAt: string | null;
  readonly rejectionReason: string | null;
  readonly lockedAt: string | null;
  readonly approvedAt: string | null;
  readonly publishedAt: string | null;
  readonly archivedAt: string | null;
  readonly correctionCount: number;
}

export interface RejectGradeBatchRequest {
  readonly reason: string;
}
