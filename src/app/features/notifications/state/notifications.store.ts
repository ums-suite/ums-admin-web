import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { NotificationsApi } from '../notifications.api';
import type {
  CreateNotificationTemplateRequest,
  NotificationTemplateDto,
  UpdateNotificationTemplateRequest,
} from '../notifications.types';

interface NotificationsState {
  readonly templates: readonly NotificationTemplateDto[];
  readonly totalCount: number;
  readonly skip: number;
  readonly take: number;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: NotificationsState = {
  templates: [],
  totalCount: 0,
  skip: 0,
  take: 50,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-35 (fleshing out ADMIN-3's scaffold): Notification template list/create (idempotent
 * get-or-create by `(EventType, Channel)`)/upsert-one-language-translation -- see
 * `notifications.types.ts`'s own doc for the confirmed real shape and validation rules.
 */
export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationsState>(initialState),
  withMethods((store, api = inject(NotificationsApi)) => ({
    loadTemplates(skip = 0, take = 50): void {
      patchState(store, { isLoading: true, error: null });
      api.listTemplates(skip, take).subscribe({
        next: (page) =>
          patchState(store, {
            templates: page.items,
            totalCount: page.totalCount,
            skip: page.skip,
            take: page.take,
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    getOrCreateTemplate: (request: CreateNotificationTemplateRequest) =>
      api.createTemplate(request).pipe(
        tap((template) => {
          const exists = store.templates().some((t) => t.id === template.id);
          patchState(store, {
            templates: exists
              ? store.templates().map((t) => (t.id === template.id ? template : t))
              : [template, ...store.templates()],
          });
        }),
      ),
    updateTranslation: (id: string, request: UpdateNotificationTemplateRequest) =>
      api.updateTemplate(id, request).pipe(
        tap((template) =>
          patchState(store, {
            templates: store.templates().map((t) => (t.id === id ? template : t)),
          }),
        ),
      ),
  })),
);
