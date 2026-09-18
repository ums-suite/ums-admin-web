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
import { ContentEventsStore } from '../state/content-events.store';
import type { EventDto } from '../content.types';

const COLUMNS: readonly DataTableColumn<EventDto>[] = [
  { id: 'title', header: 'Title', accessor: (r) => r.title, sortable: true, filterable: true },
  { id: 'startAt', header: 'Starts', accessor: (r) => r.startAt, sortable: true },
  { id: 'endAt', header: 'Ends', accessor: (r) => r.endAt },
];

/**
 * ADMIN-30: Event calendar list/create/edit + translation. **No schedule/publish/archive/delete
 * step exists** -- an Event's own `startAt`/`endAt` window IS its visibility window, so create can
 * carry an OPTIONAL inline translation rather than Notice's two-step Draft-then-translate flow.
 */
@Component({
  selector: 'app-content-events',
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
  templateUrl: './content-events.component.html',
  styleUrl: './content-events.component.scss',
})
export class ContentEventsComponent {
  protected readonly store = inject(ContentEventsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly toast = inject(UmsToastService);
  protected readonly conflict = signal(false);

  protected readonly audienceOptions: readonly SelectOption[] = [
    { value: 'Public', label: 'Public' },
    { value: 'Student', label: 'Student' },
    { value: 'Faculty', label: 'Faculty' },
    { value: 'Admin', label: 'Admin' },
  ];

  protected readonly fromDate = signal('');
  protected readonly toDate = signal('');

  protected readonly newTitle = signal('');
  protected readonly newBody = signal('');
  protected readonly newStartAt = signal('');
  protected readonly newEndAt = signal('');
  protected readonly newAudience = signal('Public');
  protected readonly newTranslationLanguage = signal('');
  protected readonly newTranslationTitle = signal('');
  protected readonly newTranslationBody = signal('');

  protected readonly editEventId = signal('');

  protected loadEvents(): void {
    this.store.loadEvents({
      from: this.fromDate().trim() || undefined,
      to: this.toDate().trim() || undefined,
    });
  }

  protected submitCreate(): void {
    const title = this.newTitle().trim();
    const body = this.newBody().trim();
    const startAt = this.newStartAt();
    const endAt = this.newEndAt();
    if (!title || !body || !startAt || !endAt) return;

    const languageCode = this.newTranslationLanguage().trim();
    this.store
      .createEvent({
        Title: title,
        Body: body,
        StartAt: startAt,
        EndAt: endAt,
        Audience: [this.newAudience()],
        ...(languageCode
          ? {
              TranslationLanguageCode: languageCode,
              TranslationTitle: this.newTranslationTitle().trim(),
              TranslationBody: this.newTranslationBody().trim(),
            }
          : {}),
      })
      .subscribe(() => {
        this.newTitle.set('');
        this.newBody.set('');
      });
  }

  protected loadForEdit(id: string): void {
    this.conflict.set(false);
    this.editEventId.set(id);
    this.store.loadEvent(id);
  }

  protected reloadAfterConflict(): void {
    this.conflict.set(false);
    const id = this.editEventId().trim();
    if (id) this.store.loadEvent(id);
  }

  protected readonly editTranslationLanguage = signal('');
  protected readonly editTranslationTitle = signal('');
  protected readonly editTranslationBody = signal('');

  protected submitTranslation(): void {
    const event = this.store.currentEvent();
    const languageCode = this.editTranslationLanguage().trim();
    const title = this.editTranslationTitle().trim();
    const body = this.editTranslationBody().trim();
    if (!event || !languageCode || !title || !body) return;
    this.conflict.set(false);
    this.store
      .addTranslation(event.id, {
        LanguageCode: languageCode,
        Title: title,
        Body: body,
        Version: event.version,
      })
      .subscribe({
        next: () => this.toast.show('Translation added.', { variant: 'success' }),
        error: (e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status === 409) {
            this.conflict.set(true);
          } else {
            this.toast.show(toUmsApiError(e).message, { variant: 'danger' });
          }
        },
      });
  }
}
