import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toUmsApiError } from '@ums/shared';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AcademicApi } from '../../academic/academic.api';
import type { AcademicSessionDto, CreateSemesterRequest } from '../../academic/academic.types';

/**
 * ADMIN-35: Academic calendar management -- deliberately scoped down to "define a new academic
 * session" + fetch-one-by-id. **No list, no update, no delete endpoint exists** for
 * `AcademicSession` anywhere in `ums-core` (confirmed real, see `academic.types.ts`'s own doc) --
 * this screen intentionally does NOT build a browse/edit UI implying capabilities the backend
 * doesn't have.
 */
@Component({
  selector: 'app-system-config-academic-sessions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent, HasPermissionDirective],
  templateUrl: './system-config-academic-sessions.component.html',
  styleUrl: './system-config-academic-sessions.component.scss',
})
export class SystemConfigAcademicSessionsComponent {
  protected readonly permissionKeys = PERMISSION_KEYS;
  private readonly api = inject(AcademicApi);

  protected readonly code = signal('');
  protected readonly draftSemesters = signal<readonly CreateSemesterRequest[]>([]);
  protected readonly semesterName = signal('');
  protected readonly registrationStart = signal('');
  protected readonly registrationEnd = signal('');
  protected readonly dropStart = signal('');
  protected readonly dropEnd = signal('');

  protected readonly createdSession = signal<AcademicSessionDto | null>(null);
  protected readonly createError = signal<string | null>(null);

  protected readonly lookupId = signal('');
  protected readonly lookedUpSession = signal<AcademicSessionDto | null>(null);
  protected readonly lookupError = signal<string | null>(null);

  protected addSemester(): void {
    const name = this.semesterName().trim();
    if (
      !name ||
      !this.registrationStart() ||
      !this.registrationEnd() ||
      !this.dropStart() ||
      !this.dropEnd()
    ) {
      return;
    }
    this.draftSemesters.update((semesters) => [
      ...semesters,
      {
        name,
        registrationStart: this.registrationStart(),
        registrationEnd: this.registrationEnd(),
        dropStart: this.dropStart(),
        dropEnd: this.dropEnd(),
      },
    ]);
    this.semesterName.set('');
  }

  protected removeSemester(index: number): void {
    this.draftSemesters.update((semesters) => semesters.filter((_, i) => i !== index));
  }

  protected submitCreate(): void {
    const code = this.code().trim();
    const semesters = this.draftSemesters();
    if (!code || semesters.length === 0) return;
    this.createError.set(null);
    this.api.createAcademicSession({ code, semesters }).subscribe({
      next: (session) => {
        this.createdSession.set(session);
        this.code.set('');
        this.draftSemesters.set([]);
      },
      error: (e: unknown) => this.createError.set(toUmsApiError(e).message),
    });
  }

  protected lookup(): void {
    const id = this.lookupId().trim();
    if (!id) return;
    this.lookupError.set(null);
    this.api.getAcademicSessionById(id).subscribe({
      next: (session) => this.lookedUpSession.set(session),
      error: (e: unknown) => this.lookupError.set(toUmsApiError(e).message),
    });
  }
}
