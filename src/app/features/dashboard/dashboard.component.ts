import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import {
  UmsBarChartComponent,
  UmsButtonComponent,
  UmsCardComponent,
  UmsEmptyStateComponent,
  UmsProgressRingComponent,
  type ChartSeries,
} from '@ums/design-system';
import { PERMISSION_KEYS } from '../../core/auth/permissions/permission-keys';
import { HasPermissionDirective } from '../../core/auth/permissions/has-permission.directive';
import { PermissionsService } from '../../core/auth/permissions/permissions.service';
import { FreshnessLabelComponent } from '../../shared/freshness/freshness-label.component';
import type {
  AcademicDashboardPayload,
  AdmissionDashboardPayload,
  FinancialDashboardPayload,
  HostelDashboardPayload,
} from '../reporting/dashboard.types';
import { ReportingStore } from '../reporting/state/reporting.store';

/**
 * ADMIN-9: role-specific landing Dashboard (requirement-spec.md §3.1, §7 key screen) -- KPI
 * tiles + real charts drawn from Reporting's `DashboardMetric` read models, each tile stating its
 * "as of" freshness rather than implying real-time accuracy (§9's result-day-traffic-spike edge
 * case).
 *
 * "Role-specific" is implemented as permission-gated tiles (ADMIN-5's `*appHasPermission`, never
 * role-name-based per ADR-0006) -- a Registrar sees the Admission/Academic tiles, an Accountant
 * sees Financial, a Hostel Officer sees Hostel; a Super Admin holding every
 * `reporting.dashboard.*` permission sees all four. A tile whose permission the caller lacks is
 * entirely absent, not an empty/greyed-out card (requirement-spec.md §8 invariant #1).
 *
 * Each tile has its own manual "Refresh" action rather than auto-refreshing -- matching
 * design-decisions.md's freshness-snapshot idiom (no silent reshuffling of numbers on screen,
 * §7's "numbers ... don't animate in a way that could read as 'did that number just change on
 * its own?'").
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsCardComponent,
    UmsBarChartComponent,
    UmsProgressRingComponent,
    UmsButtonComponent,
    UmsEmptyStateComponent,
    FreshnessLabelComponent,
    HasPermissionDirective,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly reporting = inject(ReportingStore);
  private readonly permissions = inject(PermissionsService);
  protected readonly permissionKeys = PERMISSION_KEYS;

  ngOnInit(): void {
    if (this.permissions.hasPermission(PERMISSION_KEYS.reporting.dashboardAdmission)) {
      this.reporting.loadDashboard('admission');
    }
    if (this.permissions.hasPermission(PERMISSION_KEYS.reporting.dashboardFinancial)) {
      this.reporting.loadDashboard('financial');
    }
    if (this.permissions.hasPermission(PERMISSION_KEYS.reporting.dashboardHostel)) {
      this.reporting.loadDashboard('hostel');
    }
    if (this.permissions.hasPermission(PERMISSION_KEYS.reporting.dashboardAcademic)) {
      this.reporting.loadDashboard('academic');
    }
  }

  protected readonly admission = computed(() => this.reporting.dashboard('admission'));
  protected readonly financial = computed(() => this.reporting.dashboard('financial'));
  protected readonly hostel = computed(() => this.reporting.dashboard('hostel'));
  protected readonly academic = computed(() => this.reporting.dashboard('academic'));

  protected readonly admissionFunnelCategories = computed(
    () =>
      (this.admission().response?.payload as AdmissionDashboardPayload | null)?.funnelStages?.map(
        (s) => s.stage,
      ) ?? [],
  );

  protected readonly admissionFunnelSeries = computed<readonly ChartSeries[]>(() => {
    const stages = (this.admission().response?.payload as AdmissionDashboardPayload | null)
      ?.funnelStages;
    return stages ? [{ name: 'Applicants', data: stages.map((s) => s.count) }] : [];
  });

  protected readonly financialCollectionRate = computed(
    () =>
      (this.financial().response?.payload as FinancialDashboardPayload | null)
        ?.collectionRatePercent ?? null,
  );

  protected readonly hostelOccupancy = computed(
    () =>
      (this.hostel().response?.payload as HostelDashboardPayload | null)?.occupancyPercent ?? null,
  );

  protected readonly academicGpaCategories = computed(
    () =>
      (this.academic().response?.payload as AcademicDashboardPayload | null)?.gpaBuckets?.map(
        (b) => b.bucket,
      ) ?? [],
  );

  protected readonly academicGpaSeries = computed<readonly ChartSeries[]>(() => {
    const buckets = (this.academic().response?.payload as AcademicDashboardPayload | null)
      ?.gpaBuckets;
    return buckets ? [{ name: 'Students', data: buckets.map((b) => b.count) }] : [];
  });

  protected refresh(domain: 'admission' | 'financial' | 'hostel' | 'academic'): void {
    this.reporting.loadDashboard(domain);
  }
}
