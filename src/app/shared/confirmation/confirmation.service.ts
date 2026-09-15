import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * ADMIN-8: the input configuration for one confirmation-with-reason request
 * (design-decisions.md "Confirmation-with-Reason + Audit-Linked Success Pattern"). Mirrors
 * `@ums/design-system`'s `UmsConfirmationDialogComponent` input surface almost one-for-one --
 * this service exists to let feature code *request* a confirmation from anywhere (a service, a
 * component, an effect) without every caller needing to embed its own `<ums-confirmation-dialog>`
 * and wire its own open/confirmed/cancelled plumbing by hand.
 */
export interface ConfirmationRequest {
  readonly title: string;
  readonly description?: string;
  readonly reasonLabel?: string;
  readonly reasonPlaceholder?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

/**
 * The single shared "ask for a reason, then tell me what they typed (or that they cancelled)"
 * primitive (ADMIN-8, `shared/confirmation/`), reused by every destructive/money-moving/
 * status-changing action across all 15 modules (design-decisions.md: "identity management,
 * applicant review, student status changes, bulk import, exam/merit workflows, grade correction,
 * result publication, and finance/refund actions").
 *
 * One request active at a time (`current`), rendered by the single
 * {@link ConfirmationDialogHostComponent} mounted once at the app root (`App`'s template) --
 * exactly the same "one shared queue + one root-mounted renderer" shape as
 * `@ums/design-system`'s own `UmsToastService`/`UmsToastContainerComponent` pair, so a caller
 * anywhere in the app can call {@link requestReason} without knowing or caring where the dialog
 * physically renders.
 *
 * This service only asks the question; it never itself performs the mutation, calls the API, or
 * shows a success toast -- see {@link AuditedActionService} for the layer that composes this with
 * the actual "run the mutation, confirm the audit write, then report success" sequence
 * requirement-spec.md §5/§8 invariant #5 mandates.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly _current = signal<ConfirmationRequest | null>(null);
  readonly current = this._current.asReadonly();

  private resolve: ((reason: string | null) => void) | null = null;

  /**
   * Opens the confirmation dialog with `request`. The returned Observable emits exactly once:
   * the trimmed, non-empty reason text if confirmed, or `null` if cancelled -- then completes.
   * Only one request can be pending at a time; a second call while one is already open replaces
   * it (the first caller's Observable never emits and never completes, matching the dialog's own
   * "one modal at a time" UX -- callers should not fire overlapping confirmation requests).
   */
  requestReason(request: ConfirmationRequest): Observable<string | null> {
    return new Observable<string | null>((subscriber) => {
      this._current.set(request);
      this.resolve = (reason) => {
        subscriber.next(reason);
        subscriber.complete();
      };
    });
  }

  /** Called by {@link ConfirmationDialogHostComponent} when the dialog's Confirm is activated. */
  confirm(reason: string): void {
    const resolve = this.resolve;
    this._current.set(null);
    this.resolve = null;
    resolve?.(reason);
  }

  /** Called by {@link ConfirmationDialogHostComponent} when the dialog is cancelled/dismissed. */
  cancel(): void {
    const resolve = this.resolve;
    this._current.set(null);
    this.resolve = null;
    resolve?.(null);
  }
}
