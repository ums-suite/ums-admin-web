import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  UmsTextareaComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { NotificationsStore } from '../../notifications/state/notifications.store';
import {
  validateNotificationTranslation,
  type NotificationChannel,
  type NotificationTemplateDto,
} from '../../notifications/notifications.types';

const CHANNEL_OPTIONS: readonly SelectOption[] = [
  { value: 'Email', label: 'Email' },
  { value: 'Sms', label: 'SMS' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Push', label: 'Push' },
  { value: 'InApp', label: 'In-app' },
];

const COLUMNS: readonly DataTableColumn<NotificationTemplateDto>[] = [
  { id: 'eventType', header: 'Event type', accessor: (r) => r.eventType, sortable: true },
  { id: 'channel', header: 'Channel', accessor: (r) => r.channel, sortable: true },
  { id: 'version', header: 'Version', accessor: (r) => r.version, numeric: true },
  {
    id: 'translations',
    header: 'Languages',
    accessor: (r) => r.translations.map((t) => t.languageCode).join(', '),
  },
];

/**
 * ADMIN-35: Notification template administration -- the one genuinely new, fully-real piece of
 * System Configuration's scope. `POST /templates` is idempotent get-or-create by
 * `(EventType, Channel)`; `PUT /templates/{id}` upserts exactly one language's translation.
 * Validation is baked into the domain (Email requires Subject; Push requires PushTitle; SMS/
 * WhatsApp Body capped at 480 chars) and mirrored here client-side before ever calling the API.
 */
@Component({
  selector: 'app-system-config-notification-templates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    UmsTextareaComponent,
    HasPermissionDirective,
  ],
  templateUrl: './system-config-notification-templates.component.html',
  styleUrl: './system-config-notification-templates.component.scss',
})
export class SystemConfigNotificationTemplatesComponent {
  protected readonly store = inject(NotificationsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly channelOptions = CHANNEL_OPTIONS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  protected readonly newEventType = signal('');
  protected readonly newChannel = signal<NotificationChannel | string>('Email');

  protected readonly editTemplateId = signal('');
  protected readonly editLanguageCode = signal('en');
  protected readonly editSubject = signal('');
  protected readonly editBody = signal('');
  protected readonly editPushTitle = signal('');
  protected readonly editDeepLink = signal('');
  protected readonly editValidationError = signal<string | null>(null);

  protected loadTemplates(): void {
    this.store.loadTemplates();
  }

  protected submitGetOrCreate(): void {
    const eventType = this.newEventType().trim();
    if (!eventType) return;
    this.store
      .getOrCreateTemplate({ EventType: eventType, Channel: this.newChannel() })
      .subscribe(() => this.newEventType.set(''));
  }

  protected editTranslationFor(template: NotificationTemplateDto): void {
    this.editTemplateId.set(template.id);
    this.editValidationError.set(null);
    const existing = template.translations.find((t) => t.languageCode === this.editLanguageCode());
    this.editSubject.set(existing?.subject ?? '');
    this.editBody.set(existing?.body ?? '');
    this.editPushTitle.set(existing?.pushTitle ?? '');
    this.editDeepLink.set(existing?.deepLink ?? '');
  }

  protected currentEditChannel(): NotificationChannel | string {
    return this.store.templates().find((t) => t.id === this.editTemplateId())?.channel ?? 'Email';
  }

  protected submitTranslation(): void {
    const id = this.editTemplateId().trim();
    const languageCode = this.editLanguageCode().trim();
    const body = this.editBody();
    if (!id || !languageCode || !body) return;

    const channel = this.currentEditChannel();
    const validationError = validateNotificationTranslation(channel, {
      Subject: this.editSubject().trim() || undefined,
      Body: body,
      PushTitle: this.editPushTitle().trim() || undefined,
    });
    if (validationError) {
      this.editValidationError.set(validationError);
      return;
    }
    this.editValidationError.set(null);

    this.store
      .updateTranslation(id, {
        LanguageCode: languageCode,
        Subject: this.editSubject().trim() || null,
        Body: body,
        PushTitle: this.editPushTitle().trim() || null,
        DeepLink: this.editDeepLink().trim() || null,
      })
      .subscribe();
  }
}
