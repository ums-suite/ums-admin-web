import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import { toUmsApiError } from '@ums/shared';
import { AuthService } from '../../core/auth/auth.service';
import { AUTH_ROUTES, RETURN_URL_QUERY_PARAM } from '../../core/auth/auth-routes.constants';
import {
  isLoginFormValid,
  validateLoginForm,
  type LoginFormErrors,
  type LoginFormValues,
} from './login-form.validation';

/**
 * ADMIN-4/ADMIN-6: staff login. No self-registration screen -- this app never provisions its own
 * accounts (requirement-spec.md §3.2: user accounts are created by an admin, ADMIN-10), so the
 * only entry point here is signing in with credentials already provisioned by Identity.
 *
 * MFA is enforced at login for any role Identity flags as privileged (requirement-spec.md §5,
 * ADR-0005) server-side; `ums-core`'s real `POST /identity/auth/mfa/verify` step is a SEPARATE
 * confirmed endpoint this pass does not yet wire (flagged gap -- a privileged staff member's
 * login today only completes this basic identifier/password step; the MFA challenge/verify round
 * trip is a follow-up once a concrete `LoginRequiresMfa`-shaped response is confirmed against a
 * live backend).
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverErrorMessage = signal<string | null>(null);

  protected get formValues(): LoginFormValues {
    return { identifier: this.identifier(), password: this.password() };
  }

  protected get errors(): LoginFormErrors {
    return this.submitted() ? validateLoginForm(this.formValues) : {};
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    this.serverErrorMessage.set(null);

    const errors = validateLoginForm(this.formValues);
    if (!isLoginFormValid(errors)) {
      return;
    }

    this.submitting.set(true);
    this.authService.login(this.identifier().trim(), this.password()).subscribe({
      next: () => {
        this.submitting.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get(RETURN_URL_QUERY_PARAM);
        void this.router.navigateByUrl(returnUrl || AUTH_ROUTES.authenticatedHome);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.serverErrorMessage.set(toUmsApiError(error).message || 'Unable to sign in.');
      },
    });
  }
}
