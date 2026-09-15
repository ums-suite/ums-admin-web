import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  exhaustMap,
  fromEvent,
  merge,
  takeUntil,
  timer,
} from 'rxjs';
import { toUmsApiError, type UmsApiError } from '@ums/shared';
import { APP_CONFIG } from '../../core/config/app-config';
import { isTerminalJobStatus, type JobSnapshot } from './job.types';

export interface JobTrackerHandle<TResult> {
  readonly snapshot: Signal<JobSnapshot<TResult> | null>;
  readonly lastError: Signal<UmsApiError | null>;
  readonly isTerminal: Signal<boolean>;
  /** Stops polling immediately (e.g. the tracking component was destroyed before completion). */
  readonly stop: () => void;
}

export interface JobTrackerOptions {
  /** Defaults to `APP_CONFIG.jobPollIntervalMs` (design-decisions.md: "fixed-interval polling (3-5s)"). */
  readonly intervalMs?: number;
}

/**
 * ADMIN-7: the one shared implementation of design-decisions.md's "Bulk-Job Progress Mechanism"
 * decision -- fixed-interval polling (3-5s) plus an out-of-cycle fetch on tab-visibility regain,
 * reused identically by bulk student import (ADMIN-16), bulk document generation, and large
 * report exports rather than each screen hand-rolling its own `setInterval`.
 *
 * Two triggers merge into one poll stream:
 * 1. `timer(0, intervalMs)` -- an immediate first fetch, then one every `intervalMs`.
 * 2. `document:visibilitychange` firing while the tab is visible again -- closes
 *    edge-cases.md's "backgrounded, throttled tab" staleness gap: a browser can throttle/pause
 *    `setInterval` timers in a hidden tab, so the fixed interval alone could leave a long-stale
 *    snapshot on screen until the tab happens to fire its next (delayed) timer tick.
 *
 * `exhaustMap` (not `switchMap`/`mergeMap`) deliberately ignores a new trigger while a fetch is
 * still in flight -- a slow status endpoint should never pile up overlapping requests.
 *
 * Completion/failure is rendered ONLY from the fetched {@link JobSnapshot.status} -- see
 * {@link isTerminalJobStatus}'s own doc. Reaching a terminal status stops polling automatically.
 */
@Injectable({ providedIn: 'root' })
export class JobPollerService {
  private readonly appConfig = inject(APP_CONFIG);

  track<TResult>(
    fetchStatus: () => Observable<JobSnapshot<TResult>>,
    options: JobTrackerOptions = {},
  ): JobTrackerHandle<TResult> {
    const intervalMs = options.intervalMs ?? this.appConfig.jobPollIntervalMs;
    const destroy$ = new Subject<void>();

    const snapshot = signal<JobSnapshot<TResult> | null>(null);
    const lastError = signal<UmsApiError | null>(null);

    const stop = (): void => {
      destroy$.next();
      destroy$.complete();
    };

    const fixedInterval$ = timer(0, intervalMs);
    const visibilityRegain$ = fromEvent(document, 'visibilitychange').pipe(filterTabVisible());

    merge(fixedInterval$, visibilityRegain$)
      .pipe(
        takeUntil(destroy$),
        exhaustMap(() =>
          fetchStatus().pipe(
            catchError((error: unknown) => {
              lastError.set(toUmsApiError(error));
              return EMPTY;
            }),
          ),
        ),
        takeUntil(destroy$),
      )
      .subscribe((next) => {
        snapshot.set(next);
        lastError.set(null);
        if (isTerminalJobStatus(next.status)) {
          stop();
        }
      });

    return {
      snapshot: snapshot.asReadonly(),
      lastError: lastError.asReadonly(),
      isTerminal: computed(() => {
        const current = snapshot();
        return current !== null && isTerminalJobStatus(current.status);
      }),
      stop,
    };
  }
}

/** `visibilitychange` events, filtered down to the moments the tab actually became visible again. */
function filterTabVisible(): (source: Observable<Event>) => Observable<Event> {
  return (source) =>
    new Observable<Event>((subscriber) => {
      const sub = source.subscribe({
        next: (event) => {
          if (document.visibilityState === 'visible') {
            subscriber.next(event);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
}
