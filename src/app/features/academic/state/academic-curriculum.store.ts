import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { AcademicApi } from '../academic.api';
import type {
  AcademicProgramDto,
  AcademicSessionDto,
  CourseDto,
  CreateAcademicProgramRequest,
  CreateAcademicSessionRequest,
  CreateCourseRequest,
  CreateCurriculumRequest,
  CurriculumDto,
} from '../academic.types';

interface AcademicCurriculumState {
  readonly currentProgram: AcademicProgramDto | null;
  readonly currentSession: AcademicSessionDto | null;
  readonly currentCourse: CourseDto | null;
  readonly currentCurriculum: CurriculumDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: AcademicCurriculumState = {
  currentProgram: null,
  currentSession: null,
  currentCourse: null,
  currentCurriculum: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-18: Curriculum versioning + (Academic's own) Program/AcademicSession/Course foundation
 * config -- `ums-core`'s Academic module has no list/search endpoint for any of these (see
 * `academic.types.ts`'s own doc), so this store, like Admission's/Student's own, holds exactly one
 * of each entity at a time, looked up (or just-created) by id.
 */
export const AcademicCurriculumStore = signalStore(
  { providedIn: 'root' },
  withState<AcademicCurriculumState>(initialState),
  withMethods((store, api = inject(AcademicApi)) => ({
    loadProgram(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getProgramById(id).subscribe({
        next: (program) => patchState(store, { currentProgram: program, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createProgram: (request: CreateAcademicProgramRequest) =>
      api
        .createProgram(request)
        .pipe(tap((program) => patchState(store, { currentProgram: program, error: null }))),

    loadAcademicSession(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getAcademicSessionById(id).subscribe({
        next: (session) => patchState(store, { currentSession: session, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createAcademicSession: (request: CreateAcademicSessionRequest) =>
      api
        .createAcademicSession(request)
        .pipe(tap((session) => patchState(store, { currentSession: session, error: null }))),

    loadCourse(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getCourseById(id).subscribe({
        next: (course) => patchState(store, { currentCourse: course, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createCourse: (request: CreateCourseRequest) =>
      api
        .createCourse(request)
        .pipe(tap((course) => patchState(store, { currentCourse: course, error: null }))),

    loadCurriculum(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getCurriculumById(id).subscribe({
        next: (curriculum) =>
          patchState(store, { currentCurriculum: curriculum, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createCurriculum: (request: CreateCurriculumRequest) =>
      api
        .createCurriculum(request)
        .pipe(
          tap((curriculum) => patchState(store, { currentCurriculum: curriculum, error: null })),
        ),
  })),
);
