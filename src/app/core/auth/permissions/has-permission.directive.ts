import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermissionsService } from './permissions.service';

/**
 * ADMIN-5: the template-level half of design-decisions.md's RBAC-Scoped-Rendering pattern --
 * requirement-spec.md §8 invariant #1's literal wording: "if the caller lacks a permission, the
 * control is absent, not disabled-with-no-explanation." A structural directive (the same shape as
 * `*ngIf`) so a gated control is genuinely removed from the DOM, never merely `[disabled]`.
 *
 * ```html
 * <ums-button *appHasPermission="'identity.user.manage'" (click)="deactivate()">Deactivate</ums-button>
 * <ums-button *appHasPermission="['identity.role.manage', 'identity.role.assign']; mode: 'any'">
 *   Manage roles
 * </ums-button>
 * ```
 *
 * Reactive against {@link PermissionsService}'s current session signal -- if a mid-session
 * {@link PermissionsService.revalidate} call (ADMIN-5, triggered by a route change or a
 * sensitive-action boundary) narrows the granted set, any control gated by this directive
 * disappears on the very next change-detection run, with no reload required
 * (requirement-spec.md §9's "permissions change mid-session" edge case).
 *
 * This is a UX courtesy, never the trust boundary (ADR-0006) -- the corresponding mutation is
 * always independently re-checked server-side regardless of what this directive currently shows.
 */
@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  private readonly permissions = inject(PermissionsService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private hasView = false;

  readonly appHasPermission = input.required<string | readonly string[]>();
  /** Only meaningful when {@link appHasPermission} is an array -- 'any' (default) or 'all'. */
  readonly appHasPermissionMode = input<'any' | 'all'>('any');

  constructor() {
    effect(() => {
      const granted = this.isGranted();
      if (granted && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!granted && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  private isGranted(): boolean {
    const required = this.appHasPermission();
    if (!Array.isArray(required)) {
      return this.permissions.hasPermission(required as string);
    }
    return this.appHasPermissionMode() === 'all'
      ? this.permissions.hasAllPermissions(required)
      : this.permissions.hasAnyPermission(required);
  }
}
