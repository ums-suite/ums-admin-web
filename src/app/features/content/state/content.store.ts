import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Content module boundary (ADR-0002). Fleshed
 * out when ADMIN-30 lands; out of this build pass's ADMIN-1..17 scope.
 */
export const ContentStore = signalStore({ providedIn: 'root' }, withLoadState());
