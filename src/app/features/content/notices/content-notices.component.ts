import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  UmsTextareaComponent,
  UmsToastService,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { VersionConflictBannerComponent } from '../../../shared/conflict/version-conflict-banner.component';
import { ContentNoticesStore } from '../state/content-notices.store';
import type { NoticeDto } from '../content.types';

const COLUMNS: readonly DataTableColumn<NoticeDto>[] = [
  { id: 'title', header: 'Title', accessor: (r) => r.title, sortable: true, filterable: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
  { id: 'isUrgent', header: 'Urgent', accessor: (r) => (r.isUrgent ? 'Yes' : 'No') },
];

/**
 * ADMIN-30: Notice feed, create, translation (a real `NoticeTranslation` table keyed by
 * `LanguageCode`), and schedule/publish/archive. Every mutating call requires the current
 * `Version` -- a 409 here is caught explicitly and rendered via the shared
 * `VersionConflictBannerComponent`, reloading the notice by id rather than silently merging.
 */
@Component({
  selector: 'app-content-notices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    UmsTextareaComponent,
    HasPermissionDirective,
    VersionConflictBannerComponent,
  ],
  templateUrl: './content-notices.component.html',
  styleUrl: './content-notices.component.scss',
})
export class ContentNoticesComponent {
  protected readonly store = inject(ContentNoticesStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly toast = inject(UmsToastService);
  protected readonly conflict = signal(false);

  protected readonly feedAudience = signal('');

  protected readonly newTitle = signal('');
  protected readonly newBody = signal('');
  protected readonly newAudience = signal('Public');
  protected readonly newIsUrgent = signal(false);

  protected readonly editNoticeId = signal('');
  protected readonly translationLanguageCode = signal('');
  protected readonly translationTitle = signal('');
  protected readonly translationBody = signal('');

  protected readonly audienceOptions: readonly SelectOption[] = [
    { value: 'Public', label: 'Public' },
    { value: 'Student', label: 'Student' },
    { value: 'Faculty', label: 'Faculty' },
    { value: 'Admin', label: 'Admin' },
  ];

  protected loadFeed(): void {
    const audience = this.feedAudience().trim() || undefined;
    this.store.loadFeed({ audience });
  }

  protected submitCreate(): void {
    const title = this.newTitle().trim();
    const body = this.newBody().trim();
    if (!title || !body) return;
    this.store
      .createNotice({
        Title: title,
        Body: body,
        Audience: [this.newAudience()],
        IsUrgent: this.newIsUrgent(),
      })
      .subscribe(() => {
        this.newTitle.set('');
        this.newBody.set('');
      });
  }

  protected loadForEdit(id: string): void {
    this.conflict.set(false);
    this.editNoticeId.set(id);
    this.store.loadNotice(id);
  }

  protected reloadAfterConflict(): void {
    this.conflict.set(false);
    const id = this.editNoticeId().trim();
    if (id) this.store.loadNotice(id);
  }

  protected submitTranslation(): void {
    const notice = this.store.currentNotice();
    const languageCode = this.translationLanguageCode().trim();
    const title = this.translationTitle().trim();
    const body = this.translationBody().trim();
    if (!notice || !languageCode || !title || !body) return;
    this.conflict.set(false);
    this.store
      .addTranslation(notice.id, {
        LanguageCode: languageCode,
        Title: title,
        Body: body,
        Version: notice.version,
      })
      .subscribe({
        next: () => this.toast.show('Translation added.', { variant: 'success' }),
        error: (e: unknown) => this.handleMutationError(e),
      });
  }

  protected transition(action: 'schedule' | 'publish' | 'archive'): void {
    const notice = this.store.currentNotice();
    if (!notice) return;
    this.conflict.set(false);
    const request = { Version: notice.version };
    const call =
      action === 'schedule'
        ? this.store.scheduleNotice(notice.id, request)
        : action === 'publish'
          ? this.store.publishNotice(notice.id, request)
          : this.store.archiveNotice(notice.id, request);
    const pastTense: Record<typeof action, string> = {
      schedule: 'scheduled',
      publish: 'published',
      archive: 'archived',
    };
    call.subscribe({
      next: () => this.toast.show(`Notice ${pastTense[action]}.`, { variant: 'success' }),
      error: (e: unknown) => this.handleMutationError(e),
    });
  }

  private handleMutationError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      this.conflict.set(true);
    } else {
      this.toast.show(toUmsApiError(error).message, { variant: 'danger' });
    }
  }
}
