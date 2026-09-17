import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * ADMIN-9: the "as of [timestamp]" freshness-trust-signal component (requirement-spec.md §7:
 * "each tile stating its 'as of' freshness"; §9's dashboard/result-day-traffic-spike edge case:
 * "tiles show their last-refreshed timestamp rather than implying real-time accuracy the backend
 * can't guarantee"). Deliberately built here as a small, generic, reusable primitive -- NOT
 * Dashboard-specific -- because design-decisions.md's "Audit-Log Read-Consistency/
 * Freshness-Snapshot Pattern" explicitly reuses this exact "trust signal vocabulary" for the
 * Audit Log explorer (ADMIN-34): "reusing the Dashboard's already-established freshness-timestamp
 * pattern rather than introducing a second, different staleness idiom."
 *
 * Accepts `null`/an unparseable value as "never computed yet" -- ums-core's real
 * `DashboardResponse.DataAsOf` is genuinely `null` when `Status == NeverComputed` (confirmed
 * against Reporting's actual `DashboardEndpoints.cs`/DTO source), a real, distinct state from a
 * transient fetch failure, not a value to paper over with today's date.
 */
@Component({
  selector: 'app-freshness-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="app-freshness-label">{{ displayText() }}</span>`,
  styles: [
    `
      .app-freshness-label {
        font-size: var(--type-label-font-size, 0.75rem);
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class FreshnessLabelComponent {
  readonly asOf = input<Date | string | null>(null);
  readonly neverComputedMessage = input<string>('Not yet computed');
  readonly prefix = input<string>('As of');

  protected readonly displayText = computed(() => {
    const value = this.asOf();
    if (value === null) {
      return this.neverComputedMessage();
    }
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      return this.neverComputedMessage();
    }
    return `${this.prefix()} ${date.toLocaleString()}`;
  });
}
