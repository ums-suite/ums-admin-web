import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { ContentApi } from '../content.api';
import type {
  AddEventTranslationRequest,
  CreateEventRequest,
  EventDto,
  EventQuery,
  UpdateEventRequest,
} from '../content.types';

interface ContentEventsState {
  readonly events: readonly EventDto[];
  readonly currentEvent: EventDto | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: ContentEventsState = {
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,
};

/**
 * ADMIN-30: Event calendar create/edit + translation. **No schedule/publish/archive/delete step
 * exists** -- an Event's own `startAt`/`endAt` window IS its visibility window, so create can carry
 * an OPTIONAL inline translation instead of Notice's two-step Draft-then-translate flow.
 */
export const ContentEventsStore = signalStore(
  { providedIn: 'root' },
  withState<ContentEventsState>(initialState),
  withMethods((store, api = inject(ContentApi)) => ({
    loadEvents(query: EventQuery): void {
      patchState(store, { isLoading: true, error: null });
      api.listEvents(query).subscribe({
        next: (events) => patchState(store, { events, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    loadEvent(id: string): void {
      patchState(store, { isLoading: true, error: null });
      api.getEvent(id).subscribe({
        next: (currentEvent) => patchState(store, { currentEvent, isLoading: false }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createEvent: (request: CreateEventRequest) =>
      api
        .createEvent(request)
        .pipe(tap((e) => patchState(store, { events: [e, ...store.events()], currentEvent: e }))),
    updateEvent: (id: string, request: UpdateEventRequest) =>
      api.updateEvent(id, request).pipe(tap((e) => patchState(store, { currentEvent: e }))),
    addTranslation: (id: string, request: AddEventTranslationRequest) =>
      api.addEventTranslation(id, request).pipe(tap((e) => patchState(store, { currentEvent: e }))),
  })),
);
