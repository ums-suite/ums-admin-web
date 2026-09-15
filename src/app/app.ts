import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UmsToastContainerComponent } from '@ums/design-system';
import { SessionExpiryService } from './core/auth/session-expiry.service';
import { ConfirmationDialogHostComponent } from './shared/confirmation/confirmation-dialog-host.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, UmsToastContainerComponent, ConfirmationDialogHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Injected purely so its constructor runs at bootstrap and its sessionExpired$ subscription
  // (ADMIN-4, requirement-spec.md §8 invariant #6 "log out everywhere ... next action") is live
  // for the whole app session.
  private readonly sessionExpiry = inject(SessionExpiryService);
}
