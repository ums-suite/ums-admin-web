import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { toUmsApiError, type UmsApiError } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService, type ConfirmationRequest } from './confirmation.service';
import type { AuditedMutationOutcome } from './audited-action.types';

export interface ConfirmAndRunOptions<TResult> extends ConfirmationRequest {
  /** Runs after the caller supplies a reason. Must resolve only once the audit write is confirmed. */
  readonly perform: (reason: string) => Observable<AuditedMutationOutcome<TResult>>;
  /** Success-toast text -- MUST reference the resulting audit entry (requirement-spec.md §8 invariant #5). */
  readonly successMessage: (outcome: AuditedMutationOutcome<TResult>) => string;
  readonly errorMessage?: (error: UmsApiError) => string;
}

/**
 * ADMIN-8: composes {@link ConfirmationService} (ask for a reason) with the
 * "mutation-and-audit-confirmed success" rule design-decisions.md's "Confirmation-with-Reason +
 * Audit-Linked Success Pattern" mandates. This is the single entry point every destructive/
 * money-moving/status-changing screen across all 15 modules should call -- never show a raw
 * confirm() + a fire-and-forget success toast by hand.
 *
 * The success toast is only ever shown from inside {@link ConfirmAndRunOptions.perform}'s own
 * resolved value -- i.e. AFTER whatever that callback did to confirm the audit write actually
 * completed. This service never fabricates a success state from the mutation call alone.
 */
@Injectable({ providedIn: 'root' })
export class AuditedActionService {
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(UmsToastService);

  /**
   * Opens the shared confirmation-with-reason dialog; if confirmed, runs `perform(reason)`. On
   * success, shows a toast naming the audit entry (per `successMessage`); on failure, shows an
   * error toast and never a success one. Resolves `null` if the caller cancelled.
   */
  confirmAndRun<TResult>(
    options: ConfirmAndRunOptions<TResult>,
  ): Observable<AuditedMutationOutcome<TResult> | null> {
    const { perform, successMessage, errorMessage, ...request } = options;

    return this.confirmation.requestReason(request).pipe(
      switchMap((reason) => {
        if (reason === null) {
          return of(null);
        }
        return perform(reason).pipe(
          tap((outcome) => {
            this.toast.show(successMessage(outcome), { variant: 'success' });
          }),
          catchError((error: unknown) => {
            const apiError = toUmsApiError(error);
            this.toast.show(errorMessage?.(apiError) ?? apiError.message, { variant: 'danger' });
            return of(null);
          }),
          map((outcome) => outcome),
        );
      }),
    );
  }
}
