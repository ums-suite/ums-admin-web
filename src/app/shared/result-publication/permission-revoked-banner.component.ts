import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UmsButtonComponent } from '@ums/design-system';

/**
 * ADMIN-20/ADMIN-23: the ONE shared rendering of edge-cases.md's "A Super Admin Revokes a Staff
 * Member's Role Mid-Way Through a Multi-Step Action" resolution -- "any 403 anywhere in the flow
 * ... renders an explicit 'your permission for this action was revoked' terminal state, never a
 * generic error toast." Reused by both Admission's (ADMIN-20) and Academic's (ADMIN-23) Result
 * Publication controls, since design-decisions.md explicitly mirrors the two.
 *
 * Deliberately offers no "retry" affordance -- `ResultPublicationWizard.status()` reaching
 * `'revoked'` is, by design, a genuinely terminal state (see that class's own doc): the caller's
 * permission set has changed and the only correct next step is to leave the flow entirely and let
 * a fresh visit re-evaluate authorization from scratch, never to resume the same wizard instance.
 */
@Component({
  selector: 'app-permission-revoked-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent],
  templateUrl: './permission-revoked-banner.component.html',
  styleUrl: './permission-revoked-banner.component.scss',
  host: { class: 'app-permission-revoked-banner', role: 'alert' },
})
export class PermissionRevokedBannerComponent {
  readonly actionLabel = input<string>('this action');
  readonly leaveLabel = input<string>('Leave this flow');

  /** The caller navigates away -- this wizard instance is discarded, never resumed. */
  readonly leave = output();

  protected onLeave(): void {
    this.leave.emit();
  }
}
