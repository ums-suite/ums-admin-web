import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UmsButtonComponent, UmsEmptyStateComponent } from '@ums/design-system';

/**
 * ADMIN-5/ADMIN-6: where {@link import('../../core/auth/permissions/permission.guard').permissionGuard}
 * sends a caller who lacks the required permission for a route -- requirement-spec.md §8
 * invariant #1's "absent, not disabled-with-no-explanation" applied at the route level: rather
 * than a raw 403 or a route that silently fails to render, this names what happened.
 */
@Component({
  selector: 'app-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsEmptyStateComponent, UmsButtonComponent, RouterLink],
  template: `
    <ums-empty-state
      title="You don't have access to this"
      description="Your account doesn't have the permission required for this screen. If you believe this is wrong, contact a Super Admin."
    >
      <a routerLink="/dashboard"><ums-button variant="secondary">Back to Dashboard</ums-button></a>
    </ums-empty-state>
  `,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- pure template component, no members needed
export class ForbiddenPageComponent {}
