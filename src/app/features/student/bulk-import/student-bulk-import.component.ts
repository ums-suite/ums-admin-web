import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsFileUploadComponent,
  UmsProgressBarComponent,
  type UploadableFile,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { JobPollerService, type JobTrackerHandle } from '../../../shared/jobs/job-poller.service';
import type { StudentBulkImportJobReportDto, StudentBulkImportRowInput } from '../student.types';
import { StudentBulkImportStore, toJobSnapshot } from '../state/student-bulk-import.store';
import { parseStudentBulkImportCsv } from './student-bulk-import-csv.util';

/**
 * ADMIN-16: Bulk student import as a real async job (requirement-spec.md §3.6, §8 invariant #4,
 * design-decisions.md's Bulk-Job Progress Mechanism) -- Upload (client-side CSV parse, synchronous
 * server-side structural validation) -> Preview errors -> Approve -> Process/poll -> final report.
 * Row-level errors are always reported per row (`StudentBulkImportRowReportDto`); an Invalid or
 * Failed row never rolls back the whole job, per the confirmed real job state machine (see
 * `student-bulk-import.store.ts`'s own doc -- there is no whole-job "Failed" status).
 *
 * Polling (after Approve) reuses the shared `JobPollerService` (ADMIN-7) directly rather than a
 * bespoke `setInterval`, per design-decisions.md's platform-wide Bulk-Job Progress Mechanism.
 */
@Component({
  selector: 'app-student-bulk-import',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFileUploadComponent,
    UmsProgressBarComponent,
    HasPermissionDirective,
  ],
  templateUrl: './student-bulk-import.component.html',
  styleUrl: './student-bulk-import.component.scss',
})
export class StudentBulkImportComponent implements OnDestroy {
  protected readonly store = inject(StudentBulkImportStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);
  private readonly jobPoller = inject(JobPollerService);

  protected readonly selectedFileName = signal<string | null>(null);
  protected readonly parsedRows = signal<readonly StudentBulkImportRowInput[]>([]);
  protected readonly uploadableFiles = signal<readonly UploadableFile[]>([]);

  private readonly trackerHandle = signal<JobTrackerHandle<StudentBulkImportJobReportDto> | null>(
    null,
  );
  protected readonly snapshot = computed(() => this.trackerHandle()?.snapshot() ?? null);
  protected readonly isTracking = computed(() => this.trackerHandle() !== null);

  ngOnDestroy(): void {
    this.trackerHandle()?.stop();
  }

  protected onFilesSelected(files: FileList): void {
    const file = files.item(0);
    if (!file) return;
    this.selectedFileName.set(file.name);
    this.uploadableFiles.set([
      { id: file.name, name: file.name, sizeBytes: file.size, progress: 100, status: 'success' },
    ]);

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      this.parsedRows.set(parseStudentBulkImportCsv(text));
    };
    reader.readAsText(file);
  }

  protected removeFile(): void {
    this.selectedFileName.set(null);
    this.parsedRows.set([]);
    this.uploadableFiles.set([]);
  }

  protected submitUpload(): void {
    if (this.parsedRows().length === 0) return;
    this.store.upload(this.parsedRows());
  }

  protected startNewImport(): void {
    this.trackerHandle()?.stop();
    this.trackerHandle.set(null);
    this.store.reset();
    this.removeFile();
  }

  protected approve(): void {
    const job = this.store.job();
    if (!job) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Approve bulk student import',
        description: `${job.validRowCount} valid row(s) will be processed; ${job.invalidRowCount} invalid row(s) will be skipped and reported.`,
        perform: () =>
          this.store
            .approve(job.id)
            .pipe(
              switchMap((approved) =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'StudentBulkImportJob',
                  approved.id,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: approved, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) =>
          `Import approved and processing started (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not approve import: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) this.startPolling(job.id);
      });
  }

  private startPolling(jobId: string): void {
    const handle = this.jobPoller.track(() =>
      this.store.fetchReport(jobId).pipe(map(toJobSnapshot)),
    );
    this.trackerHandle.set(handle);
  }
}
