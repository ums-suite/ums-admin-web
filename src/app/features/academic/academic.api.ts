import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  AcademicProgramDto,
  AcademicSessionDto,
  AssignInstructorRequest,
  CorrectGradeRequest,
  CourseDto,
  CourseOfferingDto,
  CreateAcademicProgramRequest,
  CreateAcademicSessionRequest,
  CreateCourseOfferingRequest,
  CreateCourseRequest,
  CreateCurriculumRequest,
  CreateExamRequest,
  CurriculumDto,
  GradeDto,
  RejectGradeBatchRequest,
  ResultPublicationDto,
  SubmitGradeRequest,
} from './academic.types';

/**
 * ADMIN-18/ADMIN-21/ADMIN-22/ADMIN-23: hand-rolled thin client for `ums-core`'s Academic module --
 * see `academic.types.ts`'s own doc for the confirmed backend gaps this client is honest about
 * (no PUT/PATCH/DELETE anywhere, no `version` field, no Exam room/schedule/examiner fields, no
 * dedicated GradeCorrection entity, and -- the one that most shapes this client's own shape below
 * -- **no `GET` endpoint for `ResultPublication` by `courseOfferingId` at all**. Every one of its
 * five real routes is a `POST` transition that happens to also RETURN the current
 * {@link ResultPublicationDto} -- that returned value is the only way this app ever learns the
 * batch's current status; see `academic-result-publication.component.ts`'s own doc for how the UI
 * works around never being able to pre-load it.
 */
@Injectable({ providedIn: 'root' })
export class AcademicApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/academic`;
  }

  // ---- Academic Program (distinct from Organization's own Program -- see academic.types.ts) ----

  createProgram(request: CreateAcademicProgramRequest): Observable<AcademicProgramDto> {
    return this.http.post<AcademicProgramDto>(`${this.baseUrl}/programs`, request);
  }

  getProgramById(id: string): Observable<AcademicProgramDto> {
    return this.http.get<AcademicProgramDto>(`${this.baseUrl}/programs/${id}`);
  }

  // ---- AcademicSession / Semester ----

  createAcademicSession(request: CreateAcademicSessionRequest): Observable<AcademicSessionDto> {
    return this.http.post<AcademicSessionDto>(`${this.baseUrl}/academic-sessions`, request);
  }

  getAcademicSessionById(id: string): Observable<AcademicSessionDto> {
    return this.http.get<AcademicSessionDto>(`${this.baseUrl}/academic-sessions/${id}`);
  }

  // ---- Course ----

  createCourse(request: CreateCourseRequest): Observable<CourseDto> {
    return this.http.post<CourseDto>(`${this.baseUrl}/courses`, request);
  }

  getCourseById(id: string): Observable<CourseDto> {
    return this.http.get<CourseDto>(`${this.baseUrl}/courses/${id}`);
  }

  // ---- Curriculum ----

  createCurriculum(request: CreateCurriculumRequest): Observable<CurriculumDto> {
    return this.http.post<CurriculumDto>(`${this.baseUrl}/curriculums`, request);
  }

  getCurriculumById(id: string): Observable<CurriculumDto> {
    return this.http.get<CurriculumDto>(`${this.baseUrl}/curriculums/${id}`);
  }

  // ---- CourseOffering / Section / instructor / Exam+Assessment (ADMIN-21's only real surface) ----

  createCourseOffering(request: CreateCourseOfferingRequest): Observable<CourseOfferingDto> {
    return this.http.post<CourseOfferingDto>(`${this.baseUrl}/course-offerings`, request);
  }

  listCourseOfferingsBySemester(semesterId: string): Observable<readonly CourseOfferingDto[]> {
    return this.http.get<readonly CourseOfferingDto[]>(`${this.baseUrl}/course-offerings`, {
      params: { semester: semesterId },
    });
  }

  getCourseOfferingById(id: string): Observable<CourseOfferingDto> {
    return this.http.get<CourseOfferingDto>(`${this.baseUrl}/course-offerings/${id}`);
  }

  assignInstructor(
    courseOfferingId: string,
    request: AssignInstructorRequest,
  ): Observable<CourseOfferingDto> {
    return this.http.post<CourseOfferingDto>(
      `${this.baseUrl}/course-offerings/${courseOfferingId}/instructor`,
      request,
    );
  }

  addExam(courseOfferingId: string, request: CreateExamRequest): Observable<CourseOfferingDto> {
    return this.http.post<CourseOfferingDto>(
      `${this.baseUrl}/course-offerings/${courseOfferingId}/exams`,
      request,
    );
  }

  // ---- Grade / Grade correction ----

  submitGrade(request: SubmitGradeRequest): Observable<GradeDto> {
    return this.http.post<GradeDto>(`${this.baseUrl}/grades`, request);
  }

  correctGrade(gradeId: string, request: CorrectGradeRequest): Observable<GradeDto> {
    return this.http.post<GradeDto>(`${this.baseUrl}/grades/${gradeId}/correct`, request);
  }

  // ---- ResultPublication (per-CourseOffering grade batch) -- POST-only, see class doc ----

  lockResultPublication(courseOfferingId: string): Observable<ResultPublicationDto> {
    return this.http.post<ResultPublicationDto>(
      `${this.baseUrl}/results/${courseOfferingId}/lock`,
      {},
    );
  }

  rejectResultPublication(
    courseOfferingId: string,
    request: RejectGradeBatchRequest,
  ): Observable<ResultPublicationDto> {
    return this.http.post<ResultPublicationDto>(
      `${this.baseUrl}/results/${courseOfferingId}/reject`,
      request,
    );
  }

  approveResultPublication(courseOfferingId: string): Observable<ResultPublicationDto> {
    return this.http.post<ResultPublicationDto>(
      `${this.baseUrl}/results/${courseOfferingId}/approve`,
      {},
    );
  }

  publishResultPublication(courseOfferingId: string): Observable<ResultPublicationDto> {
    return this.http.post<ResultPublicationDto>(
      `${this.baseUrl}/results/${courseOfferingId}/publish`,
      {},
    );
  }

  archiveResultPublication(courseOfferingId: string): Observable<ResultPublicationDto> {
    return this.http.post<ResultPublicationDto>(
      `${this.baseUrl}/results/${courseOfferingId}/archive`,
      {},
    );
  }
}
