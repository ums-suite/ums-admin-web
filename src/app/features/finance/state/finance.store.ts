import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Finance module boundary (ADR-0002). Fleshed
 * out when ADMIN-24/ADMIN-25 land; out of this build pass's ADMIN-1..17 scope.
 */
export const FinanceStore = signalStore({ providedIn: 'root' }, withLoadState());
