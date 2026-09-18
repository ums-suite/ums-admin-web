import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permissions/permission.guard';
import { PERMISSION_KEYS } from './core/auth/permissions/permission-keys';

const placeholder = () =>
  import('./core/shared/feature-placeholder.component').then((m) => m.FeaturePlaceholderComponent);

/**
 * ADMIN-6: root route table -- the 15-module navigation IA (see `shell/nav-items.ts` for the nav
 * side of this same list). This app is CSR only, no SSR (requirement-spec.md §2/§10 item 1).
 *
 * `/login` is guest-only ({@link guestGuard}); `/forbidden` is where {@link permissionGuard}
 * sends a denied caller. Every other route requires authentication ({@link authGuard}) and, for
 * every module (Dashboard excepted -- every authenticated staff member can see their own landing
 * page), the module's own permission via {@link permissionGuard} -- re-validated live against the
 * server on every entry (ADMIN-5), never a session-start-only snapshot.
 *
 * The full 15-module + Dashboard route/guard tree lands in this one ADMIN-6 pass; each leaf's
 * `loadComponent` is swapped from {@link FeaturePlaceholderComponent} to its own real component
 * as that module's own ticket (ADMIN-9 for Dashboard, ADMIN-10/11 for Identity, ADMIN-12 for
 * Organization, ADMIN-13/14 for Admission, ADMIN-15/16/17 for Student, ADMIN-18+ for everything
 * else) lands later in this same build pass or a future one -- the tree/guard structure itself
 * never needs to change shape when that happens, mirroring `ums-student-web`'s identical pattern.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'forbidden',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/login/forbidden-page.component').then((m) => m.ForbiddenPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { label: 'Dashboard' },
      },
      {
        path: 'identity',
        canActivate: [permissionGuard(PERMISSION_KEYS.identity.userRead)],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/identity/users/users-list.component').then(
                (m) => m.UsersListComponent,
              ),
            data: { label: 'Identity & Access -- Users' },
          },
          {
            path: 'roles',
            canActivate: [permissionGuard(PERMISSION_KEYS.identity.roleManage)],
            loadComponent: () =>
              import('./features/identity/roles/roles-list.component').then(
                (m) => m.RolesListComponent,
              ),
            data: { label: 'Identity & Access -- Roles' },
          },
        ],
      },
      {
        path: 'organization',
        canActivate: [permissionGuard(PERMISSION_KEYS.organization.read)],
        loadComponent: () =>
          import('./features/organization/organization.component').then(
            (m) => m.OrganizationComponent,
          ),
        data: { label: 'Organization' },
      },
      {
        path: 'admission',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
          {
            path: 'campaigns',
            canActivate: [permissionGuard(PERMISSION_KEYS.admission.campaignManage)],
            loadComponent: () =>
              import('./features/admission/campaigns/campaign-configuration.component').then(
                (m) => m.CampaignConfigurationComponent,
              ),
            data: { label: 'Admissions -- Campaigns' },
          },
          {
            path: 'applicant-review',
            canActivate: [permissionGuard(PERMISSION_KEYS.admission.applicationReview)],
            loadComponent: () =>
              import('./features/admission/applicant-review/applicant-review.component').then(
                (m) => m.ApplicantReviewComponent,
              ),
            data: { label: 'Admissions -- Applicant Review' },
          },
          {
            path: 'exam-merit',
            canActivate: [permissionGuard(PERMISSION_KEYS.admission.applicationReview)],
            loadComponent: () =>
              import('./features/admission/exam-merit/admission-exam-merit.component').then(
                (m) => m.AdmissionExamMeritComponent,
              ),
            data: { label: 'Admissions -- Exam Attempts & Merit List' },
          },
          {
            path: 'result-publication',
            canActivate: [permissionGuard(PERMISSION_KEYS.admission.resultPublish)],
            loadComponent: () =>
              import('./features/admission/result-publication/admission-result-publication.component').then(
                (m) => m.AdmissionResultPublicationComponent,
              ),
            data: { label: 'Admissions -- Result Publication' },
          },
        ],
      },
      {
        path: 'academic',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'curriculum' },
          {
            path: 'curriculum',
            canActivate: [
              permissionGuard([
                PERMISSION_KEYS.academic.programManage,
                PERMISSION_KEYS.academic.curriculumManage,
                PERMISSION_KEYS.academic.courseManage,
              ]),
            ],
            loadComponent: () =>
              import('./features/academic/curriculum/academic-curriculum.component').then(
                (m) => m.AcademicCurriculumComponent,
              ),
            data: { label: 'Academic -- Curriculum' },
          },
          {
            path: 'course-offerings',
            canActivate: [permissionGuard(PERMISSION_KEYS.academic.courseOfferingManage)],
            loadComponent: () =>
              import('./features/academic/course-offerings/academic-course-offerings.component').then(
                (m) => m.AcademicCourseOfferingsComponent,
              ),
            data: { label: 'Academic -- Course Offerings' },
          },
          {
            path: 'grading',
            canActivate: [permissionGuard(PERMISSION_KEYS.academic.gradeCorrect)],
            loadComponent: () =>
              import('./features/academic/grading/academic-grading.component').then(
                (m) => m.AcademicGradingComponent,
              ),
            data: { label: 'Academic -- Grade Correction' },
          },
          {
            path: 'result-publication',
            canActivate: [
              permissionGuard([
                PERMISSION_KEYS.academic.gradeLock,
                PERMISSION_KEYS.academic.resultApprove,
                PERMISSION_KEYS.academic.resultPublish,
              ]),
            ],
            loadComponent: () =>
              import('./features/academic/result-publication/academic-result-publication.component').then(
                (m) => m.AcademicResultPublicationComponent,
              ),
            data: { label: 'Academic -- Result Publication' },
          },
        ],
      },
      {
        path: 'student',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'records' },
          {
            path: 'records',
            canActivate: [permissionGuard(PERMISSION_KEYS.student.profileRead)],
            loadComponent: () =>
              import('./features/student/records/student-records.component').then(
                (m) => m.StudentRecordsComponent,
              ),
            data: { label: 'Students -- Records' },
          },
          {
            path: 'bulk-import',
            canActivate: [permissionGuard(PERMISSION_KEYS.student.bulkImportExecute)],
            loadComponent: () =>
              import('./features/student/bulk-import/student-bulk-import.component').then(
                (m) => m.StudentBulkImportComponent,
              ),
            data: { label: 'Students -- Bulk Import' },
          },
          {
            path: 'profile/:studentId',
            canActivate: [permissionGuard(PERMISSION_KEYS.student.profileRead)],
            loadComponent: () =>
              import('./features/student/profile-360/student-profile-360.component').then(
                (m) => m.StudentProfile360Component,
              ),
            data: { label: 'Student 360' },
          },
        ],
      },
      {
        path: 'faculty',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'members' },
          {
            path: 'members',
            canActivate: [permissionGuard(PERMISSION_KEYS.faculty.profileRead)],
            loadComponent: () =>
              import('./features/faculty/members/faculty-members.component').then(
                (m) => m.FacultyMembersComponent,
              ),
            data: { label: 'Faculty -- Members' },
          },
          {
            path: 'course-assignments',
            canActivate: [permissionGuard(PERMISSION_KEYS.faculty.courseAssignmentRead)],
            loadComponent: () =>
              import('./features/faculty/course-assignments/faculty-course-assignments.component').then(
                (m) => m.FacultyCourseAssignmentsComponent,
              ),
            data: { label: 'Faculty -- Course Assignments' },
          },
          {
            path: 'leave-requests',
            canActivate: [
              permissionGuard([
                PERMISSION_KEYS.faculty.leaveApproveDepartment,
                PERMISSION_KEYS.faculty.leaveApproveAuthority,
              ]),
            ],
            loadComponent: () =>
              import('./features/faculty/leave-requests/faculty-leave-requests.component').then(
                (m) => m.FacultyLeaveRequestsComponent,
              ),
            data: { label: 'Faculty -- Leave Requests' },
          },
          {
            path: 'research-profile',
            canActivate: [
              permissionGuard([
                PERMISSION_KEYS.faculty.researchUpdate,
                PERMISSION_KEYS.faculty.researchPublish,
              ]),
            ],
            loadComponent: () =>
              import('./features/faculty/research-profile/faculty-research-profile.component').then(
                (m) => m.FacultyResearchProfileComponent,
              ),
            data: { label: 'Faculty -- Research Profile' },
          },
        ],
      },
      {
        path: 'finance',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'fee-structures' },
          {
            path: 'fee-structures',
            canActivate: [permissionGuard(PERMISSION_KEYS.finance.feeStructureManage)],
            loadComponent: () =>
              import('./features/finance/fee-structures/finance-fee-structures.component').then(
                (m) => m.FinanceFeeStructuresComponent,
              ),
            data: { label: 'Finance -- Fee Structures' },
          },
          {
            path: 'oversight',
            canActivate: [permissionGuard(PERMISSION_KEYS.finance.paymentRefund)],
            loadComponent: () =>
              import('./features/finance/oversight/finance-oversight.component').then(
                (m) => m.FinanceOversightComponent,
              ),
            data: { label: 'Finance -- Invoice & Payment Oversight' },
          },
          {
            path: 'ledger',
            canActivate: [permissionGuard(PERMISSION_KEYS.finance.ledgerRead)],
            loadComponent: () =>
              import('./features/finance/ledger/finance-ledger.component').then(
                (m) => m.FinanceLedgerComponent,
              ),
            data: { label: 'Finance -- Ledger' },
          },
          {
            path: 'reconciliation',
            canActivate: [permissionGuard(PERMISSION_KEYS.finance.reconciliationReview)],
            loadComponent: () =>
              import('./features/finance/reconciliation/finance-reconciliation.component').then(
                (m) => m.FinanceReconciliationComponent,
              ),
            data: { label: 'Finance -- Reconciliation' },
          },
        ],
      },
      {
        path: 'hostel',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'inventory' },
          {
            path: 'inventory',
            canActivate: [permissionGuard(PERMISSION_KEYS.hostel.inventoryManage)],
            loadComponent: () =>
              import('./features/hostel/inventory/hostel-inventory.component').then(
                (m) => m.HostelInventoryComponent,
              ),
            data: { label: 'Hostel -- Inventory' },
          },
          {
            path: 'applications',
            canActivate: [
              permissionGuard([
                PERMISSION_KEYS.hostel.windowManage,
                PERMISSION_KEYS.hostel.applicationReview,
              ]),
            ],
            loadComponent: () =>
              import('./features/hostel/applications/hostel-applications.component').then(
                (m) => m.HostelApplicationsComponent,
              ),
            data: { label: 'Hostel -- Applications' },
          },
          {
            path: 'allocations',
            loadComponent: () =>
              import('./features/hostel/allocations/hostel-allocations.component').then(
                (m) => m.HostelAllocationsComponent,
              ),
            data: { label: 'Hostel -- Allocations & Complaints' },
          },
        ],
      },
      {
        path: 'library',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'catalog' },
          {
            path: 'catalog',
            loadComponent: () =>
              import('./features/library/catalog/library-catalog.component').then(
                (m) => m.LibraryCatalogComponent,
              ),
            data: { label: 'Library -- Catalog' },
          },
          {
            path: 'circulation',
            loadComponent: () =>
              import('./features/library/circulation/library-circulation.component').then(
                (m) => m.LibraryCirculationComponent,
              ),
            data: { label: 'Library -- Loans, Reservations & Fines' },
          },
        ],
      },
      {
        path: 'content',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'notices' },
          {
            path: 'notices',
            canActivate: [permissionGuard(PERMISSION_KEYS.content.noticeRead)],
            loadComponent: () =>
              import('./features/content/notices/content-notices.component').then(
                (m) => m.ContentNoticesComponent,
              ),
            data: { label: 'Content -- Notices' },
          },
          {
            path: 'events',
            loadComponent: () =>
              import('./features/content/events/content-events.component').then(
                (m) => m.ContentEventsComponent,
              ),
            data: { label: 'Content -- Events' },
          },
          {
            path: 'banners',
            loadComponent: () =>
              import('./features/content/banners/content-banners.component').then(
                (m) => m.ContentBannersComponent,
              ),
            data: { label: 'Content -- Banners' },
          },
        ],
      },
      {
        path: 'documents',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'registry' },
          {
            path: 'registry',
            canActivate: [permissionGuard(PERMISSION_KEYS.documents.read)],
            loadComponent: () =>
              import('./features/documents/registry/documents-registry.component').then(
                (m) => m.DocumentsRegistryComponent,
              ),
            data: { label: 'Documents -- Registry' },
          },
          {
            path: 'templates',
            loadComponent: () =>
              import('./features/documents/templates/documents-templates.component').then(
                (m) => m.DocumentsTemplatesComponent,
              ),
            data: { label: 'Documents -- Templates' },
          },
          {
            path: 'bulk-generation',
            canActivate: [permissionGuard(PERMISSION_KEYS.documents.generateBulk)],
            loadComponent: () =>
              import('./features/documents/bulk-generation/documents-bulk-generation.component').then(
                (m) => m.DocumentsBulkGenerationComponent,
              ),
            data: { label: 'Documents -- Bulk Generation' },
          },
          {
            path: 'verify',
            loadComponent: () =>
              import('./features/documents/verify/documents-verify.component').then(
                (m) => m.DocumentsVerifyComponent,
              ),
            data: { label: 'Documents -- Verify' },
          },
        ],
      },
      { path: 'reporting', loadComponent: placeholder, data: { label: 'Reporting' } },
      { path: 'audit', loadComponent: placeholder, data: { label: 'Audit Log' } },
      { path: 'configuration', loadComponent: placeholder, data: { label: 'Configuration' } },
      { path: '**', loadComponent: placeholder, data: { label: 'This page' } },
    ],
  },
];
