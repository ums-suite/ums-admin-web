import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { map } from 'rxjs';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsDateRangePickerComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { FreshnessLabelComponent } from '../../../shared/freshness/freshness-label.component';
import { JobPollerService, type JobTrackerHandle } from '../../../shared/jobs/job-poller.service';
import { AuditStore, toAuditExportSnapshot } from '../state/audit.store';
import type { AuditExportFormat, AuditExportRequestDto, AuditLogEntryDto } from '../audit.types';

const COLUMNS: readonly DataTableColumn<AuditLogEntryDto>[] = [
  { id: 'occurredAt', header: 'Occurred at', accessor: (r) => r.occurredAt, sortable: true },
  { id: 'actorId', header: 'Actor', accessor: (r) => r.actorId, filterable: true },
  { id: 'application', header: 'Application', accessor: (r) => r.application, filterable: true },
  { id: 'entityType', header: 'Entity type', accessor: (r) => r.entityType, filterable: true },
  { id: 'entityId', header: 'Entity id', accessor: (r) => r.entityId },
  { id: 'action', header: 'Action', accessor: (r) => r.action, filterable: true },
  { id: 'ipAddress', header: 'IP', accessor: (r) => r.ipAddress },
  { id: 'correlationId', header: 'Correlation id', accessor: (r) => r.correlationId },
];

/** edge-cases.md §9: encourage narrowing before executing a query spanning an unreasonably wide range. */
const WIDE_RANGE_WARNING_DAYS = 90;

const EXPORT_FORMAT_OPTIONS: readonly SelectOption[] = [
  { value: 'Csv', label: 'CSV' },
  { value: 'Pdf', label: 'PDF' },
];

/**
 * ADMIN-34: the Audit Log explorer -- searchable/filterable/skip-take-paginated, using the shared
 * virtualized `UmsDataTableComponent` given this table's documented scale (BRD §7.3). Implements
 * design-decisions.md's "Audit-Log Read-Consistency/Freshness-Snapshot Pattern" in full: every
 * result set states an explicit "results as of [timestamp]" freshness (reusing ADMIN-9's Dashboard
 * freshness-label component) with a MANUAL refresh affordance only -- there is no auto-refresh or
 * live push anywhere on this screen, by design.
 *
 * A query spanning more than {@link WIDE_RANGE_WARNING_DAYS} days is warned about (edge-cases.md
 * §9) and requires an explicit second click to run anyway -- ums-core itself enforces no
 * date-range-width limit, only a `take<=200` page-size cap, so this warning is a client-side
 * courtesy, not a hard block.
 */
@Component({
  selector: 'app-audit-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsDateRangePickerComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
    FreshnessLabelComponent,
  ],
  templateUrl: './audit-explorer.component.html',
  styleUrl: './audit-explorer.component.scss',
})
export class AuditExplorerComponent implements OnDestroy {
  protected readonly store = inject(AuditStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: AuditLogEntryDto): string => row.id;
  protected readonly exportFormatOptions = EXPORT_FORMAT_OPTIONS;

  private readonly jobPoller = inject(JobPollerService);

  protected readonly entityType = signal('');
  protected readonly entityId = signal('');
  protected readonly actorId = signal('');
  protected readonly action = signal('');
  protected readonly application = signal('');
  protected readonly dateFrom = signal<string | null>(null);
  protected readonly dateTo = signal<string | null>(null);
  protected readonly skip = signal(0);
  protected readonly take = 50;

  protected readonly wideRangeAcknowledged = signal(false);

  protected readonly isWideRange = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from || !to) return false;
    const days = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
    return days > WIDE_RANGE_WARNING_DAYS;
  });

  protected onRangeChange(range: { start: string | null; end: string | null }): void {
    this.dateFrom.set(range.start);
    this.dateTo.set(range.end);
    this.wideRangeAcknowledged.set(false);
  }

  protected runQuery(): void {
    if (this.isWideRange() && !this.wideRangeAcknowledged()) {
      this.wideRangeAcknowledged.set(true);
      return;
    }
    this.skip.set(0);
    this.executeQuery();
  }

  protected refresh(): void {
    this.executeQuery();
  }

  private executeQuery(): void {
    this.store.query({
      entityType: this.entityType().trim() || undefined,
      entityId: this.entityId().trim() || undefined,
      actorId: this.actorId().trim() || undefined,
      action: this.action().trim() || undefined,
      application: this.application().trim() || undefined,
      dateFrom: this.dateFrom() ?? undefined,
      dateTo: this.dateTo() ?? undefined,
      skip: this.skip(),
      take: this.take,
    });
  }

  protected nextPage(): void {
    if (this.skip() + this.take < this.store.totalCount()) {
      this.skip.update((s) => s + this.take);
      this.executeQuery();
    }
  }

  protected previousPage(): void {
    if (this.skip() > 0) {
      this.skip.update((s) => Math.max(0, s - this.take));
      this.executeQuery();
    }
  }

  // ---- Export (audit.export.generate) ----
  protected readonly exportFormat = signal<AuditExportFormat | string>('Csv');
  private readonly trackerHandle = signal<JobTrackerHandle<AuditExportRequestDto> | null>(null);
  protected readonly exportSnapshot = computed(() => this.trackerHandle()?.snapshot() ?? null);
  protected readonly isExporting = computed(() => this.trackerHandle() !== null);

  ngOnDestroy(): void {
    this.trackerHandle()?.stop();
  }

  protected submitExport(): void {
    this.store
      .requestExport({
        entityType: this.entityType().trim() || undefined,
        entityId: this.entityId().trim() || undefined,
        actorId: this.actorId().trim() || undefined,
        action: this.action().trim() || undefined,
        application: this.application().trim() || undefined,
        dateFrom: this.dateFrom() ?? undefined,
        dateTo: this.dateTo() ?? undefined,
        format: this.exportFormat() as AuditExportFormat,
      })
      .subscribe((exportRequest) => this.startPollingExport(exportRequest.id));
  }

  private startPollingExport(id: string): void {
    this.trackerHandle()?.stop();
    const handle = this.jobPoller.track(() =>
      this.store.fetchExportStatus(id).pipe(map(toAuditExportSnapshot)),
    );
    this.trackerHandle.set(handle);
  }
}
