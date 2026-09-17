import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import { FacultyCourseAssignmentsStore } from '../state/faculty-course-assignments.store';

/**
 * ADMIN-26: CourseAssignment oversight -- read-only by construction. `ums-core`'s Faculty module
 * only projects Academic's own authoritative instructor assignment (via outbox events); creating or
 * reassigning an instructor happens on `AcademicCourseOfferingsComponent` (ADMIN-18)'s own screen,
 * linked from here, and there is no confirmed endpoint anywhere to remove an assignment (see
 * `faculty.types.ts`'s own doc).
 */
@Component({
  selector: 'app-faculty-course-assignments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsBadgeComponent, UmsFormFieldComponent, UmsInputComponent],
  templateUrl: './faculty-course-assignments.component.html',
  styleUrl: './faculty-course-assignments.component.scss',
})
export class FacultyCourseAssignmentsComponent {
  protected readonly store = inject(FacultyCourseAssignmentsStore);
  private readonly router = inject(Router);

  protected readonly facultyMemberId = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('facultyMemberId') ?? '',
  );

  constructor() {
    const initial = this.facultyMemberId();
    if (initial) this.store.loadByFacultyMember(initial);
  }

  protected loadAssignments(): void {
    const id = this.facultyMemberId().trim();
    if (id) this.store.loadByFacultyMember(id);
  }

  protected goToCourseOfferings(): void {
    this.router.navigate(['/academic/course-offerings']);
  }
}
