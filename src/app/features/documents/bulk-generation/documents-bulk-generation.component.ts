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
  UmsFormFieldComponent,
  UmsProgressBarComponent,
  UmsSelectComponent,
  UmsTextareaComponent,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { JobPollerService, type JobTrackerHandle } from '../../../shared/jobs/job-poller.service';
import { DocumentsStore, toBulkGenerationSnapshot } from '../state/documents.store';
import type { BulkGenerationItemInput, BulkGenerationJobDto } from '../documents.types';

const DOCUMENT_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'AdmitCard', label: 'Admit Card' },
  { value: 'MeritList', label: 'Merit List' },
  { value: 'Transcript', label: 'Transcript' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'IdCard', label: 'Id Card' },
  { value: 'Receipt', label: 'Receipt' },
  { value: 'RegulatoryReport', label: 'Regulatory Report' },
];

/**
 * ADMIN-31: Bulk document generation as a real async job (requirement-spec.md §8 invariant #4),
 * reusing the shared `JobPollerService` (ADMIN-7) rather than a bespoke `setInterval`. There is no
 * filter-based bulk-select -- every target `OwnerId`/`SourceReferenceId` must be enumerated
 * client-side (one line per item, `ownerId,sourceReferenceId` CSV pairs kept intentionally simple).
 * `GET /jobs/{id}` only exposes aggregate counters, never a per-item detail, so this screen shows
 * only the aggregate dead-letter count, never a per-row reason.
 */
@Component({
  selector: 'app-documents-bulk-generation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsSelectComponent,
    UmsTextareaComponent,
    UmsProgressBarComponent,
    HasPermissionDirective,
  ],
  templateUrl: './documents-bulk-generation.component.html',
  styleUrl: './documents-bulk-generation.component.scss',
})
export class DocumentsBulkGenerationComponent implements OnDestroy {
  protected readonly store = inject(DocumentsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;

  private readonly jobPoller = inject(JobPollerService);
  private readonly trackerHandle = signal<JobTrackerHandle<BulkGenerationJobDto> | null>(null);
  protected readonly snapshot = computed(() => this.trackerHandle()?.snapshot() ?? null);
  protected readonly isTracking = computed(() => this.trackerHandle() !== null);

  protected readonly documentType = signal('IdCard');
  /** One `ownerId,sourceReferenceId` pair per line -- there is no filter-based bulk-select. */
  protected readonly itemsCsv = signal('');

  ngOnDestroy(): void {
    this.trackerHandle()?.stop();
  }

  private parseItems(): readonly BulkGenerationItemInput[] {
    return this.itemsCsv()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [ownerId, sourceReferenceId] = line.split(',').map((s) => s.trim());
        return { OwnerId: ownerId, SourceReferenceId: sourceReferenceId, Fields: {} };
      })
      .filter((item) => item.OwnerId && item.SourceReferenceId);
  }

  protected submit(): void {
    const items = this.parseItems();
    if (items.length === 0) return;
    this.store.submitBulkGeneration({ DocumentType: this.documentType(), Items: items }).subscribe({
      next: (job) => this.startPolling(job.id),
    });
  }

  private startPolling(jobId: string): void {
    this.trackerHandle()?.stop();
    const handle = this.jobPoller.track(() =>
      this.store.fetchBulkGenerationJob(jobId).pipe(map(toBulkGenerationSnapshot)),
    );
    this.trackerHandle.set(handle);
  }
}
