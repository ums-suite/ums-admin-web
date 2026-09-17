import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UmsBadgeComponent, UmsButtonComponent } from '@ums/design-system';

/**
 * ADMIN-8 / cross-cutting: the ONE shared implementation of design-decisions.md's
 * "Optimistic-Concurrency Conflict UX Pattern" -- reject-and-reload with a version-conflict
 * banner on an HTTP 409, used as the default across every one of the 15 modules' edit screens
 * (Student edit in ADMIN-15, and every later module's edit forms). Built now, per this app's
 * process requirements, even though ADMIN-1..17's own screens may not all wire it yet.
 *
 * Deliberately dumb/presentational: a caller catches its own 409 (`UmsApiError.status === 409`),
 * decides which fields changed (if it knows -- `changedFields` is optional), and renders this
 * banner instead of applying the write. The two highest-stakes forms (FeeStructure configuration,
 * grade-correction) are the sanctioned escalation to field-level merge UI instead of this banner
 * (design-decisions.md's own two-tier note) -- not built here, out of this app's ticket scope.
 */
@Component({
  selector: 'app-version-conflict-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsBadgeComponent, UmsButtonComponent],
  templateUrl: './version-conflict-banner.component.html',
  styleUrl: './version-conflict-banner.component.scss',
  host: { class: 'app-version-conflict-banner', role: 'alert' },
})
export class VersionConflictBannerComponent {
  readonly message = input<string>(
    'This record was changed by someone else since you loaded it. Review the latest version before trying again.',
  );
  /** Field names known to have changed underneath the caller, if the 409 response identified any. */
  readonly changedFields = input<readonly string[]>([]);
  readonly reloadLabel = input<string>('Reload latest version');

  /** The caller re-fetches the record and discards the in-progress edit -- never a silent merge. */
  readonly reload = output();

  protected onReload(): void {
    this.reload.emit();
  }
}
