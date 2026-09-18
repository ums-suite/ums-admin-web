import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { ContentApi } from '../content.api';
import type {
  AddNoticeTranslationRequest,
  CreateNoticeRequest,
  NoticeDto,
  NoticeFeedQuery,
  SetNoticeScheduleRequest,
  TransitionNoticeRequest,
  UpdateNoticeRequest,
} from '../content.types';

interface ContentNoticesState {
  readonly feed: readonly NoticeDto[];
  readonly currentNotice: NoticeDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: ContentNoticesState = {
  feed: [],
  currentNotice: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-30: Notice feed/create/edit + translation (a real `NoticeTranslation` table keyed by
 * `LanguageCode` -- the parent's own `title`/`body` are always canonical English) + schedule/
 * publish/archive. Every mutating call requires the current `Version` -- callers are expected to
 * handle a 409 via the shared `VersionConflictBannerComponent`, not this store (the store simply
 * surfaces the raw error through the returned Observable so the component can branch on it).
 */
export const ContentNoticesStore = signalStore(
  { providedIn: 'root' },
  withState<ContentNoticesState>(initialState),
  withMethods((store, api = inject(ContentApi)) => ({
    loadFeed(query: NoticeFeedQuery): void {
      patchState(store, { isLoading: true, error: null });
      api.getNoticeFeed(query).subscribe({
        next: (feed) => patchState(store, { feed, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadNotice(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getNotice(id).subscribe({
        next: (currentNotice) => patchState(store, { currentNotice, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createNotice: (request: CreateNoticeRequest) =>
      api
        .createNotice(request)
        .pipe(tap((n) => patchState(store, { feed: [n, ...store.feed()], currentNotice: n }))),
    updateNotice: (id: string, request: UpdateNoticeRequest) =>
      api.updateNotice(id, request).pipe(tap((n) => patchState(store, { currentNotice: n }))),
    addTranslation: (id: string, request: AddNoticeTranslationRequest) =>
      api.addNoticeTranslation(id, request),
    setSchedule: (id: string, request: SetNoticeScheduleRequest) =>
      api.setNoticeSchedule(id, request).pipe(tap((n) => patchState(store, { currentNotice: n }))),
    scheduleNotice: (id: string, request: TransitionNoticeRequest) =>
      api.scheduleNotice(id, request).pipe(tap((n) => patchState(store, { currentNotice: n }))),
    publishNotice: (id: string, request: TransitionNoticeRequest) =>
      api.publishNotice(id, request).pipe(tap((n) => patchState(store, { currentNotice: n }))),
    archiveNotice: (id: string, request: TransitionNoticeRequest) =>
      api.archiveNotice(id, request).pipe(tap((n) => patchState(store, { currentNotice: n }))),
  })),
);
