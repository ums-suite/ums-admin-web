import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsModalComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import type {
  CampusDto,
  DepartmentDto,
  FacultyDto,
  ProgramDto,
  UniversityDto,
} from '../organization.types';
import { OrganizationStore } from '../state/organization.store';

type HierarchyLevel = 'university' | 'campus' | 'faculty' | 'department' | 'program';

interface HierarchyRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly version: number;
}

/**
 * ADMIN-12: University -> Campus -> Faculty -> Department -> Program hierarchy CRUD, built as a
 * drill-down of stacked panels (create + select at each level narrows the next panel's list) --
 * this deliberately mirrors the requirement-spec.md §3.3 hierarchy shape itself rather than
 * treating the five levels as unrelated flat lists.
 *
 * Only Faculty/Department/Program have a confirmed real deactivate endpoint in `ums-core`'s
 * Organization module source (see `organization.api.ts`); University/Campus rows show their
 * `status` read-only with no deactivate action, rather than fabricating one.
 */
@Component({
  selector: 'app-organization-hierarchy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsModalComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './organization-hierarchy.component.html',
  styleUrl: './organization-hierarchy.component.scss',
})
export class OrganizationHierarchyComponent implements OnInit {
  protected readonly store = inject(OrganizationStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly selectedUniversity = signal<UniversityDto | null>(null);
  protected readonly selectedCampus = signal<CampusDto | null>(null);
  protected readonly selectedFaculty = signal<FacultyDto | null>(null);
  protected readonly selectedDepartment = signal<DepartmentDto | null>(null);

  protected readonly createLevel = signal<HierarchyLevel | null>(null);
  protected readonly createName = signal('');
  protected readonly createCode = signal('');

  protected readonly universityRows = computed<readonly HierarchyRow[]>(() =>
    this.store.universities(),
  );
  protected readonly campusRows = computed<readonly HierarchyRow[]>(() => this.store.campuses());
  protected readonly facultyRows = computed<readonly HierarchyRow[]>(() => this.store.faculties());
  protected readonly departmentRows = computed<readonly HierarchyRow[]>(() =>
    this.store.departments(),
  );
  protected readonly programRows = computed<readonly HierarchyRow[]>(() => this.store.programs());

  ngOnInit(): void {
    this.store.loadUniversities();
  }

  protected selectUniversity(university: UniversityDto): void {
    this.selectedUniversity.set(university);
    this.selectedCampus.set(null);
    this.selectedFaculty.set(null);
    this.selectedDepartment.set(null);
    this.store.loadCampuses(university.id);
  }

  protected selectCampus(campus: CampusDto): void {
    this.selectedCampus.set(campus);
    this.selectedFaculty.set(null);
    this.selectedDepartment.set(null);
    this.store.loadFaculties(campus.id);
  }

  protected selectFaculty(faculty: FacultyDto): void {
    this.selectedFaculty.set(faculty);
    this.selectedDepartment.set(null);
    this.store.loadDepartments(faculty.id);
  }

  protected selectDepartment(department: DepartmentDto): void {
    this.selectedDepartment.set(department);
    this.store.loadPrograms(department.id);
  }

  protected openCreateModal(level: HierarchyLevel): void {
    this.createLevel.set(level);
    this.createName.set('');
    this.createCode.set('');
  }

  protected closeCreateModal(): void {
    this.createLevel.set(null);
  }

  protected submitCreate(): void {
    const level = this.createLevel();
    const name = this.createName().trim();
    if (!level || !name) return;

    switch (level) {
      case 'university':
        this.store
          .createUniversity({ name, code: this.createCode().trim() || null })
          .subscribe(() => this.closeCreateModal());
        break;
      case 'campus': {
        const university = this.selectedUniversity();
        if (!university) return;
        this.store
          .createCampus({ universityId: university.id, name })
          .subscribe(() => this.closeCreateModal());
        break;
      }
      case 'faculty': {
        const campus = this.selectedCampus();
        if (!campus) return;
        this.store
          .createFaculty({ campusId: campus.id, name, translations: null })
          .subscribe(() => this.closeCreateModal());
        break;
      }
      case 'department': {
        const faculty = this.selectedFaculty();
        if (!faculty) return;
        this.store
          .createDepartment({ facultyId: faculty.id, name, translations: null })
          .subscribe(() => this.closeCreateModal());
        break;
      }
      case 'program': {
        const department = this.selectedDepartment();
        if (!department) return;
        this.store
          .createProgram({ departmentId: department.id, name, translations: null })
          .subscribe(() => this.closeCreateModal());
        break;
      }
    }
  }

  protected deactivateFaculty(faculty: FacultyDto): void {
    const sinceIso = new Date().toISOString();
    this.auditedAction
      .confirmAndRun({
        title: 'Deactivate faculty',
        description: `${faculty.name} will be marked inactive.`,
        perform: () =>
          this.store
            .deactivateFaculty(faculty.id, faculty.version, faculty.campusId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(this.auditApi, 'Faculty', faculty.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: faculty, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `${outcome.result.name} deactivated (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not deactivate faculty: ${error.message}`,
      })
      .subscribe();
  }

  protected deactivateDepartment(department: DepartmentDto): void {
    const sinceIso = new Date().toISOString();
    this.auditedAction
      .confirmAndRun({
        title: 'Deactivate department',
        description: `${department.name} will be marked inactive.`,
        perform: () =>
          this.store
            .deactivateDepartment(department.id, department.version, department.facultyId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(this.auditApi, 'Department', department.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: department, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `${outcome.result.name} deactivated (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not deactivate department: ${error.message}`,
      })
      .subscribe();
  }

  protected deactivateProgram(program: ProgramDto): void {
    const sinceIso = new Date().toISOString();
    this.auditedAction
      .confirmAndRun({
        title: 'Deactivate program',
        description: `${program.name} will be marked inactive.`,
        perform: () =>
          this.store
            .deactivateProgram(program.id, program.version, program.departmentId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(this.auditApi, 'Program', program.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: program, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `${outcome.result.name} deactivated (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not deactivate program: ${error.message}`,
      })
      .subscribe();
  }

  protected createModalTitle(): string {
    const level = this.createLevel();
    switch (level) {
      case 'university':
        return 'New University';
      case 'campus':
        return 'New Campus';
      case 'faculty':
        return 'New Faculty';
      case 'department':
        return 'New Department';
      case 'program':
        return 'New Program';
      default:
        return '';
    }
  }
}
