import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Hostel module boundary (ADR-0002). Fleshed
 * out when ADMIN-27/ADMIN-28 land; out of this build pass's ADMIN-1..17 scope.
 */
export const HostelStore = signalStore({ providedIn: 'root' }, withLoadState());
