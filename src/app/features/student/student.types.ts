/**
 * ADMIN-15/ADMIN-16/ADMIN-17: hand-typed DTOs against `ums-core`'s real Student module source
 * (`UMS.Modules.Student.Application.Students`/`.BulkImport`) -- `@ums/shared` has no generated
 * `StudentApiService` (same confirmed gap as Admission, see `admission.types.ts`'s own doc).
 *
 * FLAGGED BACKEND GAPS, confirmed by reading the endpoint source directly:
 * - No `GET /student/students` list/search endpoint exists -- only `GET /students/{id}` (staff,
 *   `student.profile.read`) and `GET /students/me` (self). Student search (requirement-spec.md
 *   §3.6) is therefore lookup-by-id only, mirroring Admission's own confirmed gap.
 * - No `POST /students` create endpoint exists -- `CreateStudentRecordRequest`'s own doc comment
 *   confirms it is "STU-1's internal-only command shape," invoked system-to-system from
 *   Admission's own confirm/enrollment flow, never a public admin HTTP route. Student "CRUD" is
 *   therefore Read + Status-change only; there is no admin-facing Create.
 * - No dedicated "transfer to a different Department/Program" endpoint exists -- `StudentStatus`'s
 *   `Transferred` value is a terminal STATUS (via the same `POST /students/{id}/status` this app
 *   already needs for lifecycle transitions), not a `DepartmentId`/`ProgramId` reassignment; those
 *   two fields have no confirmed mutator anywhere in the module. ADMIN-15's "record transfer
 *   between programs/departments" is therefore surfaced as this real `Transferred` status
 *   transition (with its required reason, recorded to `StudentStatusHistory` server-side) rather
 *   than a fabricated department-move call.
 * - No endpoint exposes a Student's raw `StudentStatusHistory` list -- `StudentDto` carries only
 *   the CURRENT `Status`; ADMIN-17's own status-history tab will need to fall back to the Audit
 *   Log (`entityType=Student`, `action=status_change`), the same interim mechanism this app
 *   already uses for "name your own audit trail" elsewhere.
 * - No `StudentRequest` LIST/queue endpoint exists -- only `GET /students/requests/{id}` (get one),
 *   `POST /students/requests/{id}/approve`, and `POST /students/requests/{id}/reject`. ADMIN-17's
 *   "StudentRequest approval queues" is therefore, like Admission's own applicant review, an
 *   id-based lookup + decision workflow rather than a real browsable queue.
 */
export interface StudentDto {
  readonly id: string;
  readonly studentNumber: string;
  readonly departmentId: string;
  readonly programId: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly givenNameBn: string | null;
  readonly familyNameBn: string | null;
  readonly email: string;
  readonly mobile: string | null;
  readonly dateOfBirth: string;
  readonly nationalId: string | null;
  readonly status: 'Enrolled' | 'Active' | 'Graduated' | 'Suspended' | 'Transferred' | string;
  readonly identityUserId: string | null;
  readonly idCardDocumentId: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly photoUrl: string | null;
  readonly createdAt: string;
  readonly version: number;
}

/**
 * The confirmed real, full legal-transition map (`Student.cs`'s own `_legalTransitions` table) --
 * `Enrolled -> Active`, `Active -> {Graduated, Suspended, Transferred}`, `Suspended -> Active`
 * (the sole reinstatement exception), `Graduated`/`Transferred` both terminal.
 */
export const STUDENT_LEGAL_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Enrolled: ['Active'],
  Active: ['Graduated', 'Suspended', 'Transferred'],
  Suspended: ['Active'],
  Graduated: [],
  Transferred: [],
};

export interface ChangeStudentStatusRequest {
  readonly status: string;
  readonly reason: string | null;
  readonly version: number;
}

/** The exact shape `StudentStatusEndpoints` attaches to its `409 Conflict` response body. */
export interface StudentStatusConflict {
  readonly currentState: StudentDto;
}

/**
 * The confirmed real Upload->Validate->Preview errors->Approve->Process->Generate report flow
 * (`StudentBulkImportJobStatus`) -- Validate/Preview-errors both resolve into `Validated`, which
 * the report endpoint exposes for review before `Approve`.
 */
export type StudentBulkImportJobStatus =
  'Uploaded' | 'Validated' | 'Approved' | 'Processing' | 'Completed' | 'CompletedWithErrors';

export type StudentBulkImportRowStatus =
  'Valid' | 'Invalid' | 'Processing' | 'Succeeded' | 'Failed';

export interface StudentBulkImportJobDto {
  readonly id: string;
  readonly requestedByUserId: string;
  readonly status: StudentBulkImportJobStatus;
  readonly totalRows: number;
  readonly validRowCount: number;
  readonly invalidRowCount: number;
  readonly processedCount: number;
  readonly succeededCount: number;
  readonly failedCount: number;
  readonly createdAt: string;
  readonly approvedAt: string | null;
  readonly completedAt: string | null;
}

/** `errorMessage` is the validation failure (Invalid rows) or processing failure (Failed rows) -- always `null` for a Succeeded row. */
export interface StudentBulkImportRowReportDto {
  readonly rowNumber: number;
  readonly status: StudentBulkImportRowStatus;
  readonly errorMessage: string | null;
  readonly resultStudentId: string | null;
}

export interface StudentBulkImportJobReportDto {
  readonly job: StudentBulkImportJobDto;
  readonly rows: readonly StudentBulkImportRowReportDto[];
}

/**
 * One input row -- presence of `studentNumber` selects the UPDATE path (existing Student,
 * field-scoped to contact/photo info only); its absence selects the CREATE path (a brand-new
 * cohort member). `expectedVersion` is UPDATE-rows-only, the row's own captured `Student.Version`
 * at Upload time, checked as the optimistic-concurrency guard.
 */
export interface StudentBulkImportRowInput {
  readonly originatingApplicationId: string | null;
  readonly studentNumber: string | null;
  readonly expectedVersion: number | null;
  readonly admissionYear: number | null;
  readonly facultyCode: string | null;
  readonly departmentId: string | null;
  readonly programId: string | null;
  readonly givenName: string | null;
  readonly familyName: string | null;
  readonly givenNameBn: string | null;
  readonly familyNameBn: string | null;
  readonly email: string | null;
  readonly mobile: string | null;
  readonly dateOfBirth: string | null;
  readonly nationalId: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly photoUrl: string | null;
}

export interface UploadStudentBulkImportRequest {
  readonly rows: readonly StudentBulkImportRowInput[];
}

/** ID reissue, transcript request, and grievance -- requirement-spec.md §3.6's three StudentRequest types. */
export type StudentRequestType = 'IdReissue' | 'TranscriptRequest' | 'Grievance';

export interface StudentRequestDto {
  readonly id: string;
  readonly studentId: string;
  readonly requestType: StudentRequestType | string;
  readonly details: string;
  readonly status: string;
  readonly reviewScopeNodeId: string | null;
  readonly isAgainstOwnDepartmentHead: boolean;
  readonly generatedDocumentId: string | null;
  readonly decidedByUserId: string | null;
  readonly decisionReason: string | null;
  readonly submittedAt: string;
  readonly decidedAt: string | null;
  readonly fulfilledAt: string | null;
  readonly version: number;
}

export interface RejectStudentRequestBody {
  readonly reason: string;
  readonly version: number;
}

export interface ApproveStudentRequestBody {
  readonly version: number;
}
