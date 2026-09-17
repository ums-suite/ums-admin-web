import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AcademicCourseOfferingsStore } from '../state/academic-course-offerings.store';
import type { CreateSectionRequest } from '../academic.types';

const DAYS_OF_WEEK: readonly SelectOption[] = [
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
];

/**
 * ADMIN-18 (CourseOffering/Section, seat-limit config) + ADMIN-21 (exam creation, scheduling, room
 * allocation, examiner assignment). `ums-core`'s Academic module confirms real seat-limit fields
 * (`capacity`/`enrolledCount`/`hasAvailableSeats`) and instructor assignment, but its `Exam` entity
 * carries no date/time/room/examiner field at all -- "exam creation" here is honestly only
 * Exam+weighted-Assessment configuration (used solely to compute a Grade's weighted score); there
 * is no scheduling/room-allocation/examiner-assignment surface in the backend to build against yet
 * (flagged explicitly, see `academic.types.ts`'s own doc, and surfaced again in this screen's own
 * template so a Registrar isn't left wondering why those controls don't exist).
 */
@Component({
  selector: 'app-academic-course-offerings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './academic-course-offerings.component.html',
  styleUrl: './academic-course-offerings.component.scss',
})
export class AcademicCourseOfferingsComponent {
  protected readonly store = inject(AcademicCourseOfferingsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly dayOptions = DAYS_OF_WEEK;

  protected readonly lookupOfferingId = signal('');
  protected readonly lookupSemesterId = signal('');

  protected readonly newCourseId = signal('');
  protected readonly newSemesterId = signal('');
  protected readonly newDepartmentId = signal('');
  protected readonly newCapacity = signal('60');
  protected readonly draftSections = signal<readonly CreateSectionRequest[]>([]);
  protected readonly sectionCode = signal('');
  protected readonly sectionDay = signal('Sunday');
  protected readonly sectionStart = signal('09:00:00');
  protected readonly sectionEnd = signal('10:00:00');

  protected readonly instructorFacultyMemberId = signal('');

  protected readonly examName = signal('');
  protected readonly assessmentName = signal('');
  protected readonly assessmentWeight = signal('1');

  protected loadOffering(): void {
    const id = this.lookupOfferingId().trim();
    if (id) this.store.loadOffering(id);
  }

  protected loadOfferingsBySemester(): void {
    const semesterId = this.lookupSemesterId().trim();
    if (semesterId) this.store.loadOfferingsBySemester(semesterId);
  }

  protected addDraftSection(): void {
    const code = this.sectionCode().trim();
    if (!code) return;
    this.draftSections.update((sections) => [
      ...sections,
      { code, dayOfWeek: this.sectionDay(), start: this.sectionStart(), end: this.sectionEnd() },
    ]);
    this.sectionCode.set('');
  }

  protected removeDraftSection(index: number): void {
    this.draftSections.update((sections) => sections.filter((_, i) => i !== index));
  }

  protected submitOffering(): void {
    const courseId = this.newCourseId().trim();
    const semesterId = this.newSemesterId().trim();
    const departmentId = this.newDepartmentId().trim();
    const capacity = Number(this.newCapacity());
    if (!courseId || !semesterId || !departmentId || !Number.isFinite(capacity)) return;

    this.store
      .createOffering({
        courseId,
        semesterId,
        departmentId,
        capacity,
        sections: this.draftSections(),
      })
      .subscribe(() => {
        this.newCourseId.set('');
        this.newSemesterId.set('');
        this.newDepartmentId.set('');
        this.draftSections.set([]);
      });
  }

  protected submitInstructorAssignment(): void {
    const offering = this.store.currentOffering();
    const facultyMemberId = this.instructorFacultyMemberId().trim();
    if (!offering || !facultyMemberId) return;

    this.store
      .assignInstructor(offering.id, { facultyMemberId })
      .subscribe(() => this.instructorFacultyMemberId.set(''));
  }

  protected submitExam(): void {
    const offering = this.store.currentOffering();
    const name = this.examName().trim();
    const assessmentNameValue = this.assessmentName().trim();
    const weight = Number(this.assessmentWeight());
    if (!offering || !name || !assessmentNameValue || !Number.isFinite(weight)) return;

    this.store
      .addExam(offering.id, {
        name,
        assessments: [{ name: assessmentNameValue, weight }],
      })
      .subscribe(() => {
        this.examName.set('');
        this.assessmentName.set('');
      });
  }
}
