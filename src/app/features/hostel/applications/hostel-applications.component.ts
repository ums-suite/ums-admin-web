import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService, toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { HostelApplicationsStore } from '../state/hostel-applications.store';
import {
  HOSTEL_CONFLICT_MESSAGE,
  isHostelConflictCode,
  type EligibilityRuleDto,
  type HostelApplicationDecision,
  type HostelApplicationDto,
} from '../hostel.types';

const APPLICATION_COLUMNS: readonly DataTableColumn<HostelApplicationDto>[] = [
  { id: 'id', header: 'Application', accessor: (r) => r.id },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true, filterable: true },
  { id: 'rank', header: 'Rank', accessor: (r) => r.rank, numeric: true },
];

/**
 * ADMIN-28: Application Window configuration (eligible programs/years/eligibility rules,
 * ranking), the self-service submit/withdraw flow, and officer review.
 *
 * **Approving auto-allocates a bed server-side** -- there is no manual bed-picking step anywhere
 * in this screen (confirmed real, see `hostel.types.ts`'s own doc).
 *
 * **Conflict handling**: a 409 here means the routine, expected app-level race outcome (someone
 * else already reviewed the application, or no bed was available at approval time) or the rare
 * DB-constraint backstop -- all three ums-core `code` values get the exact same honest message
 * (`HOSTEL_CONFLICT_MESSAGE`), never a generic error.
 */
@Component({
  selector: 'app-hostel-applications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './hostel-applications.component.html',
  styleUrl: './hostel-applications.component.scss',
})
export class HostelApplicationsComponent {
  protected readonly store = inject(HostelApplicationsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = APPLICATION_COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly ruleTypeOptions: readonly SelectOption[] = [
    { value: 'MinimumYearOfStudy', label: 'Minimum year of study' },
    { value: 'FinancialNeedRequired', label: 'Financial need required' },
    { value: 'MinimumHomeDistrictDistanceKm', label: 'Minimum home-district distance (km)' },
  ];
  protected readonly decisionOptions: readonly SelectOption[] = [
    { value: 'Approve', label: 'Approve' },
    { value: 'Waitlist', label: 'Waitlist' },
    { value: 'Reject', label: 'Reject' },
  ];

  // -- Windows --
  protected readonly newWindowName = signal('');
  protected readonly newWindowOpensAt = signal('');
  protected readonly newWindowClosesAt = signal('');

  protected readonly configWindowId = signal('');
  protected readonly programIdsCsv = signal('');
  protected readonly yearsCsv = signal('');
  protected readonly draftRules = signal<readonly EligibilityRuleDto[]>([]);
  protected readonly ruleTypeInput = signal<string>('MinimumYearOfStudy');
  protected readonly ruleValueInput = signal('');
  protected readonly ruleDescriptionInput = signal('');
  protected readonly rankWindowId = signal('');
  protected readonly lastRankedCount = signal<number | null>(null);
  protected readonly rankError = signal<string | null>(null);

  // -- Self-service --
  protected readonly submitWindowId = signal('');

  // -- Review --
  protected readonly reviewWindowId = signal('');
  protected readonly reviewStatus = signal('Submitted');
  protected readonly reviewReason = signal('');

  protected loadWindows(): void {
    this.store.loadApplicationWindows();
  }

  protected submitCreateWindow(): void {
    const name = this.newWindowName().trim();
    const opensAt = this.newWindowOpensAt();
    const closesAt = this.newWindowClosesAt();
    if (!name || !opensAt || !closesAt) return;
    this.store
      .createApplicationWindow({ name, opensAt, closesAt })
      .subscribe(() => this.newWindowName.set(''));
  }

  protected submitEligiblePrograms(): void {
    const id = this.configWindowId().trim();
    const ids = this.programIdsCsv()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!id || ids.length === 0) return;
    this.store.setEligiblePrograms(id, ids).subscribe();
  }

  protected submitEligibleYears(): void {
    const id = this.configWindowId().trim();
    const years = this.yearsCsv()
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (!id || years.length === 0) return;
    this.store.setEligibleYears(id, years).subscribe();
  }

  protected addDraftRule(): void {
    const value = this.ruleValueInput().trim();
    if (!value) return;
    this.draftRules.update((rules) => [
      ...rules,
      {
        ruleType: this.ruleTypeInput(),
        value,
        description: this.ruleDescriptionInput().trim() || null,
      },
    ]);
    this.ruleValueInput.set('');
    this.ruleDescriptionInput.set('');
  }

  protected removeDraftRule(index: number): void {
    this.draftRules.update((rules) => rules.filter((_, i) => i !== index));
  }

  protected submitEligibilityRules(): void {
    const id = this.configWindowId().trim();
    const rules = this.draftRules();
    if (!id || rules.length === 0) return;
    this.store.setEligibilityRules(id, rules).subscribe(() => this.draftRules.set([]));
  }

  protected submitRank(): void {
    const id = this.rankWindowId().trim();
    if (!id) return;
    this.rankError.set(null);
    this.store.rankApplications(id).subscribe({
      next: (result) => this.lastRankedCount.set(result.rankedCount),
      error: (e: unknown) => this.rankError.set(toUmsApiError(e).message),
    });
  }

  protected submitApplication(): void {
    const applicationWindowId = this.submitWindowId().trim();
    if (!applicationWindowId) return;
    this.store
      .submitApplication({ applicationWindowId })
      .subscribe(() => this.submitWindowId.set(''));
  }

  protected loadMyApplications(): void {
    this.store.loadMyApplications();
  }

  protected withdraw(id: string): void {
    this.store.withdrawApplication(id).subscribe();
  }

  protected loadReviewQueue(): void {
    const windowId = this.reviewWindowId().trim();
    const status = this.reviewStatus().trim();
    if (!windowId || !status) return;
    this.store.loadReviewQueue(windowId, status);
  }

  protected review(applicationId: string, decision: HostelApplicationDecision): void {
    const sinceIso = new Date().toISOString();
    const reason = this.reviewReason().trim() || undefined;

    this.auditedAction
      .confirmAndRun({
        title: `${decision} hostel application`,
        description:
          decision === 'Approve'
            ? 'Approving auto-allocates a bed server-side -- there is no manual bed-picking step.'
            : `Application ${applicationId} will be marked ${decision}.`,
        reasonLabel: 'Reason (optional)',
        perform: () =>
          this.store
            .reviewApplication(applicationId, { Decision: decision, Reason: reason })
            .pipe(
              switchMap((app) =>
                confirmLatestAuditEntry(this.auditApi, 'HostelApplication', app.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: app, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `Application ${decision.toLowerCase()}ed (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) =>
          isHostelConflictCode(error.code) ? HOSTEL_CONFLICT_MESSAGE : error.message,
      })
      .subscribe();
  }
}
