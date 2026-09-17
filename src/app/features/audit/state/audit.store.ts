import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Audit module boundary (ADR-0002). Fleshed out
 * when ADMIN-34 lands (the Audit Log explorer, design-decisions.md's "Audit-Log
 * Read-Consistency/Freshness-Snapshot Pattern"); out of this build pass's ADMIN-1..17 scope,
 * though the reusable freshness-label component ADMIN-9's Dashboard builds is explicitly meant
 * to be reused there.
 */
export const AuditStore = signalStore({ providedIn: 'root' }, withLoadState());
