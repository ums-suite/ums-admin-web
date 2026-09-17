import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AcademicCurriculumStore } from '../state/academic-curriculum.store';
import type { CurriculumCourseEntryDto } from '../academic.types';

/**
 * ADMIN-18: Academic Program config, AcademicSession/Semester config, Course (with prerequisite
 * configuration), and Curriculum versioning (requirement-spec.md §3.5). `ums-core`'s Academic
 * module has no list/search endpoint for any of these four entities and no PUT/PATCH -- each
 * section below creates once, then looks up by id, mirroring every other module's own honest
 * "no browse, lookup by id" pattern (see `academic.types.ts`'s own doc for the confirmed gaps).
 *
 * "Academic Program" here is deliberately distinct from Organization's own Program (ADMIN-12,
 * `/organization`) -- see `academic.types.ts`'s own doc for the confirmed real cross-module naming
 * collision. CourseOffering/Section/seat-limit configuration and Exam/Assessment (ADMIN-21) live in
 * the separate `AcademicCourseOfferingsComponent` (`/academic/course-offerings`), since they act on
 * a different, list-capable entity.
 */
@Component({
  selector: 'app-academic-curriculum',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './academic-curriculum.component.html',
  styleUrl: './academic-curriculum.component.scss',
})
export class AcademicCurriculumComponent {
  protected readonly store = inject(AcademicCurriculumStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  // Program
  protected readonly lookupProgramId = signal('');
  protected readonly programDepartmentId = signal('');
  protected readonly programCode = signal('');
  protected readonly programName = signal('');
  protected readonly programMaxCredits = signal('18');
  protected readonly programRequiresAdvisorApproval = signal(false);

  // AcademicSession (single semester per submission, kept simple -- more can be added by repeating)
  protected readonly lookupSessionId = signal('');
  protected readonly sessionCode = signal('');
  protected readonly semesterName = signal('');
  protected readonly semesterRegistrationStart = signal('');
  protected readonly semesterRegistrationEnd = signal('');
  protected readonly semesterDropStart = signal('');
  protected readonly semesterDropEnd = signal('');

  // Course
  protected readonly lookupCourseId = signal('');
  protected readonly courseCode = signal('');
  protected readonly courseTitle = signal('');
  protected readonly courseCreditHours = signal('3');
  protected readonly coursePrerequisiteIds = signal('');

  // Curriculum
  protected readonly lookupCurriculumId = signal('');
  protected readonly curriculumProgramId = signal('');
  protected readonly curriculumVersion = signal('1');
  protected readonly curriculumCourseIds = signal('');

  protected loadProgram(): void {
    const id = this.lookupProgramId().trim();
    if (id) this.store.loadProgram(id);
  }

  protected submitProgram(): void {
    const departmentId = this.programDepartmentId().trim();
    const code = this.programCode().trim();
    const name = this.programName().trim();
    const maxCredits = Number(this.programMaxCredits());
    if (!departmentId || !code || !name || !Number.isFinite(maxCredits)) return;

    this.store
      .createProgram({
        departmentId,
        code,
        name,
        maxCreditsPerSemester: maxCredits,
        requiresAdvisorApproval: this.programRequiresAdvisorApproval(),
      })
      .subscribe(() => {
        this.programDepartmentId.set('');
        this.programCode.set('');
        this.programName.set('');
      });
  }

  protected loadAcademicSession(): void {
    const id = this.lookupSessionId().trim();
    if (id) this.store.loadAcademicSession(id);
  }

  protected submitAcademicSession(): void {
    const code = this.sessionCode().trim();
    const name = this.semesterName().trim();
    const registrationStart = this.semesterRegistrationStart();
    const registrationEnd = this.semesterRegistrationEnd();
    const dropStart = this.semesterDropStart();
    const dropEnd = this.semesterDropEnd();
    if (!code || !name || !registrationStart || !registrationEnd || !dropStart || !dropEnd) return;

    this.store
      .createAcademicSession({
        code,
        semesters: [{ name, registrationStart, registrationEnd, dropStart, dropEnd }],
      })
      .subscribe(() => {
        this.sessionCode.set('');
        this.semesterName.set('');
      });
  }

  protected loadCourse(): void {
    const id = this.lookupCourseId().trim();
    if (id) this.store.loadCourse(id);
  }

  protected submitCourse(): void {
    const code = this.courseCode().trim();
    const title = this.courseTitle().trim();
    const creditHours = Number(this.courseCreditHours());
    if (!code || !title || !Number.isFinite(creditHours)) return;

    const prerequisiteCourseIds = this.parseIdList(this.coursePrerequisiteIds());

    this.store
      .createCourse({
        code,
        title,
        creditHours,
        prerequisiteCourseIds: prerequisiteCourseIds.length > 0 ? prerequisiteCourseIds : null,
      })
      .subscribe(() => {
        this.courseCode.set('');
        this.courseTitle.set('');
        this.coursePrerequisiteIds.set('');
      });
  }

  protected loadCurriculum(): void {
    const id = this.lookupCurriculumId().trim();
    if (id) this.store.loadCurriculum(id);
  }

  protected submitCurriculum(): void {
    const programId = this.curriculumProgramId().trim();
    const version = Number(this.curriculumVersion());
    const courseIds = this.parseIdList(this.curriculumCourseIds());
    if (!programId || !Number.isFinite(version) || courseIds.length === 0) return;

    const courses: readonly CurriculumCourseEntryDto[] = courseIds.map((courseId) => ({
      courseId,
      isRequired: true,
    }));

    this.store.createCurriculum({ programId, version, courses }).subscribe(() => {
      this.curriculumProgramId.set('');
      this.curriculumCourseIds.set('');
    });
  }

  private parseIdList(value: string): readonly string[] {
    return value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
}
