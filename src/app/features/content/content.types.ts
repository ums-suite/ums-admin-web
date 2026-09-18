/**
 * ADMIN-30: hand-typed DTOs against `ums-core`'s real Content module (`UMS.Modules.Content`) --
 * `@ums/shared` has no generated Content client (same confirmed gap as every other non-Identity/
 * Audit/Organization module). Request body shapes given explicitly in tickets.md (including their
 * PascalCase casing) are followed exactly; every other field is this app's own best-effort guess,
 * flagged inline, not independently read off a C# response record.
 *
 * **Confirmed real, structurally important facts, not invented**:
 * - `NoticeTranslation` is a REAL translation table keyed by `LanguageCode`, NOT flat
 *   `TitleEn`/`TitleBn` columns -- the parent Notice's own `title`/`body` are always canonical
 *   English.
 * - Every Notice/Event mutating call requires the current `Version` (uint, xmin optimistic
 *   concurrency) in the body -- wired through the shared `VersionConflictBannerComponent` on 409.
 * - Event has NO schedule/publish/archive/delete step at all -- its own `startAt`/`endAt` window
 *   IS its visibility window, so Event's create can carry an OPTIONAL inline translation instead
 *   of the two-step Draft-then-translate flow Notice uses.
 * - Banner has NO translations at all -- explicitly not localized; this app does not build a
 *   bilingual UI for it.
 */

export type NoticeAudience = 'Public' | 'Student' | 'Faculty' | 'Admin';
/** ASSUMED -- inferred from the real schedule/publish/archive transitions, not an enumerated literal. */
export type NoticeStatus = 'Draft' | 'Scheduled' | 'Published' | 'Archived';
export type BannerStatus = 'Draft' | 'Scheduled' | 'Published' | 'Archived';

// ---- Notice ----

export interface NoticeDto {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly audience: readonly (NoticeAudience | string)[];
  readonly organizationNodeId: string | null;
  readonly isUrgent: boolean;
  readonly status: NoticeStatus | string;
  readonly publishAt: string | null;
  readonly expireAt: string | null;
  readonly version: number;
  readonly createdAt: string;
}

export interface CreateNoticeRequest {
  readonly Title: string;
  readonly Body: string;
  readonly Audience: readonly (NoticeAudience | string)[];
  readonly OrganizationNodeId?: string | null;
  readonly IsUrgent: boolean;
}

export interface UpdateNoticeRequest {
  readonly Title: string;
  readonly Body: string;
  readonly Audience: readonly (NoticeAudience | string)[];
  readonly OrganizationNodeId?: string | null;
  readonly IsUrgent: boolean;
  readonly Version: number;
}

export interface AddNoticeTranslationRequest {
  readonly LanguageCode: string;
  readonly Title: string;
  readonly Body: string;
  readonly Version: number;
}

/** ASSUMED response shape for a NoticeTranslation row. */
export interface NoticeTranslationDto {
  readonly languageCode: string;
  readonly title: string;
  readonly body: string;
}

export interface SetNoticeScheduleRequest {
  readonly PublishAt?: string | null;
  readonly ExpireAt?: string | null;
  readonly Version: number;
}

/** Draft -> Scheduled transition. */
export interface TransitionNoticeRequest {
  readonly Version: number;
}

export interface NoticeFeedQuery {
  readonly audience?: string;
  readonly skip?: number;
  readonly take?: number;
}

// ---- Event -- no schedule/publish/archive/delete step, see class doc ----

/** ASSUMED base fields (Title/Body/Audience/OrganizationNodeId) beyond the confirmed StartAt/EndAt + optional inline translation. */
export interface CreateEventRequest {
  readonly Title: string;
  readonly Body: string;
  readonly StartAt: string;
  readonly EndAt: string;
  readonly Audience: readonly (NoticeAudience | string)[];
  readonly OrganizationNodeId?: string | null;
  readonly TranslationLanguageCode?: string;
  readonly TranslationTitle?: string;
  readonly TranslationBody?: string;
  readonly TranslationLocationLabel?: string;
}

export interface UpdateEventRequest {
  readonly Title: string;
  readonly Body: string;
  readonly StartAt: string;
  readonly EndAt: string;
  readonly Audience: readonly (NoticeAudience | string)[];
  readonly OrganizationNodeId?: string | null;
  readonly Version: number;
}

export interface AddEventTranslationRequest {
  readonly LanguageCode: string;
  readonly Title: string;
  readonly Body: string;
  readonly LocationLabel?: string | null;
  readonly Version: number;
}

export interface EventDto {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly audience: readonly (NoticeAudience | string)[];
  readonly organizationNodeId: string | null;
  readonly version: number;
}

export interface EventQuery {
  readonly from?: string;
  readonly to?: string;
  readonly audience?: string;
  readonly organizationNodeId?: string;
  readonly skip?: number;
  readonly take?: number;
}

// ---- Banner -- no translations at all, see class doc ----

export interface BannerDto {
  readonly id: string;
  readonly headline: string;
  readonly imageUrl: string;
  readonly linkUrl: string | null;
  readonly sortOrder: number;
  readonly status: BannerStatus | string;
  readonly version: number;
}

export interface CreateBannerRequest {
  readonly Headline: string;
  readonly ImageUrl: string;
  readonly LinkUrl?: string | null;
  readonly SortOrder: number;
}

export interface UpdateBannerRequest {
  readonly Headline: string;
  readonly ImageUrl: string;
  readonly LinkUrl?: string | null;
  readonly SortOrder: number;
  readonly Version: number;
}

export interface SetBannerScheduleRequest {
  readonly PublishAt?: string | null;
  readonly ExpireAt?: string | null;
  readonly Version: number;
}

export interface TransitionBannerRequest {
  readonly Version: number;
}
