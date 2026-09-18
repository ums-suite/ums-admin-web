import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UmsBadgeComponent, UmsButtonComponent, UmsCardComponent } from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { FreshnessLabelComponent } from '../../../shared/freshness/freshness-label.component';
import { ReportingStore } from '../state/reporting.store';
import type { DashboardDomain } from '../dashboard.types';

interface DashboardTile {
  readonly domain: DashboardDomain;
  readonly label: string;
  readonly permissionKey: string;
}

const TILES: readonly DashboardTile[] = [
  {
    domain: 'academic',
    label: 'Academic',
    permissionKey: PERMISSION_KEYS.reporting.dashboardAcademic,
  },
  {
    domain: 'admission',
    label: 'Admission',
    permissionKey: PERMISSION_KEYS.reporting.dashboardAdmission,
  },
  {
    domain: 'financial',
    label: 'Financial',
    permissionKey: PERMISSION_KEYS.reporting.dashboardFinancial,
  },
  {
    domain: 'faculty',
    label: 'Faculty',
    permissionKey: PERMISSION_KEYS.reporting.dashboardFaculty,
  },
  { domain: 'hostel', label: 'Hostel', permissionKey: PERMISSION_KEYS.reporting.dashboardHostel },
  {
    domain: 'library',
    label: 'Library',
    permissionKey: PERMISSION_KEYS.reporting.dashboardLibrary,
  },
  {
    domain: 'content',
    label: 'Content',
    permissionKey: PERMISSION_KEYS.reporting.dashboardContent,
  },
  { domain: 'alumni', label: 'Alumni', permissionKey: PERMISSION_KEYS.reporting.dashboardAlumni },
  { domain: 'career', label: 'Career', permissionKey: PERMISSION_KEYS.reporting.dashboardCareer },
];

/**
 * ADMIN-32: the module dashboard catalog -- one tile per real `GET /api/v1/reporting/dashboards/
 * {domain}` domain (9 total, confirmed real, the set is fixed by code, not discoverable via API),
 * each independently permission-gated. No refresh-trigger endpoint exists -- refresh is
 * worker-driven only, so every tile states its own "as of" freshness (reusing the Dashboard's
 * freshness-label component, ADMIN-9) with a manual "Load" affordance rather than implying
 * real-time accuracy.
 */
@Component({
  selector: 'app-reporting-dashboards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsCardComponent,
    UmsBadgeComponent,
    HasPermissionDirective,
    FreshnessLabelComponent,
  ],
  templateUrl: './reporting-dashboards.component.html',
  styleUrl: './reporting-dashboards.component.scss',
})
export class ReportingDashboardsComponent {
  protected readonly store = inject(ReportingStore);
  protected readonly tiles = TILES;

  protected load(domain: DashboardDomain): void {
    this.store.loadDashboard(domain);
  }
}
