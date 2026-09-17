import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { DashboardApiService } from '../dashboard.api';
import type { DashboardDomain, DashboardResponse } from '../dashboard.types';

export type DashboardLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface DashboardSlot {
  readonly status: DashboardLoadStatus;
  readonly response: DashboardResponse | null;
  readonly errorMessage: string | null;
}

const EMPTY_SLOT: DashboardSlot = { status: 'idle', response: null, errorMessage: null };

interface ReportingState {
  readonly dashboards: Partial<Record<DashboardDomain, DashboardSlot>>;
}

/**
 * ADMIN-9 (this build pass's real implementation of the "reporting" feature-scoped store ADMIN-3
 * scaffolded a placeholder for): loads one `DashboardMetric` read model per domain on demand and
 * keeps its own point-in-time snapshot -- no auto-refresh, matching design-decisions.md's
 * Audit-Log/Dashboard "freshness-snapshot, manual refresh" trust-signal vocabulary (§9's
 * result-day-traffic-spike edge case: tiles show a last-refreshed timestamp, never implied
 * real-time accuracy).
 */
export const ReportingStore = signalStore(
  { providedIn: 'root' },
  withState<ReportingState>({ dashboards: {} }),
  withMethods((store, api = inject(DashboardApiService)) => ({
    dashboard(domain: DashboardDomain): DashboardSlot {
      return store.dashboards()[domain] ?? EMPTY_SLOT;
    },
    loadDashboard(domain: DashboardDomain): void {
      const current = store.dashboards()[domain] ?? EMPTY_SLOT;
      patchState(store, (state) => ({
        dashboards: {
          ...state.dashboards,
          [domain]: { status: 'loading', response: current.response, errorMessage: null },
        },
      }));

      api.getDashboard(domain).subscribe({
        next: (response) =>
          patchState(store, (state) => ({
            dashboards: {
              ...state.dashboards,
              [domain]: { status: 'loaded', response, errorMessage: null },
            },
          })),
        error: (error: unknown) =>
          patchState(store, (state) => ({
            dashboards: {
              ...state.dashboards,
              [domain]: {
                status: 'error',
                response: current.response,
                errorMessage: toUmsApiError(error).message,
              },
            },
          })),
      });
    },
  })),
);
