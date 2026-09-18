/**
 * ADMIN-35: hand-typed DTOs against `ums-core`'s real Notifications module template-management
 * surface (`UMS.Modules.Notifications`) -- `@ums/shared` has no generated Notifications client
 * (same confirmed gap as every other non-Identity/Audit/Organization module). This is the one
 * genuinely NEW, fully-real piece of ADMIN-35's System Configuration scope -- unlike the Academic
 * Session (thin, create+get-by-id only), Fee-Structure "template" (a client-side-only convenience,
 * no backend concept), and Permission-bundle preset (a hardcoded client-side list) sub-areas, this
 * one has a real, full backend surface to build against.
 *
 * `NotificationTemplate` is a real translation-table model, same shape as Content's own
 * `NoticeTranslation`/`TemplateTranslation`: `POST /templates` is an idempotent get-or-create by
 * the natural key `(EventType, Channel)` -- never a duplicate-creating call -- and
 * `PUT /templates/{id}` upserts exactly ONE language's translation, bumping `Version` every call.
 * Validation is baked into the domain and mirrored here client-side: Email requires `Subject`;
 * Push requires `PushTitle`; SMS/WhatsApp `Body` is capped at 480 chars.
 */
export type NotificationChannel = 'Email' | 'Sms' | 'WhatsApp' | 'Push' | 'InApp';

export const SMS_WHATSAPP_BODY_MAX_LENGTH = 480;

export interface NotificationTemplateTranslationDto {
  readonly languageCode: string;
  readonly subject: string | null;
  readonly body: string;
  readonly pushTitle: string | null;
  readonly deepLink: string | null;
}

export interface NotificationTemplateDto {
  readonly id: string;
  readonly eventType: string;
  readonly channel: NotificationChannel | string;
  readonly version: number;
  readonly translations: readonly NotificationTemplateTranslationDto[];
}

export interface NotificationTemplatePage {
  readonly items: readonly NotificationTemplateDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
}

/** Idempotent get-or-create by the natural key `(EventType, Channel)`. */
export interface CreateNotificationTemplateRequest {
  readonly EventType: string;
  readonly Channel: NotificationChannel | string;
}

/** Upserts exactly one language's translation on an existing template. */
export interface UpdateNotificationTemplateRequest {
  readonly LanguageCode: string;
  readonly Subject?: string | null;
  readonly Body: string;
  readonly PushTitle?: string | null;
  readonly DeepLink?: string | null;
}

/**
 * Mirrors the real server-side domain validation client-side (see class doc) -- returns the
 * first violated rule's message, or `null` if the translation is valid for `channel`.
 */
export function validateNotificationTranslation(
  channel: NotificationChannel | string,
  translation: Pick<UpdateNotificationTemplateRequest, 'Subject' | 'Body' | 'PushTitle'>,
): string | null {
  if (channel === 'Email' && !translation.Subject?.trim()) {
    return 'Email templates require a Subject.';
  }
  if (channel === 'Push' && !translation.PushTitle?.trim()) {
    return 'Push templates require a PushTitle.';
  }
  if (
    (channel === 'Sms' || channel === 'WhatsApp') &&
    translation.Body.length > SMS_WHATSAPP_BODY_MAX_LENGTH
  ) {
    return `SMS/WhatsApp bodies are capped at ${SMS_WHATSAPP_BODY_MAX_LENGTH} characters.`;
  }
  return null;
}
