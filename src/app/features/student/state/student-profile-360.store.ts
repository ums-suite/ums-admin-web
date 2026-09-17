import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { DocumentsApi } from '../../documents/documents.api';
import type {
  GenerateDocumentRequest,
  GeneratedDocumentDto,
} from '../../documents/documents.types';
import { StudentApi } from '../student.api';
import type { StudentDto, StudentRequestDto } from '../student.types';

interface StudentProfile360State {
  readonly student: StudentDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly documents: readonly GeneratedDocumentDto[];
  readonly documentsError: string | null;
  readonly studentRequest: StudentRequestDto | null;
  readonly requestError: string | null;
}

const initialState: StudentProfile360State = {
  student: null,
  isLoading: false,
  error: null,
  documents: [],
  documentsError: null,
  studentRequest: null,
  requestError: null,
};

/**
 * ADMIN-17: Student 360 profile state -- one Student's detail plus its two real cross-module
 * extensions the confirmed backend surface actually supports today: generated Documents (via
 * `DocumentsApi`, ad hoc per `documents/state/documents.store.ts`'s own scaffold note) and a
 * single looked-up `StudentRequest` (no queue/list endpoint exists, see `student.types.ts`).
 * Academic/Financial/Hostel/Library tabs have no student-scoped read endpoint to call yet --
 * those modules' own admin screens (ADMIN-18+, ADMIN-24, ADMIN-27, ADMIN-29) are separate,
 * later tickets this store does not reach into.
 */
export const StudentProfile360Store = signalStore(
  { providedIn: 'root' },
  withState<StudentProfile360State>(initialState),
  withMethods((store, studentApi = inject(StudentApi), documentsApi = inject(DocumentsApi)) => ({
    loadStudent(id: string): void {
      patchState(store, { isLoading: true, error: null });
      studentApi.getStudentById(id).subscribe({
        next: (student) => patchState(store, { student, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadDocuments(ownerId: string): void {
      patchState(store, { documentsError: null });
      documentsApi.listForOwner(ownerId).subscribe({
        next: (documents) => patchState(store, { documents }),
        error: (e: unknown) => patchState(store, { documentsError: toUmsApiError(e).message }),
      });
    },
    generateDocument: (request: GenerateDocumentRequest) =>
      documentsApi
        .generate(request)
        .pipe(
          tap(() =>
            documentsApi
              .listForOwner(request.ownerId)
              .subscribe((documents) => patchState(store, { documents })),
          ),
        ),
    loadStudentRequest(id: string): void {
      patchState(store, { requestError: null });
      studentApi.getStudentRequestById(id).subscribe({
        next: (studentRequest) => patchState(store, { studentRequest }),
        error: (e: unknown) => patchState(store, { requestError: toUmsApiError(e).message }),
      });
    },
    approveStudentRequest: (id: string, version: number) =>
      studentApi
        .approveStudentRequest(id, { version })
        .pipe(tap((studentRequest) => patchState(store, { studentRequest }))),
    rejectStudentRequest: (id: string, reason: string, version: number) =>
      studentApi
        .rejectStudentRequest(id, { reason, version })
        .pipe(tap((studentRequest) => patchState(store, { studentRequest }))),
  })),
);
