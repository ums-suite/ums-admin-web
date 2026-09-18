import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { map, tap } from 'rxjs';
import { toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsProgressBarComponent,
  UmsSelectComponent,
  UmsTextareaComponent,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { DocumentsApi } from '../../documents/documents.api';
import { JobPollerService, type JobTrackerHandle } from '../../../shared/jobs/job-poller.service';
import {
  ReportingRegulatoryStore,
  toRegulatoryRunSnapshot,
} from '../state/reporting-regulatory.store';
import type {
  RegulatoryReportCategory,
  RegulatoryReportFieldInput,
  RegulatoryReportRunFormat,
  RegulatoryReportRunStatusDto,
} from '../regulatory-reports.types';

const CATEGORY_OPTIONS: readonly SelectOption[] = [
  'StudentEnrollment',
  'GenderDistribution',
  'ProgramStatistics',
  'FacultyStaffStatistics',
  'Graduation',
  'AcademicPerformance',
  'Research',
  'FinancialInformation',
  'Infrastructure',
  'Scholarships',
  'InternationalStudents',
].map((v) => ({ value: v, label: v }));

/** Only Pdf/Csv -- Excel is declarable server-side but not implemented, see class doc. */
const RUN_FORMAT_OPTIONS: readonly SelectOption[] = [
  { value: 'Pdf', label: 'PDF' },
  { value: 'Csv', label: 'CSV' },
];

/**
 * ADMIN-33: Regulatory report builder -- fields/filters/format composer with a client-side-only
 * live preview (no preview endpoint exists anywhere), definition create (gated
 * `reporting.regulatory.manage`), and run submit/poll/download (gated `reporting.regulatory.run`
 * -- a SEPARATE permission from managing definitions, a confirmed real gap flagged in this
 * screen's own template: a run-only caller cannot browse this same screen's definitions catalog).
 *
 * Excel is NEVER offered as a run format -- confirmed unimplemented server-side even though the
 * backend's own flags enum can declare it. A PDF result is downloaded via the existing
 * `DocumentsApi.getById` (the run status DTO itself carries no download URL, only a
 * `resultDocumentId`); a CSV result's `resultCsvContent` is inline text, downloaded here as a
 * client-side Blob.
 */
@Component({
  selector: 'app-reporting-builder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    UmsTextareaComponent,
    UmsProgressBarComponent,
    HasPermissionDirective,
  ],
  templateUrl: './reporting-builder.component.html',
  styleUrl: './reporting-builder.component.scss',
})
export class ReportingBuilderComponent implements OnDestroy {
  protected readonly store = inject(ReportingRegulatoryStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly runFormatOptions = RUN_FORMAT_OPTIONS;

  private readonly documentsApi = inject(DocumentsApi);
  private readonly jobPoller = inject(JobPollerService);

  // ---- Definitions catalog + composer ----
  protected readonly newName = signal('');
  protected readonly newCategory = signal<RegulatoryReportCategory | string>('StudentEnrollment');
  protected readonly draftFields = signal<readonly RegulatoryReportFieldInput[]>([]);
  protected readonly fieldKeyInput = signal('');
  protected readonly fieldLabelInput = signal('');
  protected readonly filtersJson = signal('');
  protected readonly includePdf = signal(true);
  protected readonly includeCsv = signal(true);

  protected readonly previewColumns = computed(() => this.draftFields().map((f) => f.label));

  protected loadDefinitions(): void {
    this.store.loadDefinitions();
  }

  protected addField(): void {
    const fieldKey = this.fieldKeyInput().trim();
    const label = this.fieldLabelInput().trim();
    if (!fieldKey || !label) return;
    this.draftFields.update((fields) => [...fields, { fieldKey, label }]);
    this.fieldKeyInput.set('');
    this.fieldLabelInput.set('');
  }

  protected removeField(index: number): void {
    this.draftFields.update((fields) => fields.filter((_, i) => i !== index));
  }

  protected submitCreateDefinition(): void {
    const name = this.newName().trim();
    const fields = this.draftFields();
    if (!name || fields.length === 0) return;
    const formats = [this.includePdf() ? 'Pdf' : null, this.includeCsv() ? 'Csv' : null]
      .filter(Boolean)
      .join(', ');

    this.store
      .createDefinition({
        name,
        category: this.newCategory(),
        fields,
        filtersJson: this.filtersJson().trim() || null,
        supportedFormats: formats,
      })
      .subscribe(() => {
        this.newName.set('');
        this.draftFields.set([]);
      });
  }

  // ---- Run submit/poll/download ----
  protected readonly runDefinitionId = signal('');
  protected readonly runFormat = signal<RegulatoryReportRunFormat | string>('Pdf');
  protected readonly runError = signal<string | null>(null);
  protected readonly downloadUrl = signal<string | null>(null);

  private readonly trackerHandle = signal<JobTrackerHandle<RegulatoryReportRunStatusDto> | null>(
    null,
  );
  protected readonly snapshot = computed(() => this.trackerHandle()?.snapshot() ?? null);
  protected readonly isTracking = computed(() => this.trackerHandle() !== null);

  ngOnDestroy(): void {
    this.trackerHandle()?.stop();
  }

  protected submitRun(): void {
    const definitionId = this.runDefinitionId().trim();
    if (!definitionId) return;
    this.runError.set(null);
    this.downloadUrl.set(null);

    this.store
      .enqueueRun(definitionId, { parametersJson: null, format: this.runFormat() })
      .subscribe({
        next: (result) => this.startPolling(result.runId),
        error: (e: unknown) => this.runError.set(toUmsApiError(e).message),
      });
  }

  private startPolling(runId: string): void {
    this.trackerHandle()?.stop();
    const handle = this.jobPoller.track(() =>
      this.store.fetchRunStatus(runId).pipe(
        tap((run) => {
          if (run.status === 'Completed') this.resolveDownload(run);
        }),
        map(toRegulatoryRunSnapshot),
      ),
    );
    this.trackerHandle.set(handle);
  }

  private resolveDownload(run: RegulatoryReportRunStatusDto): void {
    if (run.resultDocumentId) {
      this.documentsApi
        .getById(run.resultDocumentId)
        .pipe(map((doc) => doc.downloadUrl))
        .subscribe((url) => this.downloadUrl.set(url));
    } else if (run.resultCsvContent) {
      const blob = new Blob([run.resultCsvContent], { type: 'text/csv' });
      this.downloadUrl.set(URL.createObjectURL(blob));
    }
  }
}
