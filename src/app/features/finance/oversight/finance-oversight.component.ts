import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { FinanceOversightStore } from '../state/finance-oversight.store';

/**
 * ADMIN-24: Invoice/Payment oversight + Refund processing against a previously successful Payment
 * (requirement-spec.md §3.8) -- the money-moving heart of Finance, reusing confirmation-with-reason
 * + audit-linked success per requirement-spec.md §5.
 *
 * **Invoice/Payment lookup is expected to 403 for a record this staff member does not own** --
 * `ums-core`'s `GET /invoices/{id}`/`GET /payments/{id}` are ownership-gated with no staff-
 * permission bypass (confirmed real gap, see `finance.types.ts`'s own doc, the same shape as
 * Admission's own confirmed `GET /applications/{id}` gap). This is rendered as an explicit,
 * explained state, never a generic error -- mirroring `applicant-review.component.ts`'s identical
 * precedent. **Refund is the one action here confirmed to work regardless of ownership** --
 * `FinancePermissions.PaymentRefund`'s own doc: "not ownership-scoped ... this is an operator
 * action" -- so a Refund can be submitted by Payment id even when this screen's own lookup above it
 * is blocked.
 */
@Component({
  selector: 'app-finance-oversight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsBadgeComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './finance-oversight.component.html',
  styleUrl: './finance-oversight.component.scss',
})
export class FinanceOversightComponent {
  protected readonly store = inject(FinanceOversightStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly lookupInvoiceId = signal('');
  protected readonly lookupPaymentId = signal('');

  protected readonly refundPaymentId = signal('');
  protected readonly refundAmount = signal('');

  protected loadInvoice(): void {
    const id = this.lookupInvoiceId().trim();
    if (id) this.store.loadInvoice(id);
  }

  protected loadPayment(): void {
    const id = this.lookupPaymentId().trim();
    if (id) this.store.loadPayment(id);
  }

  protected submitRefund(): void {
    const paymentId = this.refundPaymentId().trim();
    const amount = Number(this.refundAmount());
    if (!paymentId || !Number.isFinite(amount) || amount <= 0) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Refund payment',
        description: `A refund of ${amount} will be processed against payment ${paymentId}. This is a money-moving, elevated-permission action.`,
        reasonLabel: 'Reason for refund',
        perform: (reason) =>
          this.store
            .refundPayment(paymentId, { amount, reason: reason || null })
            .pipe(
              switchMap((refund) =>
                confirmLatestAuditEntry(this.auditApi, 'Refund', refund.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: refund, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `Refund ${outcome.result.status.toLowerCase()} (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not process refund: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome) {
          this.refundAmount.set('');
        }
      });
  }
}
