import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UmsConfirmationDialogComponent } from '@ums/design-system';
import { ConfirmationService } from './confirmation.service';

/**
 * ADMIN-8: the single, app-root-mounted renderer for {@link ConfirmationService}'s request queue
 * -- mirrors `@ums/design-system`'s own `<ums-toast-container>` pattern (one instance in `App`'s
 * template, `app.html`). Feature code never embeds its own `<ums-confirmation-dialog>`; it calls
 * `ConfirmationService.requestReason(...)` and this host is what actually renders it.
 */
@Component({
  selector: 'app-confirmation-dialog-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsConfirmationDialogComponent],
  templateUrl: './confirmation-dialog-host.component.html',
})
export class ConfirmationDialogHostComponent {
  protected readonly confirmation = inject(ConfirmationService);

  protected onConfirmed(reason: string): void {
    this.confirmation.confirm(reason);
  }

  protected onCancelled(): void {
    this.confirmation.cancel();
  }
}
