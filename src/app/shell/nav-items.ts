import type { IconName } from '@ums/design-system';

/**
 * ADMIN-6: the 15-module navigation IA (requirement-spec.md §6 Consumed Backend Modules), one
 * top-level entry per backend module (plus Dashboard/System Configuration) routing to that
 * module's primary screen -- deeper in-module navigation (e.g. Identity's Users vs Roles) is each
 * feature area's own concern, not this top-level shell's.
 *
 * Shared between {@link import('./app-shell.component').AppShellComponent} (renders these as the
 * side nav) and the command palette (ADMIN-6, same list surfaced as quick-navigation commands) so
 * the two never drift out of sync.
 */
export interface AdminNavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

export const NAV_ITEMS: readonly AdminNavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'house' },
  { path: '/identity/users', label: 'Identity & Access', icon: 'shield-check' },
  { path: '/organization', label: 'Organization', icon: 'buildings' },
  { path: '/admission/campaigns', label: 'Admissions', icon: 'clipboard-text' },
  { path: '/academic/curriculum', label: 'Academic', icon: 'book-open' },
  { path: '/student/records', label: 'Students', icon: 'student' },
  { path: '/faculty/members', label: 'Faculty & HR', icon: 'chalkboard-teacher' },
  { path: '/finance/fee-structures', label: 'Finance', icon: 'currency-circle-dollar' },
  { path: '/hostel/inventory', label: 'Hostel', icon: 'map-pin' },
  { path: '/library/catalog', label: 'Library', icon: 'book-bookmark' },
  { path: '/content/notices', label: 'Content', icon: 'file-text' },
  { path: '/documents', label: 'Documents', icon: 'certificate' },
  { path: '/reporting', label: 'Reporting', icon: 'chart-bar' },
  { path: '/audit', label: 'Audit Log', icon: 'list-bullets' },
  { path: '/configuration', label: 'Configuration', icon: 'sliders' },
] as const;
