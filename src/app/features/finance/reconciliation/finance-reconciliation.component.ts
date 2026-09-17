import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UmsEmptyStateComponent } from '@ums/design-system';

/**
 * ADMIN-25: Fee Reconciliation dashboard -- daily gateway-settlement-vs-ledger comparison with
 * drill-down to individual discrepancies (requirement-spec.md §3.8, §7 key screen).
 *
 * **Confirmed: ums-core has NO read/query endpoint for this at all.** Reconciliation detection is
 * real and does run server-side (`ReconciliationService.RunAsync`, a daily worker job comparing
 * `Successful`-but-unreconciled Payments against `IPaymentGateway.GetSettlementReportAsync` -- an
 * in-process abstraction, not a real external settlement file/API), and mismatches are persisted to
 * a genuinely write-only `ReconciliationException` table (DB-`REVOKE`'d from UPDATE/DELETE, exactly
 * like `LedgerEntry`). But there is no `GET` endpoint, no repository list method, and not even a
 * `ReconciliationEntry`/settlement-report HTTP shape anywhere in `UMS.Modules.Finance.Api` --
 * confirmed by reading every endpoint file in that project directly, not assumed.
 *
 * Building a dashboard against invented data here would violate this app's own established
 * discipline (student.types.ts, admission.types.ts, academic.types.ts, finance.types.ts all
 * document real, confirmed gaps rather than paper over them) -- so this screen is honestly a
 * placeholder: routed, permission-gated (`finance.reconciliation.review`, a real declared
 * permission string with, per its own manifest doc, "no endpoint gates on it yet"), and explicit
 * about exactly what is missing, so a future ums-core ticket adding the read surface has a known,
 * already-wired frontend slot to fill rather than a screen to build from scratch.
 */
@Component({
  selector: 'app-finance-reconciliation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsEmptyStateComponent],
  templateUrl: './finance-reconciliation.component.html',
  styleUrl: './finance-reconciliation.component.scss',
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- purely template-driven "not yet available" screen, no state or logic to hold.
export class FinanceReconciliationComponent {}
