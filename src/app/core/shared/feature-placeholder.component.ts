import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { UmsEmptyStateComponent } from '@ums/design-system';

/**
 * Shared placeholder leaf for a not-yet-built feature route (ADMIN-6 app shell/routing). Reused
 * across every module section not yet in this build pass's scope (ADMIN-18 onward: Academic,
 * Finance, HR, Hostel, Library, Content, Documents, Reporting-beyond-Dashboard, Audit, System
 * Configuration) so the route tree/guard/nav structure can land now and each module's own
 * ticket later swaps only its own leaf's `loadComponent`, not the tree around it -- mirrors
 * `ums-student-web`'s identical pattern.
 *
 * NOTE (flagged gap): unlike `ums-admission-web`/`ums-student-web`, this app does not yet wire
 * ADR-0011's runtime Bengali/English `TranslatePipe`/`TranslationService` machinery -- that is a
 * cross-cutting i18n build spanning every future ADMIN-18..35 screen, not one of ADMIN-1..17's
 * own tickets, so it is out of this pass's scope and flagged here rather than faked with a
 * one-off translation stub. All UI text in this build pass is plain English.
 */
@Component({
  selector: 'app-feature-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsEmptyStateComponent],
  template: `<ums-empty-state
    title="Coming soon"
    [description]="label() + ' has not been built yet in this pass.'"
  />`,
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly label = toSignal(
    this.route.data.pipe(map((data) => (data['label'] as string | undefined) ?? 'This section')),
    { initialValue: 'This section' },
  );
}
