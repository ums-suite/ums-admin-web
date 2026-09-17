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
            loadComponent: placeholder,
            data: { label: 'Admissions -- Campaigns' },
          },
          {
            path: 'applicant-review',
            canActivate: [permissionGuard(PERMISSION_KEYS.admission.applicationReview)],
            loadComponent: placeholder,
            data: { label: 'Admissions -- Applicant Review' },
          },
        ],
      },
      { path: 'academic', loadComponent: placeholder, data: { label: 'Academic' } },
      {
        path: 'student',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'records' },
          {
            path: 'records',
            canActivate: [permissionGuard(PERMISSION_KEYS.student.profileRead)],
            loadComponent: placeholder,
            data: { label: 'Students -- Records' },
          },
          {
            path: 'bulk-import',
            canActivate: [permissionGuard(PERMISSION_KEYS.student.bulkImportExecute)],
            loadComponent: placeholder,
            data: { label: 'Students -- Bulk Import' },
          },
          {
            path: 'profile/:studentId',
            canActivate: [permissionGuard(PERMISSION_KEYS.student.profileRead)],
            loadComponent: placeholder,
            data: { label: 'Student 360' },
          },
        ],
      },
      { path: 'faculty', loadComponent: placeholder, data: { label: 'Faculty & HR' } },
      { path: 'finance', loadComponent: placeholder, data: { label: 'Finance' } },
      { path: 'hostel', loadComponent: placeholder, data: { label: 'Hostel' } },
      { path: 'library', loadComponent: placeholder, data: { label: 'Library' } },
      { path: 'content', loadComponent: placeholder, data: { label: 'Content' } },
      { path: 'documents', loadComponent: placeholder, data: { label: 'Documents' } },
      { path: 'reporting', loadComponent: placeholder, data: { label: 'Reporting' } },
      { path: 'audit', loadComponent: placeholder, data: { label: 'Audit Log' } },
      { path: 'configuration', loadComponent: placeholder, data: { label: 'Configuration' } },
      { path: '**', loadComponent: placeholder, data: { label: 'This page' } },
    ],
  },
];
