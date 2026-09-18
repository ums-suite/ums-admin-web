import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { ContentApi } from '../content.api';
import type {
  BannerDto,
  CreateBannerRequest,
  SetBannerScheduleRequest,
  TransitionBannerRequest,
  UpdateBannerRequest,
} from '../content.types';

interface ContentBannersState {
  readonly banners: readonly BannerDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: ContentBannersState = {
  banners: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-30: Banner create/edit + schedule/publish/archive. **No translations at all** -- Banner
 * is explicitly not localized, unlike Notice/Event; this store never carries a language field.
 */
export const ContentBannersStore = signalStore(
  { providedIn: 'root' },
  withState<ContentBannersState>(initialState),
  withMethods((store, api = inject(ContentApi)) => ({
    loadBanners(): void {
      patchState(store, { isLoading: true, error: null });
      api.listBanners().subscribe({
        next: (banners) => patchState(store, { banners, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createBanner: (request: CreateBannerRequest) =>
      api
        .createBanner(request)
        .pipe(tap((b) => patchState(store, { banners: [b, ...store.banners()] }))),
    updateBanner: (id: string, request: UpdateBannerRequest) =>
      api
        .updateBanner(id, request)
        .pipe(
          tap((b) =>
            patchState(store, { banners: store.banners().map((x) => (x.id === id ? b : x)) }),
          ),
        ),
    setSchedule: (id: string, request: SetBannerScheduleRequest) =>
      api
        .setBannerSchedule(id, request)
        .pipe(
          tap((b) =>
            patchState(store, { banners: store.banners().map((x) => (x.id === id ? b : x)) }),
          ),
        ),
    scheduleBanner: (id: string, request: TransitionBannerRequest) =>
      api
        .scheduleBanner(id, request)
        .pipe(
          tap((b) =>
            patchState(store, { banners: store.banners().map((x) => (x.id === id ? b : x)) }),
          ),
        ),
    publishBanner: (id: string, request: TransitionBannerRequest) =>
      api
        .publishBanner(id, request)
        .pipe(
          tap((b) =>
            patchState(store, { banners: store.banners().map((x) => (x.id === id ? b : x)) }),
          ),
        ),
    archiveBanner: (id: string, request: TransitionBannerRequest) =>
      api
        .archiveBanner(id, request)
        .pipe(
          tap((b) =>
            patchState(store, { banners: store.banners().map((x) => (x.id === id ? b : x)) }),
          ),
        ),
  })),
);
