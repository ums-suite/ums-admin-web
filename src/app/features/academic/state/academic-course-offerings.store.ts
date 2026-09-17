import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { AcademicApi } from '../academic.api';
import type {
  AssignInstructorRequest,
  CourseOfferingDto,
  CreateCourseOfferingRequest,
  CreateExamRequest,
} from '../academic.types';

interface AcademicCourseOfferingsState {
  readonly currentOffering: CourseOfferingDto | null;
  readonly offeringsBySemester: readonly CourseOfferingDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: AcademicCourseOfferingsState = {
  currentOffering: null,
  offeringsBySemester: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-18 (CourseOffering/Section, seat-limit config) + ADMIN-21 (Exam/Assessment configuration
 * and instructor assignment -- the only two real, confirmed levers `ums-core`'s Academic module
 * exposes for "exam creation, scheduling, room allocation, and examiner assignment"; scheduling/
 * room/examiner have no backend field to bind to at all, see `academic.types.ts`'s own doc).
 *
 * Unlike Program/Course/Curriculum/AcademicSession, CourseOffering DOES have a real list endpoint
 * (`GET /course-offerings?semester=`) -- `offeringsBySemester` reflects that.
 */
export const AcademicCourseOfferingsStore = signalStore(
  { providedIn: 'root' },
  withState<AcademicCourseOfferingsState>(initialState),
  withMethods((store, api = inject(AcademicApi)) => ({
    loadOffering(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getCourseOfferingById(id).subscribe({
        next: (offering) => patchState(store, { currentOffering: offering, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadOfferingsBySemester(semesterId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listCourseOfferingsBySemester(semesterId).subscribe({
        next: (offerings) =>
          patchState(store, { offeringsBySemester: offerings, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createOffering: (request: CreateCourseOfferingRequest) =>
      api
        .createCourseOffering(request)
        .pipe(tap((offering) => patchState(store, { currentOffering: offering, error: null }))),
    assignInstructor: (offeringId: string, request: AssignInstructorRequest) =>
      api
        .assignInstructor(offeringId, request)
        .pipe(tap((offering) => patchState(store, { currentOffering: offering }))),
    addExam: (offeringId: string, request: CreateExamRequest) =>
      api
        .addExam(offeringId, request)
        .pipe(tap((offering) => patchState(store, { currentOffering: offering }))),
  })),
);
