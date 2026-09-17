import { SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsEmptyStateComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsTabBarComponent,
  UmsTimelineComponent,
  type TabBarItem,
  type TimelineEntry,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import type { DocumentType } from '../../documents/documents.types';
import { StudentProfile360Store } from '../state/student-profile-360.store';

interface RawAuditLogEntry {
  readonly id: string;
  readonly occurredAt: string;
  readonly action: string;
  readonly beforeValue?: string | null;
  readonly afterValue?: string | null;
  readonly reason?: string | null;
}

interface RawAuditLogEntryListPage {
  readonly items?: readonly RawAuditLogEntry[];
}

const TABS: readonly TabBarItem[] = [
  { label: 'Academic' },
  { label: 'Financial' },
  { label: 'Hostel' },
  { label: 'Library' },
  { label: 'Documents' },
  { label: 'Status History' },
  { label: 'Requests' },
];

const DOCUMENT_TRIGGERS: readonly { type: DocumentType; label: string }[] = [
  { type: 'IdCard', label: 'Generate ID Card' },
  { type: 'Certificate', label: 'Generate Certificate' },
  { type: 'Transcript', label: 'Generate Transcript' },
];

/**
 * ADMIN-17: Student 360 profile (requirement-spec.md §3.6, §7 key screen) -- a single tabbed view
 * replacing five separate lookups. Only Documents (real, via `DocumentsApi`) and Status History
 * (via the Audit Log, the same interim mechanism used platform-wide for "name your own audit
 * trail") have a real data source to render today -- Academic/Financial/Hostel/Library each show
 * an explicit "not available yet" empty state rather than fabricated data, since those modules'
 * own student-scoped read endpoints are later, separate tickets (ADMIN-18+, 24, 27, 29) this one
 * does not reach into. The Requests tab is an id-based StudentRequest lookup + approve/reject,
 * since no queue/list endpoint exists (see `student.types.ts`'s own doc).
 */
@Component({
  selector: 'app-student-profile-360',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SlicePipe,
    UmsTabBarComponent,
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsEmptyStateComponent,
    UmsTimelineComponent,
    HasPermissionDirective,
  ],
  templateUrl: './student-profile-360.component.html',
  styleUrl: './student-profile-360.component.scss',
})
export class StudentProfile360Component implements OnInit {
  protected readonly store = inject(StudentProfile360Store);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly tabs = TABS;
  protected readonly documentTriggers = DOCUMENT_TRIGGERS;

  private readonly route = inject(ActivatedRoute);
  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly selectedTabIndex = signal(0);
  protected readonly statusHistory = signal<readonly TimelineEntry[]>([]);
  protected readonly statusHistoryError = signal<string | null>(null);

  protected readonly lookupRequestId = signal('');
  protected readonly rejectReason = signal('');

  protected readonly hasIdentityUser = computed(() => this.store.student()?.identityUserId != null);

  ngOnInit(): void {
    const studentId = this.route.snapshot.paramMap.get('studentId');
    if (!studentId) return;
    this.store.loadStudent(studentId);
  }

  protected onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    const student = this.store.student();
    if (!student) return;

    if (index === 4 && student.identityUserId) {
      this.store.loadDocuments(student.identityUserId);
    }
    if (index === 5) {
      this.loadStatusHistory(student.id);
    }
  }

  private loadStatusHistory(studentId: string): void {
    this.statusHistoryError.set(null);
    (
      this.auditApi.apiV1AuditEntriesGet(
        'Student',
        studentId,
      ) as Observable<RawAuditLogEntryListPage>
    ).subscribe({
      next: (page) => {
        const items = page.items ?? [];
        this.statusHistory.set(items.map(toTimelineEntry));
      },
      error: () => this.statusHistoryError.set('Could not load status history from the Audit Log.'),
    });
  }

  protected triggerDocumentGeneration(documentType: DocumentType): void {
    const student = this.store.student();
    if (!student?.identityUserId) return;
    const ownerId = student.identityUserId;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: `Generate ${documentType}`,
        description: `A ${documentType} will be generated for ${student.givenName} ${student.familyName}.`,
        perform: () =>
          this.store
            .generateDocument({
              ownerId,
              documentType,
              sourceReferenceId: student.id,
              fields: {},
              language: null,
            })
            .pipe(
              switchMap((document) =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'GeneratedDocument',
                  document.id,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: document, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) =>
          `${documentType} generation requested (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not generate ${documentType}: ${error.message}`,
      })
      .subscribe();
  }

  protected loadStudentRequest(): void {
    const id = this.lookupRequestId().trim();
    if (!id) return;
    this.store.loadStudentRequest(id);
  }

  protected approveRequest(): void {
    const request = this.store.studentRequest();
    if (!request) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Approve student request',
        description: `${request.requestType} request will be approved.`,
        perform: () =>
          this.store
            .approveStudentRequest(request.id, request.version)
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'StudentRequest', updated.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: updated, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Request approved (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not approve request: ${error.message}`,
      })
      .subscribe();
  }

  protected rejectRequest(): void {
    const request = this.store.studentRequest();
    const reason = this.rejectReason().trim();
    if (!request || !reason) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Reject student request',
        description: `${request.requestType} request will be rejected.`,
        reasonLabel: 'Reason for rejection',
        perform: () =>
          this.store
            .rejectStudentRequest(request.id, reason, request.version)
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(this.auditApi, 'StudentRequest', updated.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: updated, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Request rejected (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not reject request: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) this.rejectReason.set('');
      });
  }
}

function toTimelineEntry(entry: RawAuditLogEntry): TimelineEntry {
  return {
    title: entry.action,
    description: entry.reason ?? undefined,
    timestamp: entry.occurredAt,
  };
}
